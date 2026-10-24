const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Helper: Notify admins about work log changes
function notifyAdmins(senderId, title, message, type = 'info') {
  const admins = db.prepare('SELECT id FROM users WHERE role = ?').all('admin');
  for (const admin of admins) {
    db.prepare(`
      INSERT INTO notifications (sender_id, recipient_id, title, message, type, is_global)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(senderId, admin.id, title, message, type);
  }
}

// Get work logs for current user (with optional date range)
router.get('/', (req, res) => {
  const { startDate, endDate, status } = req.query;
  let query = 'SELECT * FROM work_logs WHERE user_id = ?';
  const params = [req.user.id];

  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY date DESC, created_at DESC';

  const logs = db.prepare(query).all(...params);
  res.json(logs);
});

// Get single work log
router.get('/:id', (req, res) => {
  const log = db.prepare('SELECT * FROM work_logs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!log) {
    return res.status(404).json({ error: 'Work log not found' });
  }
  res.json(log);
});

// Create work log
router.post('/', (req, res) => {
  const { date, hours, task, description } = req.body;

  if (!date || !hours || !task) {
    return res.status(400).json({ error: 'Date, hours, and task are required' });
  }

  if (hours <= 0 || hours > 24) {
    return res.status(400).json({ error: 'Hours must be between 0 and 24' });
  }

  // Check if log already exists for this date
  const existing = db.prepare('SELECT * FROM work_logs WHERE user_id = ? AND date = ?').get(req.user.id, date);
  if (existing) {
    return res.status(400).json({ error: 'Work log for this date already exists. Use PUT to update.' });
  }

  const result = db.prepare(
    'INSERT INTO work_logs (user_id, date, hours, task, description) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, date, hours, task, description || '');

  const log = db.prepare('SELECT * FROM work_logs WHERE id = ?').get(result.lastInsertRowid);
  
  // Notify admins
  if (req.user.role === 'staff') {
    notifyAdmins(req.user.id, 'New Work Log Submitted', `${req.user.name} logged ${hours}h for "${task}" on ${date}`, 'info');
  }

  res.status(201).json(log);
});

// Update work log (only if pending)
router.put('/:id', (req, res) => {
  const { hours, task, description } = req.body;

  const log = db.prepare('SELECT * FROM work_logs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!log) {
    return res.status(404).json({ error: 'Work log not found' });
  }

  if (log.status !== 'pending') {
    return res.status(400).json({ error: 'Can only edit pending logs' });
  }

  if (hours !== undefined && (hours <= 0 || hours > 24)) {
    return res.status(400).json({ error: 'Hours must be between 0 and 24' });
  }

  db.prepare(
    'UPDATE work_logs SET hours = ?, task = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(hours || log.hours, task || log.task, description !== undefined ? description : log.description, req.params.id);

  const updated = db.prepare('SELECT * FROM work_logs WHERE id = ?').get(req.params.id);
  
  // Notify admins
  if (req.user.role === 'staff') {
    notifyAdmins(req.user.id, 'Work Log Updated', `${req.user.name} updated their work log for ${date} (${hours || log.hours}h: ${task || log.task})`, 'info');
  }

  res.json(updated);
});

// Delete work log (only if pending)
router.delete('/:id', (req, res) => {
  const log = db.prepare('SELECT * FROM work_logs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!log) {
    return res.status(404).json({ error: 'Work log not found' });
  }

  if (log.status !== 'pending') {
    return res.status(400).json({ error: 'Can only delete pending logs' });
  }

  db.prepare('DELETE FROM work_logs WHERE id = ?').run(req.params.id);
  
  // Notify admins
  if (req.user.role === 'staff') {
    notifyAdmins(req.user.id, 'Work Log Deleted', `${req.user.name} deleted their work log for ${log.date} (${log.hours}h: ${log.task})`, 'warning');
  }

  res.json({ message: 'Work log deleted' });
});

module.exports = router;