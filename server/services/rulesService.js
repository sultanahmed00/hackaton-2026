import { db } from '../db/database.js';

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Checks if a specific Date object is a weekend (default: Sat, Sun)
 */
export function isWeekend(date, weekendDays = ['Saturday', 'Sunday']) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[date.getDay()];
  return weekendDays.includes(dayName);
}

/**
 * Checks if a date string (YYYY-MM-DD) is a public holiday
 */
export function isHoliday(dateStr, holidays = null) {
  const list = holidays || db.getAll('public_holidays');
  return list.some(h => h.date === dateStr);
}

/**
 * Calculates working days between start date and end date (inclusive)
 * Skipping weekends and public holidays
 */
export function calculateWorkingDays(startDateStr, endDateStr) {
  const settings = db.getSettings() || { weekend_days: ['Saturday', 'Sunday'] };
  const holidays = db.getAll('public_holidays');
  
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return 0;
  }

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const curStr = cur.toISOString().split('T')[0];
    const isWk = isWeekend(cur, settings.weekend_days || ['Saturday', 'Sunday']);
    const isHol = isHoliday(curStr, holidays);

    if (!isWk && !isHol) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return count;
}

/**
 * Get total working days in a specific month (1-indexed month)
 */
export function getWorkingDaysInMonth(year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return calculateWorkingDays(startDate, endDate);
}

/**
 * Calculates tax on annual gross salary using Section 3 & 6 brackets
 */
export function calculateAnnualTax(annualGross) {
  if (annualGross <= 600000) {
    return 0;
  } else if (annualGross <= 1200000) {
    return (annualGross - 600000) * 0.05;
  } else if (annualGross <= 2400000) {
    return 30000 + (annualGross - 1200000) * 0.15;
  } else if (annualGross <= 3600000) {
    return 210000 + (annualGross - 2400000) * 0.25;
  } else {
    return 510000 + (annualGross - 3600000) * 0.35;
  }
}

/**
 * Break down salary components from gross salary
 * Gross = 1.5 * Basic
 * Basic = Gross / 1.5
 * HRA = 40% of Basic
 * Medical = 10% of Basic
 */
export function breakdownSalary(grossSalary) {
  const gross = Number(grossSalary) || 0;
  const basic = Math.round(gross / 1.5);
  const hra = Math.round(basic * 0.40);
  const medical = Math.round(basic * 0.10);
  const other = gross - (basic + hra + medical);

  return {
    gross,
    basic,
    hra,
    medical,
    other: Math.max(0, other)
  };
}

/**
 * Calculate leave balance for an employee for a specific leave type
 */
export function getLeaveBalance(employeeId, leaveTypeId) {
  const leaveType = db.get('leave_types', leaveTypeId);
  if (!leaveType) return { quota: 0, used: 0, pending: 0, remaining: 0 };

  if (!leaveType.yearly_quota) {
    // Unpaid or unlimited
    const usedRequests = db.getAll('leave_requests', { employee_id: employeeId, leave_type_id: leaveTypeId, status: 'approved' });
    const used = usedRequests.reduce((acc, r) => acc + (r.working_days || 0), 0);
    return { quota: 'Unlimited', used, pending: 0, remaining: 'Unlimited' };
  }

  const quota = leaveType.yearly_quota;
  const approvedRequests = db.getAll('leave_requests', { employee_id: employeeId, leave_type_id: leaveTypeId, status: 'approved' });
  const pendingRequests = db.getAll('leave_requests', { employee_id: employeeId, leave_type_id: leaveTypeId, status: 'pending' });

  const used = approvedRequests.reduce((acc, r) => acc + (r.working_days || 0), 0);
  const pending = pendingRequests.reduce((acc, r) => acc + (r.working_days || 0), 0);
  const remaining = Math.max(0, quota - used);

  return { quota, used, pending, remaining };
}

/**
 * Check if employee has overlapping leave
 */
export function hasOverlappingLeave(employeeId, startDate, endDate, excludeLeaveId = null) {
  const existing = db.getAll('leave_requests', r => 
    r.employee_id === employeeId && 
    r.id !== excludeLeaveId &&
    (r.status === 'approved' || r.status === 'pending')
  );

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  return existing.some(req => {
    const reqStart = new Date(req.start_date).getTime();
    const reqEnd = new Date(req.end_date).getTime();
    // Overlap condition: start <= reqEnd && end >= reqStart
    return start <= reqEnd && end >= reqStart;
  });
}

/**
 * Bonus: Computes employee attrition risk score (0 - 100)
 */
export function calculateAttritionRisk(employee) {
  let score = 15; // baseline risk

  // Check recent late arrivals
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const attendances = db.getAll('attendance', a => a.employee_id === employee.id && a.date >= thirtyDaysAgo);
  const lateCount = attendances.filter(a => a.status === 'late').length;
  if (lateCount >= 4) score += 25;
  else if (lateCount >= 2) score += 10;

  // Check tenure
  if (employee.hire_date) {
    const tenureMonths = (Date.now() - new Date(employee.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (tenureMonths < 3) score += 20; // High probation risk
    else if (tenureMonths > 24) score -= 10; // Stable
  }

  // Check recent leaves
  const leaves = db.getAll('leave_requests', l => l.employee_id === employee.id && l.status === 'approved');
  const totalLeaveDays = leaves.reduce((sum, l) => sum + (l.working_days || 0), 0);
  if (totalLeaveDays > 15) score += 15;

  return Math.min(100, Math.max(5, score));
}

/**
 * Bonus: Detect absence anomalies (e.g. consecutive Friday/Monday pattern)
 */
export function detectAbsenceAnomalies(employeeId) {
  const records = db.getAll('attendance', a => a.employee_id === employeeId && a.status === 'absent');
  let mondayFridayCount = 0;

  for (const r of records) {
    const d = new Date(r.date);
    const day = d.getDay();
    if (day === 1 || day === 5) {
      mondayFridayCount++;
    }
  }

  return {
    hasAnomaly: mondayFridayCount >= 3,
    mondayFridayAbsentCount: mondayFridayCount,
    message: mondayFridayCount >= 3 ? 'High cluster of Monday/Friday absences detected' : 'Normal attendance pattern'
  };
}
