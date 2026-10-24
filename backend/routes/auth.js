const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: 'Name and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
});

// Register (admin only - for creating staff accounts)
router.post('/register', (req, res) => {
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

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)')
    .run(email, hashedPassword, name, role);

  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user);

  res.status(201).json({ token, user });
});

// Get current user
router.get('/me', (req, res) => {
  // This will be protected by authenticateToken middleware
  res.json({ user: req.user });
});

module.exports = router;