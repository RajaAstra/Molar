'use strict';

const express = require('express');
const path = require('path');
const multer = require('multer');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// File upload configuration
// Images are stored under backend/uploads/ and served statically.
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `oral-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are accepted'));
    }
  },
});

// ---------------------------------------------------------------------------
// POST /api/screenings
// Patient submits a new screening.
// Accepts multipart/form-data with optional "image" file field.
// ---------------------------------------------------------------------------
router.post('/', requireAuth, requireRole('patient'), upload.single('image'), (req, res) => {
  const { risk_factors, symptoms, symptom_duration, notes } = req.body;

  // Parse JSON fields if sent as strings (multipart sends everything as text)
  let parsedRisk = {};
  let parsedSymptoms = [];

  try {
    parsedRisk = risk_factors ? JSON.parse(risk_factors) : {};
  } catch {
    return res.status(400).json({ error: 'risk_factors must be valid JSON' });
  }
  try {
    parsedSymptoms = symptoms ? JSON.parse(symptoms) : [];
  } catch {
    return res.status(400).json({ error: 'symptoms must be valid JSON array' });
  }

  if (!Array.isArray(parsedSymptoms)) {
    return res.status(400).json({ error: 'symptoms must be a JSON array' });
  }

  const imagePath = req.file ? req.file.filename : null;

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO screenings
         (patient_id, risk_factors, symptoms, symptom_duration, notes, image_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      req.user.id,
      JSON.stringify(parsedRisk),
      JSON.stringify(parsedSymptoms),
      symptom_duration || null,
      notes || null,
      imagePath,
    );

  const screening = db
    .prepare('SELECT * FROM screenings WHERE id = ?')
    .get(result.lastInsertRowid);

  return res.status(201).json({ screening: formatScreening(screening) });
});

// ---------------------------------------------------------------------------
// GET /api/screenings
// Patient: returns their own screenings.
// Dentist: returns all submitted screenings (case list).
// ---------------------------------------------------------------------------
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  let rows;

  if (req.user.role === 'patient') {
    rows = db
      .prepare(
        `SELECT s.*, u.name AS patient_name
         FROM screenings s
         JOIN users u ON s.patient_id = u.id
         WHERE s.patient_id = ?
         ORDER BY s.created_at DESC`,
      )
      .all(req.user.id);
  } else {
    // Dentist sees all cases
    rows = db
      .prepare(
        `SELECT s.*, u.name AS patient_name, u.email AS patient_email
         FROM screenings s
         JOIN users u ON s.patient_id = u.id
         ORDER BY s.created_at DESC`,
      )
      .all();
  }

  return res.json({ screenings: rows.map(formatScreening) });
});

// ---------------------------------------------------------------------------
// GET /api/screenings/:id
// Patient: own screening only. Dentist: any.
// ---------------------------------------------------------------------------
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.*, u.name AS patient_name, u.email AS patient_email
       FROM screenings s
       JOIN users u ON s.patient_id = u.id
       WHERE s.id = ?`,
    )
    .get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Screening not found' });

  if (req.user.role === 'patient' && row.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  return res.json({ screening: formatScreening(row) });
});

// ---------------------------------------------------------------------------
// PATCH /api/screenings/:id/status
// Dentist only — update status and optionally add a review note.
// Body: { status, dentist_note }
// ---------------------------------------------------------------------------
router.patch('/:id/status', requireAuth, requireRole('dentist'), (req, res) => {
  const { status, dentist_note } = req.body;
  const allowed = ['submitted', 'under_review', 'reviewed', 'closed'];

  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM screenings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Screening not found' });

  db.prepare(
    `UPDATE screenings
     SET status = ?, dentist_note = ?, reviewed_by = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE id = ?`,
  ).run(status, dentist_note || null, req.user.id, req.params.id);

  const updated = db
    .prepare(
      `SELECT s.*, u.name AS patient_name, u.email AS patient_email
       FROM screenings s
       JOIN users u ON s.patient_id = u.id
       WHERE s.id = ?`,
    )
    .get(req.params.id);

  return res.json({ screening: formatScreening(updated) });
});

// ---------------------------------------------------------------------------
// Helper: parse JSON columns back to objects/arrays before sending
// ---------------------------------------------------------------------------
function formatScreening(row) {
  if (!row) return null;
  return {
    ...row,
    risk_factors: tryParse(row.risk_factors, {}),
    symptoms: tryParse(row.symptoms, []),
  };
}

function tryParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

module.exports = router;
