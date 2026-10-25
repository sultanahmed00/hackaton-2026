import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, logAudit } from '../middleware/auth.js';
import { seedDemoData } from '../services/seedService.js';

const router = express.Router();

/**
 * GET /api/setup/status
 * Public endpoint to check if initial setup is complete
 */
router.get('/status', (req, res) => {
  const isInit = db.isInitialized();
  const settings = db.getSettings();
  res.json({
    initialized: isInit,
    company_name: settings?.company_name || null
  });
});

/**
 * POST /api/setup/initialize
 * First-run setup: Creates company settings and initial Admin account
 */
router.post('/initialize', async (req, res) => {
  try {
    if (db.isInitialized()) {
      return res.status(400).json({ error: 'System is already initialized. Please login or reset the system.' });
    }

    const {
      company_name,
      office_start = '09:00',
      grace_minutes = 15,
      half_day_hours = 5,
      weekend_days = ['Saturday', 'Sunday'],
      office_lat = 24.8607,
      office_lng = 67.0011,
      office_radius_meters = 150,
      admin_name,
      admin_email,
      admin_password
    } = req.body;

    if (!company_name || !admin_name || !admin_email || !admin_password) {
      return res.status(400).json({ error: 'Company name, admin name, admin email, and admin password are required.' });
    }

    // 1. Save company settings
    const companySettings = db.setSettings({
      company_name,
      office_start,
      grace_minutes: Number(grace_minutes),
      half_day_hours: Number(half_day_hours),
      weekend_days,
      office_lat: Number(office_lat),
      office_lng: Number(office_lng),
      office_radius_meters: Number(office_radius_meters),
      late_penalty_enabled: true,
      late_penalty_rule: '3 lates = 0.5 day deduction'
    });

    // 2. Create the first Admin
    const passwordHash = await bcrypt.hash(admin_password, 10);
    const adminUser = db.insert('users', {
      name: admin_name,
      email: admin_email.toLowerCase(),
      password_hash: passwordHash,
      role: 'admin',
      employee_id: null,
      must_change_password: false,
      is_active: true
    });

    // 3. Populate default standard Leave Types if empty
    const existingLeaveTypes = db.getAll('leave_types');
    if (existingLeaveTypes.length === 0) {
      db.insert('leave_types', { name: 'Annual Leave', code: 'annual', yearly_quota: 14, paid: true, description: 'Statutory annual paid leave' });
      db.insert('leave_types', { name: 'Sick Leave', code: 'sick', yearly_quota: 8, paid: true, description: 'Medical and sick leave' });
      db.insert('leave_types', { name: 'Casual Leave', code: 'casual', yearly_quota: 10, paid: true, description: 'Short notice personal/casual leave' });
      db.insert('leave_types', { name: 'Unpaid Leave', code: 'unpaid', yearly_quota: null, paid: false, description: 'Leave without pay' });
    }

    logAudit({ user: adminUser, ip: req.ip }, {
      action: 'INITIALIZE',
      entity: 'Company',
      entity_id: 'settings',
      after_state: { company_name, admin_email }
    });

    res.status(201).json({
      message: 'Initial setup completed successfully',
      company: companySettings,
      admin: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role
      }
    });
  } catch (err) {
    console.error('Initialization error:', err);
    res.status(500).json({ error: 'Failed to complete initial setup' });
  }
});

/**
 * GET /api/setup/settings
 * Accessible by Admin and HR
 */
router.get('/settings', authenticateToken, requireRoles('admin', 'hr'), (req, res) => {
  const settings = db.getSettings();
  res.json(settings || {});
});

/**
 * PUT /api/setup/settings
 * Admin updates company rules & location
 */
router.put('/settings', authenticateToken, requireRoles('admin'), (req, res) => {
  const before = db.getSettings();
  const updated = db.setSettings(req.body);

  logAudit(req, {
    action: 'UPDATE',
    entity: 'Settings',
    entity_id: 'company_settings',
    before_state: before,
    after_state: updated
  });

  res.json({ message: 'Company settings updated successfully', settings: updated });
});

/**
 * DEPARTMENTS CRUD
 */
router.get('/departments', authenticateToken, (req, res) => {
  const depts = db.getAll('departments');
  res.json(depts);
});

router.post('/departments', authenticateToken, requireRoles('admin'), (req, res) => {
  const { name, code, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Department name is required' });

  const deptCode = code || name.substring(0, 3).toUpperCase();
  const newDept = db.insert('departments', { name, code: deptCode, description: description || '' });

  logAudit(req, {
    action: 'CREATE',
    entity: 'Department',
    entity_id: newDept.id,
    after_state: newDept
  });

  res.status(201).json(newDept);
});

router.put('/departments/:id', authenticateToken, requireRoles('admin'), (req, res) => {
  const before = db.get('departments', req.params.id);
  if (!before) return res.status(404).json({ error: 'Department not found' });

  const updated = db.update('departments', req.params.id, req.body);
  logAudit(req, {
    action: 'UPDATE',
    entity: 'Department',
    entity_id: req.params.id,
    before_state: before,
    after_state: updated
  });
  res.json(updated);
});

router.delete('/departments/:id', authenticateToken, requireRoles('admin'), (req, res) => {
  const before = db.get('departments', req.params.id);
  if (!before) return res.status(404).json({ error: 'Department not found' });

  db.delete('departments', req.params.id);
  logAudit(req, {
    action: 'DELETE',
    entity: 'Department',
    entity_id: req.params.id,
    before_state: before
  });
  res.json({ message: 'Department deleted' });
});

/**
 * DESIGNATIONS CRUD
 */
router.get('/designations', authenticateToken, (req, res) => {
  const desigs = db.getAll('designations');
  res.json(desigs);
});

router.post('/designations', authenticateToken, requireRoles('admin'), (req, res) => {
  const { title, department_id, level = 'Mid' } = req.body;
  if (!title) return res.status(400).json({ error: 'Designation title is required' });

  const newDesig = db.insert('designations', { title, department_id, level });
  logAudit(req, {
    action: 'CREATE',
    entity: 'Designation',
    entity_id: newDesig.id,
    after_state: newDesig
  });
  res.status(201).json(newDesig);
});

router.delete('/designations/:id', authenticateToken, requireRoles('admin'), (req, res) => {
  const before = db.get('designations', req.params.id);
  if (!before) return res.status(404).json({ error: 'Designation not found' });

  db.delete('designations', req.params.id);
  logAudit(req, {
    action: 'DELETE',
    entity: 'Designation',
    entity_id: req.params.id,
    before_state: before
  });
  res.json({ message: 'Designation deleted' });
});

/**
 * LEAVE TYPES CRUD
 */
router.get('/leave-types', authenticateToken, (req, res) => {
  const leaveTypes = db.getAll('leave_types');
  res.json(leaveTypes);
});

router.post('/leave-types', authenticateToken, requireRoles('admin'), (req, res) => {
  const { name, code, yearly_quota, paid = true, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Leave type name is required' });

  const newType = db.insert('leave_types', {
    name,
    code: code || name.toLowerCase().replace(/\s+/g, '_'),
    yearly_quota: yearly_quota ? Number(yearly_quota) : null,
    paid: Boolean(paid),
    description: description || ''
  });
  logAudit(req, {
    action: 'CREATE',
    entity: 'LeaveType',
    entity_id: newType.id,
    after_state: newType
  });
  res.status(201).json(newType);
});

router.put('/leave-types/:id', authenticateToken, requireRoles('admin'), (req, res) => {
  const before = db.get('leave_types', req.params.id);
  if (!before) return res.status(404).json({ error: 'Leave type not found' });

  const updated = db.update('leave_types', req.params.id, req.body);
  logAudit(req, {
    action: 'UPDATE',
    entity: 'LeaveType',
    entity_id: req.params.id,
    before_state: before,
    after_state: updated
  });
  res.json(updated);
});

/**
 * PUBLIC HOLIDAYS CRUD
 */
router.get('/holidays', authenticateToken, (req, res) => {
  const holidays = db.getAll('public_holidays');
  res.json(holidays.sort((a, b) => a.date.localeCompare(b.date)));
});

router.post('/holidays', authenticateToken, requireRoles('admin'), (req, res) => {
  const { name, date } = req.body;
  if (!name || !date) return res.status(400).json({ error: 'Holiday name and date (YYYY-MM-DD) are required' });

  const newHoliday = db.insert('public_holidays', { name, date });
  logAudit(req, {
    action: 'CREATE',
    entity: 'PublicHoliday',
    entity_id: newHoliday.id,
    after_state: newHoliday
  });
  res.status(201).json(newHoliday);
});

router.delete('/holidays/:id', authenticateToken, requireRoles('admin'), (req, res) => {
  const before = db.get('public_holidays', req.params.id);
  if (!before) return res.status(404).json({ error: 'Holiday not found' });

  db.delete('public_holidays', req.params.id);
  logAudit(req, {
    action: 'DELETE',
    entity: 'PublicHoliday',
    entity_id: req.params.id,
    before_state: before
  });
  res.json({ message: 'Holiday deleted' });
});

/**
 * POST /api/setup/seed-demo
 * Seed rich demo scenario for instant hackathon evaluation
 */
router.post('/seed-demo', async (req, res) => {
  try {
    await seedDemoData();
    res.json({ message: 'Demo data loaded successfully: Admin, HR, and 3 employees created!' });
  } catch (err) {
    console.error('Seed demo error:', err);
    res.status(500).json({ error: 'Failed to seed demo data' });
  }
});

/**
 * POST /api/setup/reset
 * Resets database completely to fresh empty state
 */
router.post('/reset', (req, res) => {
  db.reset();
  res.json({ message: 'Database reset to empty state. First-run setup is now available.' });
});

export default router;
