'use strict';

/**
 * /api/tooth-scans
 *
 * Intraoral image upload and prototype scan workflow.
 *
 * PROTOTYPE NOTE: No real computer-vision model is used.
 * The API accepts an image and returns deterministic "detected region"
 * metadata clearly labeled as prototype output. The architecture is
 * designed to accept a real CV model later.
 *
 * DO NOT claim clinical accuracy for detected regions.
 */

const express = require('express');
const path = require('path');
const multer = require('multer');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// File upload configuration
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `scan-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
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
// Prototype region detection
// Returns deterministic placeholder regions — clearly NOT a real CV result.
// Real integration point: replace this function with a call to a CV service.
// ---------------------------------------------------------------------------
function generatePrototypeRegions(filename) {
  // Deterministic seed based on filename hash
  let seed = 0;
  for (let i = 0; i < filename.length; i++) seed = (seed * 31 + filename.charCodeAt(i)) & 0xffff;

  const regions = [];
  // Typical intraoral views show 4-6 visible teeth
  const toothCount = 4 + (seed % 3);
  // Start from a plausible tooth number range
  const startTooth = 21 + (seed % 4);

  for (let i = 0; i < toothCount; i++) {
    const toothNum = startTooth + i;
    if (toothNum > 28) break;
    // Pseudo-random bounding box within image (as percentage)
    const x = 10 + (i * 16) + (seed % 5);
    const y = 30 + (seed % 15);
    const w = 12 + (seed % 4);
    const h = 35 + (seed % 10);
    regions.push({
      tooth_number: toothNum,
      bbox_percent: { x, y, w, h },
      confidence: 0, // Always 0 — explicitly not a real detection
      prototype: true,
      label: `Tooth ${toothNum} — prototype region`,
    });
  }

  return regions;
}

// ---------------------------------------------------------------------------
// POST /api/tooth-scans
// Dentist or patient uploads an intraoral image for scanning.
// ---------------------------------------------------------------------------
router.post('/', requireAuth, upload.single('image'), (req, res) => {
  const { patient_id, screening_id, notes } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'An intraoral image is required' });
  }

  // For patients: use own ID. For dentists: patient_id is required.
  let resolvedPatientId;
  if (req.user.role === 'patient') {
    resolvedPatientId = req.user.id;
  } else {
    if (!patient_id) return res.status(400).json({ error: 'patient_id is required for dentist uploads' });
    resolvedPatientId = Number(patient_id);
  }

  const db = getDb();

  // Verify patient exists
  const patient = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'patient'").get(resolvedPatientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  // Generate prototype detected regions
  const detectedRegions = generatePrototypeRegions(req.file.filename);

  const result = db.prepare(`
    INSERT INTO tooth_scans
      (patient_id, dentist_id, screening_id, image_path, detected_regions, status, notes)
    VALUES (?, ?, ?, ?, ?, 'analyzed', ?)
  `).run(
    resolvedPatientId,
    req.user.role === 'dentist' ? req.user.id : null,
    screening_id ? Number(screening_id) : null,
    req.file.filename,
    JSON.stringify(detectedRegions),
    notes || null,
  );

  const scan = db.prepare('SELECT * FROM tooth_scans WHERE id = ?').get(result.lastInsertRowid);

  return res.status(201).json({
    scan: format(scan),
    disclaimer: 'PROTOTYPE SCAN — Detected regions are NOT real computer vision output. This is a prototype architecture placeholder. No clinical interpretation should be derived from these regions.',
  });
});

// ---------------------------------------------------------------------------
// GET /api/tooth-scans
// Patient: own scans. Dentist: scans they uploaded or for their patients.
// ---------------------------------------------------------------------------
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { patient_id, screening_id } = req.query;

  let rows;
  if (req.user.role === 'patient') {
    rows = db.prepare(`
      SELECT * FROM tooth_scans
      WHERE patient_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);
  } else {
    let q = 'SELECT ts.*, u.name AS patient_name FROM tooth_scans ts JOIN users u ON ts.patient_id = u.id WHERE ts.dentist_id = ?';
    const params = [req.user.id];
    if (patient_id) { q += ' AND ts.patient_id = ?'; params.push(Number(patient_id)); }
    if (screening_id) { q += ' AND ts.screening_id = ?'; params.push(Number(screening_id)); }
    q += ' ORDER BY ts.created_at DESC';
    rows = db.prepare(q).all(...params);
  }

  return res.json({ scans: rows.map(format) });
});

// ---------------------------------------------------------------------------
// GET /api/tooth-scans/:id
// ---------------------------------------------------------------------------
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tooth_scans WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Scan not found' });

    if (req.user.role === 'patient' && row.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (req.user.role === 'dentist' && row.dentist_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  return res.json({
    scan: format(row),
    disclaimer: 'PROTOTYPE SCAN — Detected regions are NOT real computer vision output.',
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/tooth-scans/:id/review
// Dentist marks scan as reviewed.
// ---------------------------------------------------------------------------
router.patch('/:id/review', requireAuth, requireRole('dentist'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tooth_scans WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Scan not found' });
  if (existing.dentist_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  db.prepare(`
    UPDATE tooth_scans
    SET status = 'reviewed', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    WHERE id = ?
  `).run(req.params.id);

  const updated = db.prepare('SELECT * FROM tooth_scans WHERE id = ?').get(req.params.id);
  return res.json({ scan: format(updated) });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function format(row) {
  if (!row) return null;
  return {
    ...row,
    detected_regions: tryParse(row.detected_regions, []),
  };
}

function tryParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

module.exports = router;
