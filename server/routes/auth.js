import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, logAudit } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'saylani_hackathon_hcm_lite_secure_token_key_2026';

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.get('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact your administrator.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, employee_id: user.employee_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    let employeeDetails = null;
    if (user.employee_id) {
      employeeDetails = db.get('employees', user.employee_id);
    }

    logAudit(req, {
      action: 'LOGIN',
      entity: 'User',
      entity_id: user.id,
      after_state: { email: user.email, role: user.role }
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id,
        must_change_password: !!user.must_change_password,
        employee: employeeDetails
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, (req, res) => {
  const user = db.get('users', req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let employeeDetails = null;
  if (user.employee_id) {
    employeeDetails = db.get('employees', user.employee_id);
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id,
      must_change_password: !!user.must_change_password,
      employee: employeeDetails
    }
  });
});

/**
 * POST /api/auth/change-password
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = db.get('users', req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If user has must_change_password flag, current_password check is optional if matched
    if (!user.must_change_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      const isValid = await bcrypt.compare(current_password, user.password_hash);
      if (!isValid) {
        return res.status(400).json({ error: 'Incorrect current password' });
      }
    }

    const newHash = await bcrypt.hash(new_password, 10);
    const updated = db.update('users', user.id, {
      password_hash: newHash,
      must_change_password: false
    });

    logAudit(req, {
      action: 'UPDATE_PASSWORD',
      entity: 'User',
      entity_id: user.id,
      after_state: { must_change_password: false }
    });

    res.json({ message: 'Password updated successfully', must_change_password: false });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

/**
 * GET /api/auth/users (Admin only)
 */
router.get('/users', authenticateToken, requireRoles('admin'), (req, res) => {
  const users = db.getAll('users').map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    employee_id: u.employee_id,
    is_active: u.is_active !== false,
    must_change_password: !!u.must_change_password,
    createdAt: u.createdAt
  }));
  res.json(users);
});

/**
 * POST /api/auth/users (Admin creates HR or other logins)
 */
router.post('/users', authenticateToken, requireRoles('admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (!['admin', 'hr'].includes(role)) {
      return res.status(400).json({ error: 'Admin can create Admin or HR logins directly. Employee logins are created via employee registration.' });
    }

    const existing = db.get('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const newUser = db.insert('users', {
      name,
      email: email.toLowerCase(),
      password_hash: hash,
      role,
      employee_id: null,
      must_change_password: false,
      is_active: true
    });

    logAudit(req, {
      action: 'CREATE',
      entity: 'User',
      entity_id: newUser.id,
      after_state: { name, email, role }
    });

    res.status(201).json({
      message: `User created with role ${role}`,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        is_active: newUser.is_active
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user account' });
  }
});

/**
 * POST /api/auth/users/:id/reset-password (Admin resets password)
 */
router.post('/users/:id/reset-password', authenticateToken, requireRoles('admin'), async (req, res) => {
  try {
    const targetUser = db.get('users', req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const tempPassword = req.body.new_password || `TempPass#${Math.floor(1000 + Math.random() * 9000)}`;
    const hash = await bcrypt.hash(tempPassword, 10);

    db.update('users', targetUser.id, {
      password_hash: hash,
      must_change_password: true
    });

    logAudit(req, {
      action: 'RESET_PASSWORD',
      entity: 'User',
      entity_id: targetUser.id,
      after_state: { must_change_password: true }
    });

    res.json({
      message: 'Password reset successfully',
      temporary_password: tempPassword,
      must_change_password: true
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * PATCH /api/auth/users/:id/status (Admin deactivates/activates user)
 */
router.patch('/users/:id/status', authenticateToken, requireRoles('admin'), (req, res) => {
  const targetUser = db.get('users', req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  if (targetUser.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot deactivate your own active admin account' });
  }

  const is_active = req.body.is_active;
  db.update('users', targetUser.id, { is_active });

  logAudit(req, {
    action: is_active ? 'ACTIVATE' : 'DEACTIVATE',
    entity: 'User',
    entity_id: targetUser.id,
    after_state: { is_active }
  });

  res.json({ message: `User ${is_active ? 'activated' : 'deactivated'} successfully`, is_active });
});

export default router;
