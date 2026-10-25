import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, enforceDataScope, logAudit } from '../middleware/auth.js';
import { getWorkingDaysInMonth, calculateWorkingDays, calculateAnnualTax, breakdownSalary } from '../services/rulesService.js';

const router = express.Router();

/**
 * GET /api/payroll/runs
 * List all payroll runs
 */
router.get('/runs', authenticateToken, requireRoles('admin', 'hr'), (req, res) => {
  const runs = db.getAll('payroll_runs').sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));
  res.json(runs);
});

/**
 * GET /api/payroll/runs/:id
 * Get single payroll run with all employee payslips
 */
router.get('/runs/:id', authenticateToken, requireRoles('admin', 'hr'), (req, res) => {
  const run = db.get('payroll_runs', req.params.id);
  if (!run) return res.status(404).json({ error: 'Payroll run not found' });

  const payslips = db.getAll('payslips', { payroll_run_id: run.id });
  const employees = new Map(db.getAll('employees').map(e => [e.id, e]));
  const depts = new Map(db.getAll('departments').map(d => [d.id, d.name]));

  const enrichedPayslips = payslips.map(ps => {
    const emp = employees.get(ps.employee_id);
    return {
      ...ps,
      employee_code: emp?.employee_code || '',
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
      department_name: emp ? depts.get(emp.department_id) || 'Unassigned' : ''
    };
  });

  res.json({ run, payslips: enrichedPayslips });
});

/**
 * POST /api/payroll/generate-draft
 * HR creates/recalculates a monthly payroll draft
 */
router.post('/generate-draft', authenticateToken, requireRoles('hr', 'admin'), (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month (1-12) and Year are required' });
    }

    const m = Number(month);
    const y = Number(year);

    // Check if finalized run already exists -> Locked!
    const existingRun = db.get('payroll_runs', { month: m, year: y });
    if (existingRun && existingRun.status === 'finalized') {
      return res.status(400).json({ error: `Payroll for ${m}/${y} is finalized and locked. It cannot be recalculated.` });
    }

    const workingDaysInMonth = getWorkingDaysInMonth(y, m);
    const employees = db.getAll('employees', { status: 'active' });

    let runId = existingRun ? existingRun.id : `run_${y}_${m}_${Date.now()}`;
    const payslips = [];

    let totalGross = 0;
    let totalDeductions = 0;
    let totalTax = 0;
    let totalNet = 0;

    // Month boundary strings
    const monthStartStr = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDayNum = new Date(y, m, 0).getDate();
    const monthEndStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

    for (const emp of employees) {
      const gross = emp.gross_salary || 50000;
      const salaryParts = breakdownSalary(gross);

      // Check joiner / leaver proration
      let activeWorkingDays = workingDaysInMonth;
      if (emp.hire_date && emp.hire_date > monthStartStr) {
        activeWorkingDays = calculateWorkingDays(emp.hire_date, monthEndStr);
      }
      if (emp.exit_date && emp.exit_date < monthEndStr) {
        activeWorkingDays = Math.min(activeWorkingDays, calculateWorkingDays(monthStartStr, emp.exit_date));
      }

      const perDayRate = workingDaysInMonth > 0 ? +(gross / workingDaysInMonth).toFixed(2) : 0;

      // Attendance records for this month
      const attendances = db.getAll('attendance', a =>
        a.employee_id === emp.id && a.date >= monthStartStr && a.date <= monthEndStr
      );

      const lateDays = attendances.filter(a => a.status === 'late').length;
      const halfDays = attendances.filter(a => a.status === 'half_day').length;
      const absentDays = attendances.filter(a => a.status === 'absent').length;
      const presentDays = attendances.filter(a => a.status === 'present').length;

      // Unpaid leaves
      const unpaidLeaves = db.getAll('leave_requests', r => {
        if (r.employee_id !== emp.id || r.status !== 'approved') return false;
        const lt = db.get('leave_types', r.leave_type_id);
        return lt && lt.code === 'unpaid' && r.start_date <= monthEndStr && r.end_date >= monthStartStr;
      });
      const unpaidLeaveDays = unpaidLeaves.reduce((sum, l) => sum + (l.working_days || 0), 0);

      // Late penalty rule (Bonus): 3 lates = 0.5 day deduction
      const latePenaltyDays = Math.floor(lateDays / 3) * 0.5;

      // Proration deduction if joined mid-month
      const nonActiveDays = Math.max(0, workingDaysInMonth - activeWorkingDays);
      const prorationDeduction = nonActiveDays * perDayRate;

      // Total deduction calculation
      const attendanceDeduction = Math.round(
        (absentDays * perDayRate) +
        (unpaidLeaveDays * perDayRate) +
        (halfDays * 0.5 * perDayRate) +
        (latePenaltyDays * perDayRate) +
        prorationDeduction
      );

      // Tax calculation: Gross * 12 annual tax / 12
      const annualGross = gross * 12;
      const annualTax = calculateAnnualTax(annualGross);
      const monthlyTax = Math.round(annualTax / 12);

      const netSalary = Math.max(0, gross - attendanceDeduction - monthlyTax);

      totalGross += gross;
      totalDeductions += attendanceDeduction;
      totalTax += monthlyTax;
      totalNet += netSalary;

      payslips.push({
        payroll_run_id: runId,
        employee_id: emp.id,
        month: m,
        year: y,
        working_days_in_month: workingDaysInMonth,
        active_working_days: activeWorkingDays,
        present_days: presentDays,
        late_days: lateDays,
        half_days: halfDays,
        absent_days: absentDays,
        unpaid_leave_days: unpaidLeaveDays,
        late_penalty_days: latePenaltyDays,
        per_day_rate: perDayRate,
        gross_salary: gross,
        basic_salary: salaryParts.basic,
        hra: salaryParts.hra,
        medical_allowance: salaryParts.medical,
        other_allowances: salaryParts.other,
        attendance_deduction: attendanceDeduction,
        tax_deduction: monthlyTax,
        net_salary: netSalary,
        status: 'draft',
        generated_at: new Date().toISOString()
      });
    }

    // Save or update payroll run
    let runRecord;
    if (existingRun) {
      runRecord = db.update('payroll_runs', existingRun.id, {
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_tax: totalTax,
        total_net: totalNet,
        employee_count: employees.length,
        status: 'draft'
      });
      // Delete existing draft payslips
      const oldPayslips = db.getAll('payslips', { payroll_run_id: existingRun.id });
      oldPayslips.forEach(p => db.delete('payslips', p.id));
    } else {
      runRecord = db.insert('payroll_runs', {
        id: runId,
        month: m,
        year: y,
        status: 'draft',
        finalized_by: null,
        finalized_at: null,
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_tax: totalTax,
        total_net: totalNet,
        employee_count: employees.length,
        created_by: req.user.id
      });
    }

    // Save payslips
    for (const ps of payslips) {
      db.insert('payslips', ps);
    }

    logAudit(req, {
      action: 'GENERATE_PAYROLL_DRAFT',
      entity: 'Payroll',
      entity_id: runRecord.id,
      after_state: { month: m, year: y, totalGross, totalNet }
    });

    res.status(201).json({
      message: `Payroll draft generated for ${m}/${y}`,
      run: runRecord,
      payslipsCount: payslips.length
    });
  } catch (err) {
    console.error('Payroll generation error:', err);
    res.status(500).json({ error: 'Failed to generate payroll draft' });
  }
});

/**
 * POST /api/payroll/runs/:id/finalize
 * ONLY ADMIN CAN FINALIZE PAYROLL (Locks the month)
 */
router.post('/runs/:id/finalize', authenticateToken, requireRoles('admin'), (req, res) => {
  const run = db.get('payroll_runs', req.params.id);
  if (!run) return res.status(404).json({ error: 'Payroll run not found' });

  if (run.status === 'finalized') {
    return res.status(400).json({ error: 'This payroll run is already finalized and locked' });
  }

  const updatedRun = db.update('payroll_runs', run.id, {
    status: 'finalized',
    finalized_by: req.user.id,
    finalized_at: new Date().toISOString()
  });

  // Update payslips status to finalized
  const payslips = db.getAll('payslips', { payroll_run_id: run.id });
  for (const ps of payslips) {
    db.update('payslips', ps.id, { status: 'finalized' });

    // Notify each employee about new payslip
    const user = db.get('users', u => u.employee_id === ps.employee_id);
    if (user) {
      db.insert('notifications', {
        user_id: user.id,
        title: 'Payslip Available',
        message: `Your payslip for ${run.month}/${run.year} has been finalized. Net Pay: Rs. ${ps.net_salary.toLocaleString()}`,
        type: 'payroll',
        is_read: false
      });
    }
  }

  logAudit(req, {
    action: 'FINALIZE_PAYROLL',
    entity: 'Payroll',
    entity_id: run.id,
    after_state: { finalized_at: updatedRun.finalized_at, month: run.month, year: run.year }
  });

  res.json({
    message: `Payroll for ${run.month}/${run.year} finalized and locked successfully`,
    run: updatedRun
  });
});

/**
 * GET /api/payroll/payslips
 * Employee reads own payslips; HR and Admin can view all
 */
router.get('/payslips', authenticateToken, (req, res) => {
  let payslips = db.getAll('payslips');

  if (req.user.role === 'employee') {
    payslips = payslips.filter(p => p.employee_id === req.user.employee_id && p.status === 'finalized');
  } else if (req.query.employee_id) {
    payslips = payslips.filter(p => p.employee_id === req.query.employee_id);
  }

  const employees = new Map(db.getAll('employees').map(e => [e.id, e]));
  const depts = new Map(db.getAll('departments').map(d => [d.id, d.name]));

  const enriched = payslips
    .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
    .map(ps => {
      const emp = employees.get(ps.employee_id);
      return {
        ...ps,
        employee_code: emp?.employee_code || '',
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
        department_name: emp ? depts.get(emp.department_id) || 'Unassigned' : ''
      };
    });

  res.json(enriched);
});

/**
 * GET /api/payroll/payslips/:id
 * Get single payslip for viewing / PDF download
 */
router.get('/payslips/:id', authenticateToken, (req, res) => {
  const payslip = db.get('payslips', req.params.id);
  if (!payslip) return res.status(404).json({ error: 'Payslip not found' });

  // Employee scope guard
  if (req.user.role === 'employee' && payslip.employee_id !== req.user.employee_id) {
    return res.status(403).json({ error: 'Forbidden: Cannot view another employee\'s payslip' });
  }

  const emp = db.get('employees', payslip.employee_id);
  const dept = emp ? db.get('departments', emp.department_id) : null;
  const desig = emp ? db.get('designations', emp.designation_id) : null;
  const settings = db.getSettings() || { company_name: 'Saylani HCM' };

  res.json({
    payslip,
    employee: emp ? {
      name: `${emp.first_name} ${emp.last_name}`,
      code: emp.employee_code,
      email: emp.email,
      department: dept?.name || 'Unassigned',
      designation: desig?.title || 'Staff'
    } : null,
    company: settings
  });
});

export default router;
