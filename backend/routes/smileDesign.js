'use strict';

const express = require('express');
const path = require('path');
const multer = require('multer');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const statuses = ['draft', 'review', 'approved', 'archived'];

const storage = multer.diskStorage({
  destination(_req, _file, cb) { cb(null, path.join(__dirname, '..', 'uploads')); },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `design-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    return cb(new Error('Only JPEG, PNG, and WebP images are accepted'));
  },
});

function jsonArray(value, field) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    const error = new Error(`${field} must be a JSON array`);
    error.status = 400;
    throw error;
  }
}

function format(row) {
  if (!row) return null;
  return {
    ...row,
    treatment_plan: jsonArray(row.treatment_plan, 'treatment_plan'),
    annotations: jsonArray(row.annotations, 'annotations'),
  };
}

function verifyCase(db, patientId, screeningId) {
  if (!screeningId) return;
  const screening = db.prepare('SELECT id FROM screenings WHERE id = ? AND patient_id = ?').get(screeningId, patientId);
  if (!screening) {
    const error = new Error('Screening does not belong to this patient');
    error.status = 400;
    throw error;
  }
}

// Dentist creates a real proposal. The simulated image is supplied by the
// clinician; MOLAR never presents a synthetic image as a clinical prediction.
router.post('/', requireAuth, requireRole('dentist'), upload.fields([
  { name: 'original_image', maxCount: 1 },
  { name: 'simulated_image', maxCount: 1 },
]), (req, res, next) => {
  try {
    const { patient_id, screening_id, notes, patient_summary, status = 'draft' } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });
    if (!statuses.includes(status)) return res.status(400).json({ error: 'Invalid smile design status' });
    const db = getDb();
    const patient = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'patient'").get(Number(patient_id));
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    verifyCase(db, patient.id, screening_id ? Number(screening_id) : null);
    const plan = jsonArray(req.body.treatment_plan, 'treatment_plan');
    const annotations = jsonArray(req.body.annotations, 'annotations');
    const result = db.prepare(`INSERT INTO smile_designs
      (patient_id, dentist_id, screening_id, original_image_path, simulated_image_path, treatment_plan, annotations, notes, patient_summary, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      patient.id, req.user.id, screening_id ? Number(screening_id) : null,
      req.files?.original_image?.[0]?.filename || null,
      req.files?.simulated_image?.[0]?.filename || null,
      JSON.stringify(plan), JSON.stringify(annotations), notes || null, patient_summary || null, status,
    );
    return res.status(201).json({ smile_design: format(db.prepare('SELECT * FROM smile_designs WHERE id = ?').get(result.lastInsertRowid)) });
  } catch (error) { return next(error); }
});

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  if (req.user.role === 'patient') {
    const rows = db.prepare(`SELECT sd.*, u.name AS dentist_name FROM smile_designs sd JOIN users u ON u.id = sd.dentist_id
      WHERE sd.patient_id = ? AND sd.status = 'approved' ORDER BY sd.updated_at DESC`).all(req.user.id);
    return res.json({ smile_designs: rows.map(format) });
  }
  let query = `SELECT sd.*, u.name AS patient_name FROM smile_designs sd JOIN users u ON u.id = sd.patient_id WHERE sd.dentist_id = ?`;
  const params = [req.user.id];
  if (req.query.patient_id) { query += ' AND sd.patient_id = ?'; params.push(Number(req.query.patient_id)); }
  if (req.query.screening_id) { query += ' AND sd.screening_id = ?'; params.push(Number(req.query.screening_id)); }
  query += ' ORDER BY sd.updated_at DESC';
  return res.json({ smile_designs: db.prepare(query).all(...params).map(format) });
});

router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const row = db.prepare(`SELECT sd.*, p.name AS patient_name, d.name AS dentist_name FROM smile_designs sd
    JOIN users p ON p.id = sd.patient_id JOIN users d ON d.id = sd.dentist_id WHERE sd.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Smile design not found' });
  if (req.user.role === 'patient' && (row.patient_id !== req.user.id || row.status !== 'approved')) return res.status(403).json({ error: 'Access denied' });
  if (req.user.role === 'dentist' && row.dentist_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  return res.json({ smile_design: format(row) });
});

router.patch('/:id', requireAuth, requireRole('dentist'), (req, res, next) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM smile_designs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Smile design not found' });
    if (existing.dentist_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    const plan = req.body.treatment_plan === undefined ? existing.treatment_plan : JSON.stringify(jsonArray(req.body.treatment_plan, 'treatment_plan'));
    const annotations = req.body.annotations === undefined ? existing.annotations : JSON.stringify(jsonArray(req.body.annotations, 'annotations'));
    db.prepare(`UPDATE smile_designs SET treatment_plan = ?, annotations = ?, notes = ?, patient_summary = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`).run(
      plan, annotations, req.body.notes ?? existing.notes, req.body.patient_summary ?? existing.patient_summary, existing.id,
    );
    return res.json({ smile_design: format(db.prepare('SELECT * FROM smile_designs WHERE id = ?').get(existing.id)) });
  } catch (error) { return next(error); }
});

router.patch('/:id/status', requireAuth, requireRole('dentist'), (req, res) => {
  const { status } = req.body;
  if (!statuses.includes(status)) return res.status(400).json({ error: 'Invalid smile design status' });
  const db = getDb();
  const existing = db.prepare('SELECT * FROM smile_designs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Smile design not found' });
  if (existing.dentist_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  db.prepare("UPDATE smile_designs SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?").run(status, existing.id);
  return res.json({ smile_design: format(db.prepare('SELECT * FROM smile_designs WHERE id = ?').get(existing.id)) });
});

module.exports = router;
