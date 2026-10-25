import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { getLeaveBalance } from '../services/rulesService.js';

const router = express.Router();

/**
 * GET /api/dashboards/admin
 * Admin executive dashboard KPIs and charts
 */
router.get('/admin', authenticateToken, requireRoles('admin'), (req, res) => {
  const { department_id } = req.query;

  let employees = db.getAll('employees');
  if (department_id) {
    employees = employees.filter(e => e.department_id === department_id);
  }

  const activeEmployees = employees.filter(e => e.status === 'active' || e.status === 'probation');
  const exitedEmployees = employees.filter(e => e.status === 'terminated' || e.status === 'resigned');

  // Headcount
  const headcount = activeEmployees.length;

  // Attrition YTD formula: exits in period / average headcount * 100
  const avgHeadcount = Math.max(1, headcount + exitedEmployees.length / 2);
  const attritionYTD = +((exitedEmployees.length / avgHeadcount) * 100).toFixed(1);

  // Payroll Cost & Avg Salary
  const totalPayrollCost = activeEmployees.reduce((sum, e) => sum + (e.gross_salary || 0), 0);
  const avgSalary = headcount > 0 ? Math.round(totalPayrollCost / headcount) : 0;

  // Headcount by department
  const departments = db.getAll('departments');
  const headcountByDept = departments.map(d => {
    const count = activeEmployees.filter(e => e.department_id === d.id).length;
    const deptGross = activeEmployees
      .filter(e => e.department_id === d.id)
      .reduce((sum, e) => sum + (e.gross_salary || 0), 0);
    return {
      department_id: d.id,
      department_name: d.name,
      count,
      payroll_cost: deptGross
    };
  });

  // Gender diversity
  const genderStats = {
    male: activeEmployees.filter(e => e.gender === 'male').length,
    female: activeEmployees.filter(e => e.gender === 'female').length,
    other: activeEmployees.filter(e => e.gender === 'other' || !e.gender).length
  };

  // Tenure distribution
  const now = Date.now();
  const tenureStats = {
    under1Year: 0,
    oneToTwoYears: 0,
    overTwoYears: 0
  };
  activeEmployees.forEach(e => {
    if (e.hire_date) {
      const months = (now - new Date(e.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (months < 12) tenureStats.under1Year++;
      else if (months <= 24) tenureStats.oneToTwoYears++;
      else tenureStats.overTwoYears++;
    }
  });

  // Recent audit feed
  const auditLogs = db.getAll('audit_logs')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 8);

  res.json({
    kpis: {
      headcount,
      attrition_ytd: attritionYTD,
      monthly_payroll_cost: totalPayrollCost,
      average_salary: avgSalary
    },
    headcount_by_department: headcountByDept,
    gender_distribution: genderStats,
    tenure_distribution: tenureStats,
    recent_audit_feed: auditLogs
  });
});

/**
 * GET /api/dashboards/hr
 * HR Operations dashboard KPIs, trends, and late-comers
 */
router.get('/hr', authenticateToken, requireRoles('hr', 'admin'), (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const { department_id } = req.query;

  let employees = db.getAll('employees', { status: 'active' });
  if (department_id) {
    employees = employees.filter(e => e.department_id === department_id);
  }

  const empIds = new Set(employees.map(e => e.id));
  const todayRecords = db.getAll('attendance', a => a.date === todayStr && empIds.has(a.employee_id));

  // Leaves today
  const leavesToday = db.getAll('leave_requests', r =>
    r.status === 'approved' &&
    r.start_date <= todayStr &&
    r.end_date >= todayStr &&
    empIds.has(r.employee_id)
  );

  const presentCount = todayRecords.filter(a => a.status === 'present' || a.status === 'late').length;
  const lateTodayCount = todayRecords.filter(a => a.status === 'late').length;
  const onLeaveCount = leavesToday.length;
  const absentCount = Math.max(0, employees.length - (presentCount + onLeaveCount));

  // Pending approvals
  const pendingLeaves = db.getAll('leave_requests', { status: 'pending' }).length;
  const pendingCorrections = db.getAll('attendance', { correction_status: 'pending' }).length;
  const totalPendingApprovals = pendingLeaves + pendingCorrections;

  // Attendance Trend (last 7 days)
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const dayRecords = db.getAll('attendance', a => a.date === dateStr && empIds.has(a.employee_id));
    trend.push({
      date: dateStr,
      present: dayRecords.filter(r => r.status === 'present' || r.status === 'late').length,
      late: dayRecords.filter(r => r.status === 'late').length,
      absent: Math.max(0, employees.length - dayRecords.length)
    });
  }

  // Absenteeism by department
  const departments = db.getAll('departments');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const absenteeismByDept = departments.map(d => {
    const deptEmps = db.getAll('employees', { department_id: d.id, status: 'active' });
    const deptEmpIds = new Set(deptEmps.map(e => e.id));
    const absentRecords = db.getAll('attendance', a =>
      a.date >= thirtyDaysAgo && a.status === 'absent' && deptEmpIds.has(a.employee_id)
    );
    const expectedDays = Math.max(1, deptEmps.length * 22);
    const rate = +((absentRecords.length / expectedDays) * 100).toFixed(1);
    return {
      department_name: d.name,
      rate
    };
  });

  // Leave utilization by type
  const leaveTypes = db.getAll('leave_types');
  const leaveUtilization = leaveTypes.map(lt => {
    const approvedRequests = db.getAll('leave_requests', { leave_type_id: lt.id, status: 'approved' });
    const totalDays = approvedRequests.reduce((sum, r) => sum + (r.working_days || 0), 0);
    return {
      leave_type: lt.name,
      days_used: totalDays,
      quota: lt.yearly_quota || 'Unlimited'
    };
  });

  // Top 5 late-comers this month
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
  const monthAttendances = db.getAll('attendance', a => a.date.startsWith(currentMonthStr) && a.status === 'late');
  const lateCountMap = new Map();
  monthAttendances.forEach(a => {
    lateCountMap.set(a.employee_id, (lateCountMap.get(a.employee_id) || 0) + 1);
  });

  const allEmployeesMap = new Map(db.getAll('employees').map(e => [e.id, e]));
  const topLateComers = Array.from(lateCountMap.entries())
    .map(([empId, count]) => {
      const emp = allEmployeesMap.get(empId);
      const dept = emp ? db.get('departments', emp.department_id) : null;
      return {
        employee_id: empId,
        name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
        department: dept?.name || 'Unassigned',
        late_count: count
      };
    })
    .sort((a, b) => b.late_count - a.late_count)
    .slice(0, 5);

  res.json({
    kpis: {
      headcount: employees.length,
      present_today: presentCount,
      on_leave_today: onLeaveCount,
      late_today: lateTodayCount,
      absent_today: absentCount,
      pending_approvals: totalPendingApprovals
    },
    attendance_trend: trend,
    absenteeism_by_dept: absenteeismByDept,
    leave_utilization: leaveUtilization,
    top_late_comers: topLateComers
  });
});

/**
 * GET /api/dashboards/employee
 * Employee personal self-service dashboard
 */
router.get('/employee', authenticateToken, (req, res) => {
  const employeeId = req.user.employee_id;
  if (!employeeId) {
    return res.status(404).json({ error: 'No employee record linked to this account' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const emp = db.get('employees', employeeId);
  const dept = emp ? db.get('departments', emp.department_id) : null;
  const desig = emp ? db.get('designations', emp.designation_id) : null;

  // Today attendance
  const todayAtt = db.get('attendance', { employee_id: employeeId, date: todayStr });

  // Hours this week
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const mondayStr = monday.toISOString().split('T')[0];

  const weekAttendances = db.getAll('attendance', a =>
    a.employee_id === employeeId && a.date >= mondayStr && a.date <= todayStr
  );
  const hoursThisWeek = weekAttendances.reduce((sum, a) => sum + (a.total_hours || 0), 0);

  // Late count this month
  const monthStr = todayStr.substring(0, 7);
  const monthAttendances = db.getAll('attendance', a =>
    a.employee_id === employeeId && a.date.startsWith(monthStr)
  );
  const lateCountThisMonth = monthAttendances.filter(a => a.status === 'late').length;

  // Leave balances
  const leaveTypes = db.getAll('leave_types');
  const balances = leaveTypes.map(lt => ({
    leave_type: lt,
    ...getLeaveBalance(employeeId, lt.id)
  }));

  // Last payslip
  const payslips = db.getAll('payslips', { employee_id: employeeId, status: 'finalized' })
    .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));
  const lastPayslip = payslips[0] || null;

  // Recent announcements
  const announcements = db.getAll('announcements')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  res.json({
    employee: {
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      code: emp.employee_code,
      department: dept?.name || 'Unassigned',
      designation: desig?.title || 'Staff',
      avatar_url: emp.avatar_url
    },
    today_attendance: todayAtt,
    hours_this_week: +hoursThisWeek.toFixed(1),
    weekly_target_hours: 40,
    late_count_this_month: lateCountThisMonth,
    leave_balances: balances,
    last_payslip: lastPayslip,
    recent_announcements: announcements
  });
});

export default router;
