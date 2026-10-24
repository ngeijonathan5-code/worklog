const express = require('express');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin role
router.use(authenticateToken, requireAdmin);

// Get all users
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// Create new user (staff or admin)
router.post('/users', (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'All fields required' });
  }

  if (!['staff', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)')
    .run(email, hashedPassword, name, role);

  const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(user);
});

// Update user
router.put('/users/:id', (req, res) => {
  const { name, role } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent self-demotion
  if (parseInt(req.params.id) === req.user.id && role === 'staff') {
    return res.status(400).json({ error: 'Cannot change your own role to staff' });
  }

  if (role && !['staff', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  db.prepare('UPDATE users SET name = ?, role = ? WHERE id = ?').run(name || user.name, role || user.role, req.params.id);
  const updated = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete user (prevent self-delete)
router.delete('/users/:id', (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

// Get all work logs (with filters)
router.get('/worklogs', (req, res) => {
  const { userId, startDate, endDate, status } = req.query;
  let query = `
    SELECT wl.*, u.name as user_name, u.email as user_email
    FROM work_logs wl
    JOIN users u ON wl.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (userId) {
    query += ' AND wl.user_id = ?';
    params.push(userId);
  }
  if (startDate) {
    query += ' AND wl.date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND wl.date <= ?';
    params.push(endDate);
  }
  if (status) {
    query += ' AND wl.status = ?';
    params.push(status);
  }

  query += ' ORDER BY wl.date DESC, wl.created_at DESC';

  const logs = db.prepare(query).all(...params);
  res.json(logs);
});

// Approve/reject work log
router.patch('/worklogs/:id/status', (req, res) => {
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const log = db.prepare('SELECT * FROM work_logs WHERE id = ?').get(req.params.id);
  if (!log) {
    return res.status(404).json({ error: 'Work log not found' });
  }

  db.prepare('UPDATE work_logs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  const updated = db.prepare(`
    SELECT wl.*, u.name as user_name, u.email as user_email
    FROM work_logs wl
    JOIN users u ON wl.user_id = u.id
    WHERE wl.id = ?
  `).get(req.params.id);

  res.json(updated);
});

// Get statistics
router.get('/stats', (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateFilter = '';
  const params = [];
  if (startDate) {
    dateFilter += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND date <= ?';
    params.push(endDate);
  }

  // Total hours by user
  const hoursByUser = db.prepare(`
    SELECT u.name, u.email, SUM(wl.hours) as total_hours, COUNT(wl.id) as log_count
    FROM work_logs wl
    JOIN users u ON wl.user_id = u.id
    WHERE wl.status = 'approved' ${dateFilter}
    GROUP BY u.id
    ORDER BY total_hours DESC
  `).all(...params);

  // Hours by date
  const hoursByDate = db.prepare(`
    SELECT date, SUM(hours) as total_hours
    FROM work_logs
    WHERE status = 'approved' ${dateFilter}
    GROUP BY date
    ORDER BY date
  `).all(...params);

  // Pending count
  const pendingCount = db.prepare(`
    SELECT COUNT(*) as count FROM work_logs WHERE status = 'pending'
  `).get();

  // Status breakdown
  const statusBreakdown = db.prepare(`
    SELECT status, COUNT(*) as count FROM work_logs GROUP BY status
  `).all();

  res.json({
    hoursByUser,
    hoursByDate,
    pendingCount: pendingCount.count,
    statusBreakdown
  });
});

// Export data as CSV
router.get('/export', (req, res) => {
  const { startDate, endDate } = req.query;
  
  let query = `
    SELECT wl.date, u.name as user_name, u.email as user_email, wl.hours, wl.task, wl.description, wl.status
    FROM work_logs wl
    JOIN users u ON wl.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (startDate) {
    query += ' AND wl.date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND wl.date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY wl.date DESC';

  const logs = db.prepare(query).all(...params);

  // Convert to CSV
  const headers = ['Date', 'User Name', 'User Email', 'Hours', 'Task', 'Description', 'Status'];
  const rows = logs.map(log => [
    log.date,
    log.user_name,
    log.user_email,
    log.hours,
    log.task,
    log.description || '',
    log.status
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=worklogs-export.csv');
  res.send(csv);
});

module.exports = router;