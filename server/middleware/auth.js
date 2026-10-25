import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'saylani_hackathon_hcm_lite_secure_token_key_2026';

/**
 * Authenticates JWT token and sets req.user
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    const user = db.get('users', decoded.id);
    if (!user || user.is_active === false) {
      return res.status(403).json({ error: 'User account not found or deactivated' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id,
      must_change_password: user.must_change_password
    };

    next();
  });
}

/**
 * Role-based authorization guard
 * @param  {...string} roles Allowed roles ('admin', 'hr', 'employee')
 */
export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: requires one of [${roles.join(', ')}] role. Current role is '${req.user.role}'.`
      });
    }
    next();
  };
}

/**
 * Data Scope Guard: Ensures Employees can only access their own employee_id
 */
export function enforceDataScope(req, res, next) {
  if (req.user.role === 'employee') {
    const targetEmployeeId = req.params.employeeId || req.params.id || req.query.employee_id || req.body.employee_id;
    if (targetEmployeeId && targetEmployeeId !== req.user.employee_id) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to view or modify another employee\'s data.'
      });
    }
  }
  next();
}

/**
 * Audit Log recorder helper
 */
export function logAudit(req, { action, entity, entity_id, before_state = null, after_state = null }) {
  try {
    const actor = req.user || { id: 'system', name: 'System Installer', role: 'system' };
    const logEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      action,
      entity,
      entity_id: String(entity_id || ''),
      before_state,
      after_state,
      ip_address: req.ip || req.connection?.remoteAddress || '127.0.0.1',
      timestamp: new Date().toISOString()
    };
    db.insert('audit_logs', logEntry);
    return logEntry;
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}
