'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { signToken } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/auth/register
// Body: { name, email, password, role }
// ---------------------------------------------------------------------------
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validate input
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!role || !['patient', 'dentist'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "patient" or "dentist"' });
  }

  const db = getDb();

  // Check for duplicate email
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  // Hash password — cost factor 12 is reasonable for a hackathon demo
  const hashed = await bcrypt.hash(password, 12);

  const result = db
    .prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
    .run(name.trim(), email.toLowerCase().trim(), hashed, role);

  const user = { id: result.lastInsertRowid, email: email.toLowerCase().trim(), role };
  const token = await signToken(user);

  return res.status(201).json({
    token,
    user: { id: user.id, name: name.trim(), email: user.email, role },
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// Body: { email, password }
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  const user = db
    .prepare('SELECT id, name, email, password, role FROM users WHERE email = ?')
    .get(email.toLowerCase().trim());

  // Use a constant-time comparison to avoid timing attacks
  const valid = user ? await bcrypt.compare(password, user.password) : false;

  if (!user || !valid) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  const token = await signToken({ id: user.id, email: user.email, role: user.role });

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me  — return current user from token
// ---------------------------------------------------------------------------
const { requireAuth } = require('../middleware/auth');

router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const user = db
    .prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?')
    .get(req.user.id);

  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user });
});

module.exports = router;
