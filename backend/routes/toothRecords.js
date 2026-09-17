'use strict';

/**
 * /api/tooth-records
 *
 * Reusable tooth record management.
 * Used by: tooth scan, voice charting, clinical history, treatment planning.
 *
 * Authorization:
 *   - Patient: read own records only
 *   - Dentist: read/write for records they created
 */

const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function format(row) {
  if (!row) return null;
  return {
    ...row,
    bleeding: row.bleeding === 1,
    observations: tryParse(row.observations, []),
  };
}

function tryParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// ---------------------------------------------------------------------------
// POST /api/tooth-records
// Dentist creates a new tooth record.
// ---------------------------------------------------------------------------
router.post('/', requireAuth, requireRole('dentist'), (req, res) => {
  const {
    patient_id, screening_id, tooth_number,
    source, mesial_mm, middle_mm, distal_mm,
    bleeding, mobility, furcation,
    observations, treatment_status,
    dentist_notes, raw_transcript, image_path,
  } = req.body;

  if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });
  if (!tooth_number || tooth_number < 11 || tooth_number > 48) {
    return res.status(400).json({ error: 'tooth_number must be between 11 and 48' });
  }

  const db = getDb();

  // Verify patient exists
  const patient = db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'patient'")
    .get(Number(patient_id));
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const result = db.prepare(`
    INSERT INTO tooth_records
      (patient_id, dentist_id, screening_id, tooth_number,
       source, mesial_mm, middle_mm, distal_mm, bleeding,
       mobility, furcation, observations, treatment_status,
       dentist_notes, raw_transcript, image_path)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    Number(patient_id),
    req.user.id,
    screening_id ? Number(screening_id) : null,
    Number(tooth_number),
    source || 'manual',
    mesial_mm != null ? Number(mesial_mm) : null,
    middle_mm != null ? Number(middle_mm) : null,
    distal_mm != null ? Number(distal_mm) : null,
    bleeding ? 1 : 0,
    mobility || null,
    furcation || null,
    JSON.stringify(Array.isArray(observations) ? observations : []),
    treatment_status || 'none',
    dentist_notes || null,
    raw_transcript || null,
    image_path || null,
  );

  const record = db.prepare('SELECT * FROM tooth_records WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json({ record: format(record) });
});

// ---------------------------------------------------------------------------
// GET /api/tooth-records
// Patient: own confirmed records.
// Dentist: records they created, optionally filtered by patient_id/screening_id.
// ---------------------------------------------------------------------------
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { patient_id, screening_id } = req.query;

  let rows;
  if (req.user.role === 'patient') {
    rows = db.prepare(`
      SELECT tr.*, u.name AS dentist_name
      FROM tooth_records tr
      LEFT JOIN users u ON tr.dentist_id = u.id
      WHERE tr.patient_id = ? AND tr.confirmation_status = 'confirmed'
      ORDER BY tr.tooth_number, tr.created_at DESC
    `).all(req.user.id);
  } else {
    let q = `SELECT tr.*, u.name AS patient_name
             FROM tooth_records tr
             JOIN users u ON tr.patient_id = u.id
             WHERE tr.dentist_id = ?`;
    const params = [req.user.id];
    if (patient_id) { q += ' AND tr.patient_id = ?'; params.push(Number(patient_id)); }
    if (screening_id) { q += ' AND tr.screening_id = ?'; params.push(Number(screening_id)); }
    q += ' ORDER BY tr.tooth_number, tr.created_at DESC';
    rows = db.prepare(q).all(...params);
  }

  return res.json({ records: rows.map(format) });
});

// ---------------------------------------------------------------------------
// GET /api/tooth-records/:id
// ---------------------------------------------------------------------------
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tooth_records WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Record not found' });

  if (req.user.role === 'patient' && row.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (req.user.role === 'dentist' && row.dentist_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  return res.json({ record: format(row) });
});

// ---------------------------------------------------------------------------
// PATCH /api/tooth-records/:id
// Dentist updates a pending record (before confirmation).
// ---------------------------------------------------------------------------
router.patch('/:id', requireAuth, requireRole('dentist'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tooth_records WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Record not found' });
  if (existing.dentist_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (existing.confirmation_status === 'confirmed') {
    return res.status(409).json({ error: 'Confirmed records cannot be edited. Use correct endpoint.' });
  }

  const {
    mesial_mm, middle_mm, distal_mm, bleeding,
    mobility, furcation, observations, treatment_status,
    dentist_notes,
  } = req.body;

  db.prepare(`
    UPDATE tooth_records SET
      mesial_mm = ?, middle_mm = ?, distal_mm = ?,
      bleeding = ?, mobility = ?, furcation = ?,
      observations = ?, treatment_status = ?,
      dentist_notes = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    WHERE id = ?
  `).run(
    mesial_mm != null ? Number(mesial_mm) : existing.mesial_mm,
    middle_mm != null ? Number(middle_mm) : existing.middle_mm,
    distal_mm != null ? Number(distal_mm) : existing.distal_mm,
    bleeding != null ? (bleeding ? 1 : 0) : existing.bleeding,
    mobility !== undefined ? mobility : existing.mobility,
    furcation !== undefined ? furcation : existing.furcation,
    observations !== undefined ? JSON.stringify(Array.isArray(observations) ? observations : []) : existing.observations,
    treatment_status || existing.treatment_status,
    dentist_notes !== undefined ? dentist_notes : existing.dentist_notes,
    req.params.id,
  );

  const updated = db.prepare('SELECT * FROM tooth_records WHERE id = ?').get(req.params.id);
  return res.json({ record: format(updated) });
});

// ---------------------------------------------------------------------------
// PATCH /api/tooth-records/:id/confirm
// Dentist confirms a pending record.
// ---------------------------------------------------------------------------
router.patch('/:id/confirm', requireAuth, requireRole('dentist'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tooth_records WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Record not found' });
  if (existing.dentist_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (existing.confirmation_status === 'confirmed') {
    return res.status(409).json({ error: 'Record already confirmed' });
  }

  db.prepare(`
    UPDATE tooth_records
    SET confirmation_status = 'confirmed',
        updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    WHERE id = ?
  `).run(req.params.id);

  const updated = db.prepare('SELECT * FROM tooth_records WHERE id = ?').get(req.params.id);
  return res.json({ record: format(updated) });
});

module.exports = router;
