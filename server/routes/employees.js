import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, enforceDataScope, logAudit } from '../middleware/auth.js';
import { breakdownSalary, calculateAttritionRisk, detectAbsenceAnomalies, getLeaveBalance } from '../services/rulesService.js';

const router = express.Router();

/**
 * GET /api/employees
 * List with server-side search, filtering, and pagination
 */
router.get('/', authenticateToken, (req, res) => {
  const { search, department_id, status, page = 1, limit = 20 } = req.query;

  // Employee role can only see themselves
  if (req.user.role === 'employee') {
    const me = db.get('employees', req.user.employee_id);
    if (!me) return res.json({ employees: [], total: 0 });
    const dept = db.get('departments', me.department_id);
    const desig = db.get('designations', me.designation_id);
    return res.json({
      employees: [{ ...me, department_name: dept?.name, designation_title: desig?.title }],
      total: 1,
      page: 1,
      pages: 1
    });
  }

  let list = db.getAll('employees');

  // Filter by department
  if (department_id) {
    list = list.filter(e => e.department_id === department_id);
  }

  // Filter by status
  if (status) {
    list = list.filter(e => e.status === status);
  }

  // Search by name, email, employee_code
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.employee_code?.toLowerCase().includes(q)
    );
  }

  const total = list.length;
  const p = Math.max(1, parseInt(page, 10));
  const l = Math.max(1, parseInt(limit, 10));
  const startIndex = (p - 1) * l;
  const paginated = list.slice(startIndex, startIndex + l);

  // Attach department and designation names
  const enriched = paginated.map(emp => {
    const dept = db.get('departments', emp.department_id);
    const desig = db.get('designations', emp.designation_id);
    return {
      ...emp,
      department_name: dept?.name || 'Unassigned',
      designation_title: desig?.title || 'Staff'
    };
  });

  res.json({
    employees: enriched,
    total,
    page: p,
    limit: l,
    pages: Math.ceil(total / l)
  });
});

/**
 * GET /api/employees/:id - Employee 360 profile
 */
router.get('/:id', authenticateToken, enforceDataScope, (req, res) => {
  const emp = db.get('employees', req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const dept = db.get('departments', emp.department_id);
  const desig = db.get('designations', emp.designation_id);
  const user = db.get('users', u => u.employee_id === emp.id);

  // Leave balances
  const leaveTypes = db.getAll('leave_types');
  const balances = leaveTypes.map(lt => ({
    leave_type: lt,
    ...getLeaveBalance(emp.id, lt.id)
  }));

  // Recent attendance
  const attendances = db.getAll('attendance', { employee_id: emp.id })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15);

  // Recent payslips
  let payslips = db.getAll('payslips', { employee_id: emp.id })
    .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));

  // If role is employee, they cannot see other employee's salary/payslips (enforced by enforceDataScope)
  // Analytics
  const attritionScore = calculateAttritionRisk(emp);
  const absenceAnomalies = detectAbsenceAnomalies(emp.id);

  res.json({
    ...emp,
    department_name: dept?.name || 'Unassigned',
    designation_title: desig?.title || 'Staff',
    user_account: user ? { id: user.id, email: user.email, is_active: user.is_active } : null,
    leave_balances: balances,
    recent_attendance: attendances,
    recent_payslips: payslips,
    attrition_score: attritionScore,
    absence_anomalies: absenceAnomalies
  });
});

/**
 * POST /api/employees - HR registers employee
 */
router.post('/', authenticateToken, requireRoles('hr', 'admin'), async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone = '',
      address = '',
      department_id,
      designation_id,
      hire_date,
      status = 'active',
      gender = 'other',
      gross_salary = 60000
    } = req.body;

    if (!first_name || !last_name || !email || !department_id || !hire_date) {
      return res.status(400).json({ error: 'First name, last name, email, department, and hire date are required' });
    }

    // Check duplicate email in users or employees
    const existingEmp = db.get('employees', e => e.email?.toLowerCase() === email.toLowerCase());
    const existingUser = db.get('users', u => u.email?.toLowerCase() === email.toLowerCase());
    if (existingEmp || existingUser) {
      return res.status(400).json({ error: 'An employee or user with this email already exists' });
    }

    // Generate unique employee code: EMP-001, EMP-002...
    const count = db.getAll('employees').length + 1;
    const employee_code = `EMP-${String(count).padStart(3, '0')}`;

    // Salary breakdown
    const salary = breakdownSalary(gross_salary);

    const newEmp = db.insert('employees', {
      employee_code,
      first_name,
      last_name,
      email: email.toLowerCase(),
      phone,
      address,
      department_id,
      designation_id,
      hire_date,
      status,
      gender,
      gross_salary: salary.gross,
      basic_salary: salary.basic,
      hra: salary.hra,
      medical_allowance: salary.medical,
      other_allowances: salary.other,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(first_name + '_' + last_name)}`
    });

    // Auto-create login with temporary password
    const tempPassword = `Temp#${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newUser = db.insert('users', {
      name: `${first_name} ${last_name}`,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role: 'employee',
      employee_id: newEmp.id,
      must_change_password: true,
      is_active: true
    });

    logAudit(req, {
      action: 'CREATE',
      entity: 'Employee',
      entity_id: newEmp.id,
      after_state: { employee_code, email, gross_salary: salary.gross }
    });

    res.status(201).json({
      message: 'Employee registered successfully',
      employee: newEmp,
      login_credentials: {
        email: newUser.email,
        temporary_password: tempPassword,
        must_change_password: true
      }
    });
  } catch (err) {
    console.error('Register employee error:', err);
    res.status(500).json({ error: 'Failed to register employee' });
  }
});

/**
 * PUT /api/employees/:id
 * HR/Admin updates full details; Employee can only update own phone and address
 */
router.put('/:id', authenticateToken, (req, res) => {
  const emp = db.get('employees', req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  // Employee self-service check
  if (req.user.role === 'employee') {
    if (emp.id !== req.user.employee_id) {
      return res.status(403).json({ error: 'Forbidden: Cannot edit another employee\'s record' });
    }
    const { phone, address } = req.body;
    const updated = db.update('employees', emp.id, {
      phone: phone !== undefined ? phone : emp.phone,
      address: address !== undefined ? address : emp.address
    });

    logAudit(req, {
      action: 'UPDATE_PROFILE',
      entity: 'Employee',
      entity_id: emp.id,
      after_state: { phone, address }
    });

    return res.json({ message: 'Profile updated successfully', employee: updated });
  }

  // HR / Admin updates
  const {
    first_name,
    last_name,
    phone,
    address,
    department_id,
    designation_id,
    hire_date,
    exit_date,
    status,
    gender,
    gross_salary
  } = req.body;

  const updates = {};
  if (first_name !== undefined) updates.first_name = first_name;
  if (last_name !== undefined) updates.last_name = last_name;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;
  if (department_id !== undefined) updates.department_id = department_id;
  if (designation_id !== undefined) updates.designation_id = designation_id;
  if (hire_date !== undefined) updates.hire_date = hire_date;
  if (exit_date !== undefined) updates.exit_date = exit_date;
  if (status !== undefined) updates.status = status;
  if (gender !== undefined) updates.gender = gender;

  if (gross_salary !== undefined) {
    const salary = breakdownSalary(gross_salary);
    updates.gross_salary = salary.gross;
    updates.basic_salary = salary.basic;
    updates.hra = salary.hra;
    updates.medical_allowance = salary.medical;
    updates.other_allowances = salary.other;
  }

  const updated = db.update('employees', emp.id, updates);

  logAudit(req, {
    action: 'UPDATE',
    entity: 'Employee',
    entity_id: emp.id,
    before_state: emp,
    after_state: updated
  });

  res.json({ message: 'Employee updated successfully', employee: updated });
});

/**
 * POST /api/employees/csv-dry-run
 * Validates CSV data rows and returns errors per row and field
 */
router.post('/csv-dry-run', authenticateToken, requireRoles('hr', 'admin'), (req, res) => {
  const { rows } = req.body;
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'Please provide CSV rows to inspect' });
  }

  const existingEmails = new Set(db.getAll('employees').map(e => e.email?.toLowerCase()));
  const existingCodes = new Set(db.getAll('employees').map(e => e.employee_code?.toLowerCase()));
  const departments = db.getAll('departments');
  const deptMap = new Map();
  departments.forEach(d => {
    deptMap.set(d.name.toLowerCase(), d.id);
    deptMap.set(d.code.toLowerCase(), d.id);
  });

  const errors = [];
  const preview = [];
  const seenEmailsInFile = new Set();
  const seenCodesInFile = new Set();

  rows.forEach((row, index) => {
    const rowNum = index + 1;
    const rowErrors = [];

    // Check required fields
    if (!row.first_name?.trim()) {
      rowErrors.push({ row: rowNum, field: 'first_name', reason: 'First name is required' });
    }
    if (!row.last_name?.trim()) {
      rowErrors.push({ row: rowNum, field: 'last_name', reason: 'Last name is required' });
    }
    if (!row.email?.trim()) {
      rowErrors.push({ row: rowNum, field: 'email', reason: 'Email is required' });
    } else {
      const email = row.email.trim().toLowerCase();
      // Valid email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        rowErrors.push({ row: rowNum, field: 'email', reason: 'Invalid email format' });
      } else if (existingEmails.has(email) || seenEmailsInFile.has(email)) {
        rowErrors.push({ row: rowNum, field: 'email', reason: 'Email already exists' });
      }
      seenEmailsInFile.add(email);
    }

    // Code check if provided
    if (row.employee_code) {
      const code = row.employee_code.trim().toLowerCase();
      if (existingCodes.has(code) || seenCodesInFile.has(code)) {
        rowErrors.push({ row: rowNum, field: 'employee_code', reason: 'Employee code already exists' });
      }
      seenCodesInFile.add(code);
    }

    // Known dept
    if (!row.department?.trim()) {
      rowErrors.push({ row: rowNum, field: 'department', reason: 'Department is required' });
    } else {
      const deptName = row.department.trim().toLowerCase();
      if (!deptMap.has(deptName)) {
        rowErrors.push({
          row: rowNum,
          field: 'department',
          reason: `Unknown department '${row.department}'. Known departments: ${departments.map(d => d.name).join(', ')}`
        });
      }
    }

    // ISO Date
    if (!row.hire_date?.trim()) {
      rowErrors.push({ row: rowNum, field: 'hire_date', reason: 'Hire date is required' });
    } else {
      const d = new Date(row.hire_date.trim());
      if (isNaN(d.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(row.hire_date.trim())) {
        rowErrors.push({ row: rowNum, field: 'hire_date', reason: 'Hire date must be in ISO format (YYYY-MM-DD)' });
      }
    }

    // Salary > 0
    const salary = Number(row.gross_salary);
    if (isNaN(salary) || salary <= 0) {
      rowErrors.push({ row: rowNum, field: 'gross_salary', reason: 'Gross salary must be a positive number' });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    }

    preview.push({
      row: rowNum,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      department: row.department,
      gross_salary: salary || 0,
      hire_date: row.hire_date,
      valid: rowErrors.length === 0
    });
  });

  res.json({
    valid: errors.length === 0,
    totalRows: rows.length,
    validRows: preview.filter(p => p.valid).length,
    errorCount: errors.length,
    errors,
    preview: preview.slice(0, 10)
  });
});

/**
 * POST /api/employees/csv-import
 * Performs the actual CSV import after dry run passes
 */
router.post('/csv-import', authenticateToken, requireRoles('hr', 'admin'), async (req, res) => {
  const { rows } = req.body;
  if (!rows || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'Valid rows array required' });
  }

  const departments = db.getAll('departments');
  const deptMap = new Map();
  departments.forEach(d => {
    deptMap.set(d.name.toLowerCase(), d.id);
    deptMap.set(d.code.toLowerCase(), d.id);
  });

  const created = [];
  for (const row of rows) {
    const deptId = deptMap.get(row.department?.trim().toLowerCase()) || departments[0]?.id;
    const salary = breakdownSalary(Number(row.gross_salary) || 50000);
    const count = db.getAll('employees').length + 1;
    const employee_code = row.employee_code || `EMP-${String(count).padStart(3, '0')}`;

    const newEmp = db.insert('employees', {
      employee_code,
      first_name: row.first_name.trim(),
      last_name: row.last_name.trim(),
      email: row.email.trim().toLowerCase(),
      phone: row.phone || '',
      address: row.address || '',
      department_id: deptId,
      designation_id: null,
      hire_date: row.hire_date || new Date().toISOString().split('T')[0],
      status: 'active',
      gender: row.gender || 'other',
      gross_salary: salary.gross,
      basic_salary: salary.basic,
      hra: salary.hra,
      medical_allowance: salary.medical,
      other_allowances: salary.other,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.first_name)}`
    });

    const tempPassword = `Temp#${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    db.insert('users', {
      name: `${row.first_name} ${row.last_name}`,
      email: row.email.trim().toLowerCase(),
      password_hash: passwordHash,
      role: 'employee',
      employee_id: newEmp.id,
      must_change_password: true,
      is_active: true
    });

    created.push({ id: newEmp.id, code: employee_code, email: newEmp.email, tempPassword });
  }

  logAudit(req, {
    action: 'CSV_IMPORT',
    entity: 'Employee',
    entity_id: 'batch',
    after_state: { imported_count: created.length }
  });

  res.status(201).json({
    message: `Successfully imported ${created.length} employees`,
    created
  });
});

/**
 * GET /api/employees/export/csv
 * CSV export of employees
 */
router.get('/export/csv', authenticateToken, requireRoles('hr', 'admin'), (req, res) => {
  const employees = db.getAll('employees');
  const depts = new Map(db.getAll('departments').map(d => [d.id, d.name]));
  const desigs = new Map(db.getAll('designations').map(d => [d.id, d.title]));

  const headers = ['Code', 'First Name', 'Last Name', 'Email', 'Phone', 'Department', 'Designation', 'Hire Date', 'Status', 'Gross Salary', 'Basic Salary'];
  const rows = employees.map(e => [
    e.employee_code,
    `"${e.first_name}"`,
    `"${e.last_name}"`,
    e.email,
    `"${e.phone || ''}"`,
    `"${depts.get(e.department_id) || ''}"`,
    `"${desigs.get(e.designation_id) || ''}"`,
    e.hire_date,
    e.status,
    e.gross_salary,
    e.basic_salary
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');
  res.send(csv);
});

export default router;
