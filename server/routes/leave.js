import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, logAudit } from '../middleware/auth.js';
import { calculateWorkingDays, getLeaveBalance, hasOverlappingLeave } from '../services/rulesService.js';

const router = express.Router();

/**
 * GET /api/leave/balances
 * Returns leave balances for current employee or specified employee
 */
router.get('/balances', authenticateToken, (req, res) => {
  let employeeId = req.user.employee_id;
  if (req.query.employee_id && req.user.role !== 'employee') {
    employeeId = req.query.employee_id;
  }

  if (!employeeId) {
    return res.status(400).json({ error: 'No employee associated with this account' });
  }

  const leaveTypes = db.getAll('leave_types');
  const balances = leaveTypes.map(lt => {
    const bal = getLeaveBalance(employeeId, lt.id);
    return {
      leave_type_id: lt.id,
      name: lt.name,
      code: lt.code,
      yearly_quota: lt.yearly_quota,
      ...bal
    };
  });

  res.json(balances);
});

/**
 * GET /api/leave/requests
 * List leave requests: HR/Admin see all or filter; Employee sees own
 */
router.get('/requests', authenticateToken, (req, res) => {
  let requests = db.getAll('leave_requests');

  if (req.user.role === 'employee') {
    requests = requests.filter(r => r.employee_id === req.user.employee_id);
  } else if (req.query.status) {
    requests = requests.filter(r => r.status === req.query.status);
  }

  const employees = new Map(db.getAll('employees').map(e => [e.id, e]));
  const leaveTypes = new Map(db.getAll('leave_types').map(lt => [lt.id, lt]));

  const enriched = requests
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(reqItem => {
      const emp = employees.get(reqItem.employee_id);
      const lt = leaveTypes.get(reqItem.leave_type_id);
      return {
        ...reqItem,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
        employee_code: emp?.employee_code || '',
        leave_type_name: lt?.name || 'Leave',
        leave_type_code: lt?.code || 'leave'
      };
    });

  res.json(enriched);
});

/**
 * POST /api/leave/apply
 * Employee applies for leave
 */
router.post('/apply', authenticateToken, (req, res) => {
  try {
    const employeeId = req.body.employee_id || req.user.employee_id;
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID required' });
    }

    if (req.user.role === 'employee' && employeeId !== req.user.employee_id) {
      return res.status(403).json({ error: 'Cannot apply for leave on behalf of another employee' });
    }

    const { leave_type_id, start_date, end_date, reason } = req.body;

    if (!leave_type_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'Leave type, start date, and end date are required' });
    }

    const leaveType = db.get('leave_types', leave_type_id);
    if (!leaveType) {
      return res.status(404).json({ error: 'Invalid leave type' });
    }

    // 1. Calculate working days (skipping weekends and public holidays)
    const workingDays = calculateWorkingDays(start_date, end_date);
    if (workingDays <= 0) {
      return res.status(400).json({
        error: 'The selected date range contains 0 working days (dates fall entirely on weekends or public holidays).'
      });
    }

    // 2. Overlap check -> 422
    if (hasOverlappingLeave(employeeId, start_date, end_date)) {
      return res.status(422).json({
        error: 'Overlap error: You already have a pending or approved leave request during these dates.'
      });
    }

    // 3. Over-balance check -> 422
    const balance = getLeaveBalance(employeeId, leave_type_id);
    if (balance.quota !== 'Unlimited') {
      if (workingDays > balance.remaining) {
        return res.status(422).json({
          error: `Insufficient leave balance: You requested ${workingDays} working days, but have only ${balance.remaining} days remaining.`
        });
      }
    }

    const newRequest = db.insert('leave_requests', {
      employee_id: employeeId,
      leave_type_id,
      start_date,
      end_date,
      working_days: workingDays,
      reason: reason || '',
      status: 'pending',
      reviewer_id: null,
      review_comment: null,
      reviewed_at: null
    });

    // Notify HR
    const hrUsers = db.getAll('users', { role: 'hr' });
    const emp = db.get('employees', employeeId);
    for (const hr of hrUsers) {
      db.insert('notifications', {
        user_id: hr.id,
        title: 'New Leave Request',
        message: `${emp?.first_name || 'An employee'} applied for ${workingDays} day(s) of ${leaveType.name}`,
        type: 'leave',
        is_read: false
      });
    }

    logAudit(req, {
      action: 'APPLY_LEAVE',
      entity: 'Leave',
      entity_id: newRequest.id,
      after_state: { employeeId, start_date, end_date, workingDays, leave_type: leaveType.name }
    });

    res.status(201).json({
      message: 'Leave request submitted successfully',
      request: newRequest,
      working_days: workingDays
    });
  } catch (err) {
    console.error('Leave application error:', err);
    res.status(500).json({ error: 'Failed to submit leave request' });
  }
});

/**
 * POST /api/leave/:id/cancel
 * Employee cancels pending leave request
 */
router.post('/:id/cancel', authenticateToken, (req, res) => {
  const request = db.get('leave_requests', req.params.id);
  if (!request) return res.status(404).json({ error: 'Leave request not found' });

  if (req.user.role === 'employee' && request.employee_id !== req.user.employee_id) {
    return res.status(403).json({ error: 'Cannot cancel another employee\'s leave' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ error: 'Can only cancel pending leave requests' });
  }

  const updated = db.update('leave_requests', request.id, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString()
  });

  logAudit(req, {
    action: 'CANCEL_LEAVE',
    entity: 'Leave',
    entity_id: request.id,
    after_state: { status: 'cancelled' }
  });

  res.json({ message: 'Leave request cancelled', request: updated });
});

/**
 * POST /api/leave/:id/action
 * HR approves or rejects leave request with comment
 */
router.post('/:id/action', authenticateToken, requireRoles('hr', 'admin'), (req, res) => {
  const { action, comment } = req.body; // 'approve' or 'reject'
  const request = db.get('leave_requests', req.params.id);

  if (!request) return res.status(404).json({ error: 'Leave request not found' });
  if (request.status !== 'pending') {
    return res.status(400).json({ error: `Leave request is already ${request.status}` });
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const updated = db.update('leave_requests', request.id, {
    status: newStatus,
    reviewer_id: req.user.id,
    review_comment: comment || `Leave request ${newStatus} by HR`,
    reviewed_at: new Date().toISOString()
  });

  // Notify the employee
  const user = db.get('users', u => u.employee_id === request.employee_id);
  if (user) {
    db.insert('notifications', {
      user_id: user.id,
      title: `Leave Request ${newStatus === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your leave request for ${request.start_date} to ${request.end_date} was ${newStatus}. ${comment ? `Note: "${comment}"` : ''}`,
      type: 'leave',
      is_read: false
    });
  }

  logAudit(req, {
    action: newStatus === 'approved' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE',
    entity: 'Leave',
    entity_id: request.id,
    after_state: updated
  });

  res.json({ message: `Leave request ${newStatus}`, request: updated });
});

export default router;
