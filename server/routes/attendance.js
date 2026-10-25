import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, enforceDataScope, logAudit } from '../middleware/auth.js';
import { calculateDistance } from '../services/rulesService.js';

const router = express.Router();

/**
 * Helper: format today's ISO date string (YYYY-MM-DD)
 */
function getTodayDateStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * GET /api/attendance/today
 * Daily attendance board (Admin & HR see all, Employee sees own)
 */
router.get('/today', authenticateToken, (req, res) => {
  const dateStr = req.query.date || getTodayDateStr();
  const settings = db.getSettings() || {};
  const employees = db.getAll('employees');
  const records = db.getAll('attendance', { date: dateStr });
  const leaves = db.getAll('leave_requests', r =>
    r.status === 'approved' && r.start_date <= dateStr && r.end_date >= dateStr
  );

  const empMap = new Map(employees.map(e => [e.id, e]));
  const leaveEmpIds = new Set(leaves.map(l => l.employee_id));

  // Build daily board
  const board = employees.map(emp => {
    const att = records.find(r => r.employee_id === emp.id);
    const onLeave = leaveEmpIds.has(emp.id);

    let status = 'absent';
    if (att) {
      status = att.status;
    } else if (onLeave) {
      status = 'on_leave';
    }

    const dept = db.get('departments', emp.department_id);

    return {
      employee_id: emp.id,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      employee_code: emp.employee_code,
      department_name: dept?.name || 'Unassigned',
      date: dateStr,
      check_in_time: att?.check_in_time || null,
      check_out_time: att?.check_out_time || null,
      total_hours: att?.total_hours || 0,
      status,
      source: att?.source || null,
      correction_status: att?.correction_status || 'none',
      attendance_id: att?.id || null
    };
  });

  if (req.user.role === 'employee') {
    const myRecord = board.find(b => b.employee_id === req.user.employee_id);
    return res.json({ date: dateStr, records: myRecord ? [myRecord] : [] });
  }

  res.json({ date: dateStr, records: board });
});

/**
 * GET /api/attendance/my
 * Employee's own attendance history
 */
router.get('/my', authenticateToken, (req, res) => {
  const employeeId = req.user.employee_id;
  if (!employeeId) {
    return res.json([]);
  }

  const records = db.getAll('attendance', { employee_id: employeeId })
    .sort((a, b) => b.date.localeCompare(a.date));

  res.json(records);
});

/**
 * POST /api/attendance/check-in
 * Web and Camera check-in
 */
router.post('/check-in', authenticateToken, (req, res) => {
  const employeeId = req.body.employee_id || req.user.employee_id;

  if (!employeeId) {
    return res.status(400).json({ error: 'Employee ID required for check-in' });
  }

  // Employee can only check in for themselves
  if (req.user.role === 'employee' && employeeId !== req.user.employee_id) {
    return res.status(403).json({ error: 'Cannot check in for another employee' });
  }

  const todayStr = getTodayDateStr();

  // One record per employee per day: second check-in = 409 Conflict
  const existing = db.get('attendance', { employee_id: employeeId, date: todayStr });
  if (existing) {
    return res.status(409).json({
      error: 'Conflict: Already checked in for today',
      attendance: existing
    });
  }

  const settings = db.getSettings() || {
    office_start: '09:00',
    grace_minutes: 15,
    half_day_hours: 5,
    office_lat: 24.8607,
    office_lng: 67.0011,
    office_radius_meters: 150
  };

  const { lat, lng, accuracy, face_detected, source = 'web' } = req.body;

  let distance = null;
  // If camera check-in, perform geofence & face validation
  if (source === 'camera') {
    if (face_detected === false) {
      return res.status(400).json({
        error: 'Face check failed: exactly one face must be visible in the camera frame.'
      });
    }

    if (accuracy !== undefined && Number(accuracy) > 100) {
      return res.status(400).json({
        error: `GPS accuracy too low (${Math.round(accuracy)}m). Accuracy must be within 100m.`
      });
    }

    if (lat !== undefined && lng !== undefined) {
      distance = calculateDistance(
        Number(lat),
        Number(lng),
        settings.office_lat,
        settings.office_lng
      );

      if (distance > settings.office_radius_meters) {
        return res.status(400).json({
          error: `Location rejected: You are ${distance}m away from the office. Allowed radius is ${settings.office_radius_meters}m. Please submit an HR attendance correction if on remote work.`
        });
      }
    }
  }

  // Server stamps the time
  const now = new Date();
  const checkInTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

  // Determine late status: office_start + grace_minutes
  const [startHour, startMin] = (settings.office_start || '09:00').split(':').map(Number);
  const grace = settings.grace_minutes || 15;
  const cutoffMinutes = startHour * 60 + startMin + grace;

  const [curHour, curMin] = checkInTime.split(':').map(Number);
  const curMinutes = curHour * 60 + curMin;

  const isLate = curMinutes > cutoffMinutes;
  const initialStatus = isLate ? 'late' : 'present';

  const newRecord = db.insert('attendance', {
    employee_id: employeeId,
    date: todayStr,
    check_in_time: checkInTime,
    check_out_time: null,
    total_hours: 0,
    status: initialStatus,
    source,
    check_in_lat: lat || null,
    check_in_lng: lng || null,
    distance_meters: distance,
    face_verified: source === 'camera' ? true : false,
    correction_status: 'none'
  });

  logAudit(req, {
    action: 'CHECK_IN',
    entity: 'Attendance',
    entity_id: newRecord.id,
    after_state: { date: todayStr, checkInTime, status: initialStatus, source }
  });

  res.status(201).json({
    message: isLate ? 'Checked in (Late)' : 'Checked in successfully',
    attendance: newRecord
  });
});

/**
 * POST /api/attendance/check-out
 */
router.post('/check-out', authenticateToken, (req, res) => {
  const employeeId = req.body.employee_id || req.user.employee_id;

  if (req.user.role === 'employee' && employeeId !== req.user.employee_id) {
    return res.status(403).json({ error: 'Cannot check out for another employee' });
  }

  const todayStr = getTodayDateStr();
  const record = db.get('attendance', { employee_id: employeeId, date: todayStr });

  if (!record) {
    return res.status(404).json({ error: 'No check-in record found for today' });
  }

  if (record.check_out_time) {
    return res.status(400).json({ error: 'Already checked out for today' });
  }

  const now = new Date();
  const checkOutTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

  const [inH, inM] = record.check_in_time.split(':').map(Number);
  const [outH, outM] = checkOutTime.split(':').map(Number);
  const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  const totalHours = Math.max(0, +(totalMinutes / 60).toFixed(2));

  const settings = db.getSettings() || { half_day_hours: 5 };
  let finalStatus = record.status;

  if (totalHours < (settings.half_day_hours || 5)) {
    finalStatus = 'half_day';
  }

  const updated = db.update('attendance', record.id, {
    check_out_time: checkOutTime,
    total_hours: totalHours,
    status: finalStatus
  });

  logAudit(req, {
    action: 'CHECK_OUT',
    entity: 'Attendance',
    entity_id: record.id,
    after_state: { checkOutTime, totalHours, status: finalStatus }
  });

  res.json({
    message: 'Checked out successfully',
    attendance: updated
  });
});

/**
 * POST /api/attendance/correction-request
 * Employee submits an attendance correction
 */
router.post('/correction-request', authenticateToken, (req, res) => {
  const { attendance_id, date, requested_check_in, requested_check_out, reason } = req.body;

  if (!reason || !date) {
    return res.status(400).json({ error: 'Date and reason are required' });
  }

  const employeeId = req.user.employee_id;
  let record = attendance_id ? db.get('attendance', attendance_id) : db.get('attendance', { employee_id: employeeId, date });

  if (record) {
    db.update('attendance', record.id, {
      correction_status: 'pending',
      correction_reason: reason,
      correction_details: { requested_check_in, requested_check_out }
    });
  } else {
    // Missing record correction
    record = db.insert('attendance', {
      employee_id: employeeId,
      date,
      check_in_time: requested_check_in || '09:00',
      check_out_time: requested_check_out || '17:00',
      total_hours: 8,
      status: 'pending_correction',
      source: 'correction',
      correction_status: 'pending',
      correction_reason: reason,
      correction_details: { requested_check_in, requested_check_out }
    });
  }

  // Notify HR
  const hrUsers = db.getAll('users', { role: 'hr' });
  const emp = db.get('employees', employeeId);
  for (const hr of hrUsers) {
    db.insert('notifications', {
      user_id: hr.id,
      title: 'Attendance Correction Requested',
      message: `${emp?.first_name || 'An employee'} requested attendance correction for ${date}`,
      type: 'attendance',
      is_read: false
    });
  }

  res.json({ message: 'Correction request submitted to HR', record });
});

/**
 * GET /api/attendance/corrections
 * HR and Admin view all pending corrections
 */
router.get('/corrections', authenticateToken, requireRoles('hr', 'admin'), (req, res) => {
  const corrections = db.getAll('attendance', a => a.correction_status === 'pending');
  const enriched = corrections.map(c => {
    const emp = db.get('employees', c.employee_id);
    const dept = emp ? db.get('departments', emp.department_id) : null;
    return {
      ...c,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
      employee_code: emp?.employee_code || '',
      department_name: dept?.name || 'Unassigned'
    };
  });
  res.json(enriched);
});

/**
 * POST /api/attendance/corrections/:id/action
 * HR approves or rejects attendance correction
 */
router.post('/corrections/:id/action', authenticateToken, requireRoles('hr', 'admin'), (req, res) => {
  const { action, comment } = req.body; // 'approve' or 'reject'
  const record = db.get('attendance', req.params.id);

  if (!record) return res.status(404).json({ error: 'Attendance record not found' });

  if (action === 'approve') {
    const updates = {
      correction_status: 'approved',
      status: 'present',
      review_comment: comment || 'Correction approved by HR'
    };
    if (record.correction_details?.requested_check_in) {
      updates.check_in_time = record.correction_details.requested_check_in;
    }
    if (record.correction_details?.requested_check_out) {
      updates.check_out_time = record.correction_details.requested_check_out;
      updates.total_hours = 8;
    }
    const updated = db.update('attendance', record.id, updates);

    // Notify employee
    const user = db.get('users', u => u.employee_id === record.employee_id);
    if (user) {
      db.insert('notifications', {
        user_id: user.id,
        title: 'Attendance Correction Approved',
        message: `Your attendance correction for ${record.date} was approved.`,
        type: 'attendance',
        is_read: false
      });
    }

    logAudit(req, {
      action: 'APPROVE_ATTENDANCE_CORRECTION',
      entity: 'Attendance',
      entity_id: record.id,
      after_state: updated
    });

    return res.json({ message: 'Correction approved', record: updated });
  } else {
    const updated = db.update('attendance', record.id, {
      correction_status: 'rejected',
      review_comment: comment || 'Correction rejected by HR'
    });

    const user = db.get('users', u => u.employee_id === record.employee_id);
    if (user) {
      db.insert('notifications', {
        user_id: user.id,
        title: 'Attendance Correction Rejected',
        message: `Your attendance correction for ${record.date} was rejected: ${comment || 'No reason provided'}`,
        type: 'attendance',
        is_read: false
      });
    }

    logAudit(req, {
      action: 'REJECT_ATTENDANCE_CORRECTION',
      entity: 'Attendance',
      entity_id: record.id,
      after_state: updated
    });

    return res.json({ message: 'Correction rejected', record: updated });
  }
});

export default router;
