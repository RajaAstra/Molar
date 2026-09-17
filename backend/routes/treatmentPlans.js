'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/treatment-plans
// Dentist creates a treatment plan for a patient.
// Body: { patient_id, screening_id?, title, explanation, steps, next_appointment }
// ---------------------------------------------------------------------------
router.post('/', requireAuth, requireRole('dentist'), (req, res) => {
  const { patient_id, screening_id, title, explanation, steps, next_appointment } = req.body;

  if (!patient_id || !Number.isInteger(Number(patient_id))) {
    return res.status(400).json({ error: 'patient_id is required' });
  }
  if (!title || title.trim().length < 3) {
    return res.status(400).json({ error: 'title must be at least 3 characters' });
  }
  if (!explanation || explanation.trim().length < 10) {
    return res.status(400).json({ error: 'explanation must be at least 10 characters' });
  }

  let parsedSteps = [];
  try {
    parsedSteps = steps ? (typeof steps === 'string' ? JSON.parse(steps) : steps) : [];
  } catch {
    return res.status(400).json({ error: 'steps must be valid JSON array' });
  }
  if (!Array.isArray(parsedSteps)) {
    return res.status(400).json({ error: 'steps must be an array' });
  }

  const db = getDb();

  // Verify patient exists and has the patient role
  const patient = db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'patient'")
    .get(Number(patient_id));
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const result = db
    .prepare(
      `INSERT INTO treatment_plans
         (patient_id, dentist_id, screening_id, title, explanation, steps, next_appointment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      Number(patient_id),
      req.user.id,
      screening_id ? Number(screening_id) : null,
      title.trim(),
      explanation.trim(),
      JSON.stringify(parsedSteps),
      next_appointment || null,
    );

  // If linked to a screening, mark it as reviewed
  if (screening_id) {
    db.prepare(
      `UPDATE screenings
       SET status = 'reviewed', reviewed_by = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
       WHERE id = ?`,
    ).run(req.user.id, Number(screening_id));
  }

  const plan = db
    .prepare('SELECT * FROM treatment_plans WHERE id = ?')
    .get(result.lastInsertRowid);

  return res.status(201).json({ plan: formatPlan(plan) });
});

// ---------------------------------------------------------------------------
// GET /api/treatment-plans
// Patient: their own plans.
// Dentist: plans they created.
// ---------------------------------------------------------------------------
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  let rows;

  if (req.user.role === 'patient') {
    rows = db
      .prepare(
        `SELECT tp.*, u.name AS dentist_name
         FROM treatment_plans tp
         JOIN users u ON tp.dentist_id = u.id
         WHERE tp.patient_id = ?
         ORDER BY tp.created_at DESC`,
      )
      .all(req.user.id);
  } else {
    rows = db
      .prepare(
        `SELECT tp.*, u.name AS patient_name, u.email AS patient_email
         FROM treatment_plans tp
         JOIN users u ON tp.patient_id = u.id
         WHERE tp.dentist_id = ?
         ORDER BY tp.created_at DESC`,
      )
      .all(req.user.id);
  }

  return res.json({ plans: rows.map(formatPlan) });
});

// ---------------------------------------------------------------------------
// GET /api/treatment-plans/:id
// ---------------------------------------------------------------------------
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT tp.*,
              p.name  AS patient_name, p.email AS patient_email,
              d.name  AS dentist_name
       FROM treatment_plans tp
       JOIN users p ON tp.patient_id = p.id
       JOIN users d ON tp.dentist_id = d.id
       WHERE tp.id = ?`,
    )
    .get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Treatment plan not found' });

  // Patients can only see their own; dentists can see plans they created
  if (req.user.role === 'patient' && row.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (req.user.role === 'dentist' && row.dentist_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  return res.json({ plan: formatPlan(row) });
});

// ---------------------------------------------------------------------------
// PATCH /api/treatment-plans/:id/status
// Dentist only — mark plan active/completed/cancelled.
// ---------------------------------------------------------------------------
router.patch('/:id/status', requireAuth, requireRole('dentist'), (req, res) => {
  const { status } = req.body;
  const allowed = ['active', 'completed', 'cancelled'];

  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  const db = getDb();
  const existing = db
    .prepare('SELECT id, dentist_id FROM treatment_plans WHERE id = ?')
    .get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Treatment plan not found' });
  if (existing.dentist_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.prepare(
    `UPDATE treatment_plans
     SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE id = ?`,
  ).run(status, req.params.id);

  const updated = db.prepare('SELECT * FROM treatment_plans WHERE id = ?').get(req.params.id);
  return res.json({ plan: formatPlan(updated) });
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function formatPlan(row) {
  if (!row) return null;
  return { ...row, steps: tryParse(row.steps, []) };
}

function tryParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

module.exports = router;
