import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { breakdownSalary } from './rulesService.js';

export async function seedDemoData() {
  db.reset();

  // 1. Company Settings
  db.setSettings({
    company_name: 'Saylani Tech Solutions',
    office_start: '09:00',
    grace_minutes: 15,
    half_day_hours: 5,
    weekend_days: ['Saturday', 'Sunday'],
    office_lat: 24.8607,
    office_lng: 67.0011,
    office_radius_meters: 150,
    late_penalty_enabled: true,
    late_penalty_rule: '3 lates = 0.5 day deduction'
  });

  // 2. Default Leave Types
  const ltAnnual = db.insert('leave_types', { name: 'Annual Leave', code: 'annual', yearly_quota: 14, paid: true, description: 'Statutory annual paid leave' });
  const ltSick = db.insert('leave_types', { name: 'Sick Leave', code: 'sick', yearly_quota: 8, paid: true, description: 'Medical and sick leave' });
  const ltCasual = db.insert('leave_types', { name: 'Casual Leave', code: 'casual', yearly_quota: 10, paid: true, description: 'Short notice personal/casual leave' });
  const ltUnpaid = db.insert('leave_types', { name: 'Unpaid Leave', code: 'unpaid', yearly_quota: null, paid: false, description: 'Leave without pay' });

  // 3. Public Holidays
  db.insert('public_holidays', { name: 'Independence Day', date: '2026-08-14' });
  db.insert('public_holidays', { name: 'Defence Day', date: '2026-09-06' });
  db.insert('public_holidays', { name: 'Quaid-e-Azam Day', date: '2026-12-25' });

  // 4. Departments
  const deptEngineering = db.insert('departments', { name: 'Engineering', code: 'ENG', description: 'Software Development & Architecture' });
  const deptHR = db.insert('departments', { name: 'Human Resources', code: 'HR', description: 'Talent Acquisition & Employee Ops' });
  const deptDesign = db.insert('departments', { name: 'Design & UX', code: 'DES', description: 'UI/UX & Product Design' });

  // 5. Designations
  const desigLeadEng = db.insert('designations', { title: 'Lead Software Engineer', department_id: deptEngineering.id, level: 'Senior' });
  const desigJuniorEng = db.insert('designations', { title: 'Frontend Developer', department_id: deptEngineering.id, level: 'Junior' });
  const desigHRManager = db.insert('designations', { title: 'HR Manager', department_id: deptHR.id, level: 'Lead' });
  const desigUIUX = db.insert('designations', { title: 'Product Designer', department_id: deptDesign.id, level: 'Mid' });

  // Passwords
  const commonHash = await bcrypt.hash('Password@123', 10);

  // 6. Users: Admin and HR
  const adminUser = db.insert('users', {
    name: 'Admin User',
    email: 'admin@saylani.org',
    password_hash: commonHash,
    role: 'admin',
    employee_id: null,
    must_change_password: false,
    is_active: true
  });

  const hrUser = db.insert('users', {
    name: 'Sarah HR Manager',
    email: 'hr@saylani.org',
    password_hash: commonHash,
    role: 'hr',
    employee_id: null,
    must_change_password: false,
    is_active: true
  });

  // 7. Employees
  const emp1Salary = breakdownSalary(150000);
  const emp1 = db.insert('employees', {
    employee_code: 'EMP-001',
    first_name: 'Muhammad',
    last_name: 'Ali',
    email: 'ali@saylani.org',
    phone: '+92 300 1234567',
    address: 'Gulshan-e-Iqbal, Karachi',
    department_id: deptEngineering.id,
    designation_id: desigLeadEng.id,
    hire_date: '2024-01-15',
    status: 'active',
    gender: 'male',
    gross_salary: emp1Salary.gross,
    basic_salary: emp1Salary.basic,
    hra: emp1Salary.hra,
    medical_allowance: emp1Salary.medical,
    other_allowances: emp1Salary.other,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali'
  });

  const emp2Salary = breakdownSalary(85000);
  const emp2 = db.insert('employees', {
    employee_code: 'EMP-002',
    first_name: 'Fatima',
    last_name: 'Noor',
    email: 'fatima@saylani.org',
    phone: '+92 312 9876543',
    address: 'Clifton, Karachi',
    department_id: deptDesign.id,
    designation_id: desigUIUX.id,
    hire_date: '2024-06-01',
    status: 'active',
    gender: 'female',
    gross_salary: emp2Salary.gross,
    basic_salary: emp2Salary.basic,
    hra: emp2Salary.hra,
    medical_allowance: emp2Salary.medical,
    other_allowances: emp2Salary.other,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima'
  });

  const emp3Salary = breakdownSalary(65000);
  const emp3 = db.insert('employees', {
    employee_code: 'EMP-003',
    first_name: 'Zubair',
    last_name: 'Khan',
    email: 'zubair@saylani.org',
    phone: '+92 333 4567890',
    address: 'PECHS, Karachi',
    department_id: deptEngineering.id,
    designation_id: desigJuniorEng.id,
    hire_date: '2025-02-01',
    status: 'probation',
    gender: 'male',
    gross_salary: emp3Salary.gross,
    basic_salary: emp3Salary.basic,
    hra: emp3Salary.hra,
    medical_allowance: emp3Salary.medical,
    other_allowances: emp3Salary.other,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zubair'
  });

  // Employee Logins
  db.insert('users', {
    name: 'Muhammad Ali',
    email: 'ali@saylani.org',
    password_hash: commonHash,
    role: 'employee',
    employee_id: emp1.id,
    must_change_password: false,
    is_active: true
  });

  db.insert('users', {
    name: 'Fatima Noor',
    email: 'fatima@saylani.org',
    password_hash: commonHash,
    role: 'employee',
    employee_id: emp2.id,
    must_change_password: false,
    is_active: true
  });

  db.insert('users', {
    name: 'Zubair Khan',
    email: 'zubair@saylani.org',
    password_hash: commonHash,
    role: 'employee',
    employee_id: emp3.id,
    must_change_password: true, // Test force password change!
    is_active: true
  });

  // 8. Sample Attendance
  const todayStr = new Date().toISOString().split('T')[0];
  db.insert('attendance', {
    employee_id: emp1.id,
    date: todayStr,
    check_in_time: '08:55',
    check_out_time: null,
    total_hours: 0,
    status: 'present',
    source: 'camera',
    distance_meters: 42,
    face_verified: true,
    correction_status: 'none'
  });

  db.insert('attendance', {
    employee_id: emp3.id,
    date: todayStr,
    check_in_time: '09:28',
    check_out_time: null,
    total_hours: 0,
    status: 'late',
    source: 'web',
    distance_meters: null,
    face_verified: false,
    correction_status: 'none'
  });

  // 9. Sample Leave: Fatima is on approved casual leave today
  db.insert('leave_requests', {
    employee_id: emp2.id,
    leave_type_id: ltCasual.id,
    start_date: todayStr,
    end_date: todayStr,
    working_days: 1,
    reason: "Sister's wedding event",
    status: 'approved',
    reviewer_id: hrUser.id,
    review_comment: 'Approved. Enjoy the family event!',
    reviewed_at: new Date().toISOString()
  });

  // 10. Sample Announcement
  db.insert('announcements', {
    title: 'Saylani Hackathon 2026 Kickoff',
    content: 'Welcome to the HCM Lite evaluation! Testing features: camera check-in, smart leave, monthly payroll, and AI assistant.',
    priority: 'high',
    target_role: 'all',
    author_id: adminUser.id,
    author_name: 'Admin User',
    author_role: 'admin'
  });

  // 11. Initial Audit Logs
  db.insert('audit_logs', {
    actor_id: adminUser.id,
    actor_name: 'Admin User',
    actor_role: 'admin',
    action: 'INITIALIZE',
    entity: 'Company',
    entity_id: 'settings',
    after_state: { company: 'Saylani Tech Solutions' },
    ip_address: '127.0.0.1',
    timestamp: new Date().toISOString()
  });

  return { message: 'Demo data seeded successfully' };
}
