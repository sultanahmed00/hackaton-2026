import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, logAudit } from '../middleware/auth.js';

const router = express.Router();

/**
 * ANNOUNCEMENTS
 */
router.get('/announcements', authenticateToken, (req, res) => {
  const userRole = req.user.role;
  const announcements = db.getAll('announcements')
    .filter(a => a.target_role === 'all' || a.target_role === userRole)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(announcements);
});

router.post('/announcements', authenticateToken, requireRoles('admin', 'hr'), (req, res) => {
  const { title, content, priority = 'normal', target_role = 'all' } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const announcement = db.insert('announcements', {
    title,
    content,
    priority,
    target_role,
    author_id: req.user.id,
    author_name: req.user.name,
    author_role: req.user.role
  });

  logAudit(req, {
    action: 'CREATE',
    entity: 'Announcement',
    entity_id: announcement.id,
    after_state: announcement
  });

  res.status(201).json(announcement);
});

router.delete('/announcements/:id', authenticateToken, requireRoles('admin', 'hr'), (req, res) => {
  const item = db.get('announcements', req.params.id);
  if (!item) return res.status(404).json({ error: 'Announcement not found' });

  db.delete('announcements', req.params.id);
  logAudit(req, {
    action: 'DELETE',
    entity: 'Announcement',
    entity_id: req.params.id,
    before_state: item
  });

  res.json({ message: 'Announcement deleted' });
});

/**
 * IN-APP NOTIFICATIONS
 */
router.get('/notifications', authenticateToken, (req, res) => {
  const userNotifications = db.getAll('notifications', { user_id: req.user.id })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const unreadCount = userNotifications.filter(n => !n.is_read).length;
  res.json({ notifications: userNotifications, unreadCount });
});

router.post('/notifications/:id/read', authenticateToken, (req, res) => {
  const notif = db.get('notifications', req.params.id);
  if (!notif || notif.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  const updated = db.update('notifications', notif.id, { is_read: true });
  res.json(updated);
});

router.post('/notifications/mark-all-read', authenticateToken, (req, res) => {
  const userNotifications = db.getAll('notifications', { user_id: req.user.id });
  for (const n of userNotifications) {
    db.update('notifications', n.id, { is_read: true });
  }
  res.json({ message: 'All notifications marked as read' });
});

/**
 * AUDIT LOG (Admin only!)
 * Server strictly guards: HR and Employee CANNOT view.
 * No DELETE or UPDATE route exists for audit logs (immutable).
 */
router.get('/audit-logs', authenticateToken, requireRoles('admin'), (req, res) => {
  const { entity, action, page = 1, limit = 50 } = req.query;
  let logs = db.getAll('audit_logs');

  if (entity) {
    logs = logs.filter(l => l.entity === entity);
  }
  if (action) {
    logs = logs.filter(l => l.action === action);
  }

  logs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = logs.length;
  const p = Math.max(1, parseInt(page, 10));
  const l = Math.max(1, parseInt(limit, 10));
  const paginated = logs.slice((p - 1) * l, p * l);

  res.json({
    logs: paginated,
    total,
    page: p,
    limit: l,
    pages: Math.ceil(total / l)
  });
});

export default router;
