const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get notifications for current user (includes global notifications)
router.get('/', (req, res) => {
  const { unreadOnly, limit } = req.query;
  
  let query = `
    SELECT n.*, u.name as sender_name
    FROM notifications n
    LEFT JOIN users u ON n.sender_id = u.id
    WHERE (n.recipient_id = ? OR n.is_global = 1)
  `;
  const params = [req.user.id];

  if (unreadOnly === 'true') {
    query += ' AND n.is_read = 0';
  }

  query += ' ORDER BY n.created_at DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit));
  }

  const notifications = db.prepare(query).all(...params);
  res.json(notifications);
});

// Get unread count
router.get('/unread-count', (req, res) => {
  const count = db.prepare(`
    SELECT COUNT(*) as count
    FROM notifications
    WHERE (recipient_id = ? OR is_global = 1) AND is_read = 0
  `).get(req.user.id);
  res.json(count);
});

// Mark notification as read
router.patch('/:id/read', (req, res) => {
  const notification = db.prepare(`
    SELECT * FROM notifications WHERE id = ? AND (recipient_id = ? OR is_global = 1)
  `).get(req.params.id, req.user.id);

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Marked as read' });
});

// Mark all as read
router.patch('/read-all', (req, res) => {
  db.prepare(`
    UPDATE notifications SET is_read = 1 
    WHERE (recipient_id = ? OR is_global = 1) AND is_read = 0
  `).run(req.user.id);
  res.json({ message: 'All marked as read' });
});

// Create notification (staff can send to admin, admin can send to all or specific user)
router.post('/', (req, res) => {
  const { recipientId, title, message, type, isGlobal } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message required' });
  }

  // Staff can only send to admins (recipientId must be admin or isGlobal=false with admin recipient)
  // Admin can send to anyone or global
  if (req.user.role === 'staff') {
    if (isGlobal) {
      return res.status(403).json({ error: 'Staff cannot send global notifications' });
    }
    // Verify recipient is admin
    const recipient = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(recipientId, 'admin');
    if (!recipient) {
      return res.status(403).json({ error: 'Staff can only send notifications to admins' });
    }
  }

  const result = db.prepare(`
    INSERT INTO notifications (sender_id, recipient_id, title, message, type, is_global)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, recipientId || null, title, message, type || 'info', isGlobal ? 1 : 0);

  const notification = db.prepare(`
    SELECT n.*, u.name as sender_name
    FROM notifications n
    LEFT JOIN users u ON n.sender_id = u.id
    WHERE n.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(notification);
});

// Admin: Get all users for notification recipient dropdown
router.get('/users', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const users = db.prepare('SELECT id, name, email, role FROM users WHERE id != ? ORDER BY name').all(req.user.id);
  res.json(users);
});

module.exports = router;