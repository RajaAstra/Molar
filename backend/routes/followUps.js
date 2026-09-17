'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/follow-ups
// Dentist creates a follow-up task for a patient.
// Body: { patient_id, plan_id?, task, due_date }
// ---------------------------------------------------------------------------
router.post('/', requireAuth, requireRole('dentist'), (req, res) => {
  const { patient_id, plan_id, task, due_date } = req.body;

  if (!patient_id || !Number.isInteger(Number(patient_id))) {
    return res.status(400).json({ error: 'patient_id is required' });
  }
  if (!task || task.trim().length < 3) {
    return res.status(400).json({ error: 'task must be at least 3 characters' });
  }

  const db = getDb();

  const patient = db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'patient'")
    .get(Number(patient_id));
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const result = db
    .prepare(
      `INSERT INTO follow_ups (patient_id, dentist_id, plan_id, task, due_date)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(Number(patient_id), req.user.id, plan_id ? Number(plan_id) : null, task.trim(), due_date || null);

  const followUp = db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json({ followUp });
});

// ---------------------------------------------------------------------------
// GET /api/follow-ups
// Patient: their own. Dentist: ones they created.
// ---------------------------------------------------------------------------
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  let rows;

  if (req.user.role === 'patient') {
    rows = db
      .prepare(
        `SELECT f.*, u.name AS dentist_name
         FROM follow_ups f
         LEFT JOIN users u ON f.dentist_id = u.id
         WHERE f.patient_id = ?
         ORDER BY f.due_date ASC, f.created_at DESC`,
      )
      .all(req.user.id);
  } else {
    rows = db
      .prepare(
        `SELECT f.*, u.name AS patient_name
         FROM follow_ups f
         JOIN users u ON f.patient_id = u.id
         WHERE f.dentist_id = ?
         ORDER BY f.due_date ASC, f.created_at DESC`,
      )
      .all(req.user.id);
  }

  return res.json({ followUps: rows });
});

// ---------------------------------------------------------------------------
// PATCH /api/follow-ups/:id/status
// Patient or dentist can mark a follow-up completed/missed/pending.
// ---------------------------------------------------------------------------
router.patch('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'completed', 'missed'];

  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Follow-up not found' });

  // Patient can only update their own; dentist can only update ones they created
  if (req.user.role === 'patient' && existing.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (req.user.role === 'dentist' && existing.dentist_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.prepare(
    `UPDATE follow_ups
     SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE id = ?`,
  ).run(status, req.params.id);

  const updated = db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(req.params.id);
  return res.json({ followUp: updated });
});

module.exports = router;
