'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { parseClinicalVoice } = require('../periodontalParser');

const router = express.Router();
const allowedTypes = ['pocket_depth', 'recession', 'bleeding', 'mobility', 'furcation'];

function format(row) {
  return row ? { ...row, case_id: row.screening_id, corrected: Boolean(row.corrected) } : null;
}

function patientExists(db, patientId) {
  return db.prepare("SELECT id FROM users WHERE id = ? AND role = 'patient'").get(Number(patientId));
}

router.post('/parse', requireAuth, requireRole('dentist'), (req, res) => {
  if (!req.body.transcript || typeof req.body.transcript !== 'string') return res.status(400).json({ error: 'transcript is required' });
  return res.json(parseClinicalVoice(req.body.transcript));
});

router.post('/', requireAuth, requireRole('dentist'), (req, res) => {
  const data = req.body;
  if (!data.patient_id) return res.status(400).json({ error: 'patient_id is required' });
  if (!allowedTypes.includes(data.measurement_type)) return res.status(400).json({ error: 'Invalid measurement_type' });
  const numeric = data.measurement_type !== 'bleeding';
  if (numeric && (!Number.isFinite(Number(data.value)) || Number(data.value) < 0 || Number(data.value) > 20)) return res.status(400).json({ error: 'value must be between 0 and 20' });
  if (data.measurement_type === 'bleeding' && ![0, 1, true, false].includes(data.value)) return res.status(400).json({ error: 'bleeding value must be true or false' });
  const db = getDb();
  if (!patientExists(db, data.patient_id)) return res.status(404).json({ error: 'Patient not found' });
  const result = db.prepare(`INSERT INTO voice_clinical_measurements
    (patient_id, dentist_id, screening_id, measurement_type, tooth_identifier, value, unit, site, notes, voice_transcription, confidence_score, corrected, corrects_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`)
    .run(Number(data.patient_id), req.user.id, (data.case_id || data.screening_id) ? Number(data.case_id || data.screening_id) : null,
      data.measurement_type, data.tooth_identifier || null, data.measurement_type === 'bleeding' ? (data.value ? 1 : 0) : Number(data.value),
      data.unit || (data.measurement_type === 'bleeding' ? 'boolean' : 'mm'), data.site || null, data.notes || null,
      data.voice_transcription || null, data.confidence_score ?? null, data.corrects_id || null);
  return res.status(201).json({ measurement: format(db.prepare('SELECT * FROM voice_clinical_measurements WHERE id = ?').get(result.lastInsertRowid)) });
});

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  if (req.user.role === 'patient') {
    const rows = db.prepare(`SELECT v.*, u.name AS dentist_name FROM voice_clinical_measurements v JOIN users u ON u.id = v.dentist_id
      WHERE v.patient_id = ? AND v.corrected = 0 ORDER BY v.created_at DESC`).all(req.user.id);
    return res.json({ measurements: rows.map(format) });
  }
  let query = `SELECT v.*, u.name AS patient_name FROM voice_clinical_measurements v JOIN users u ON u.id = v.patient_id WHERE v.dentist_id = ?`;
  const params = [req.user.id];
  if (req.query.patient_id) { query += ' AND v.patient_id = ?'; params.push(Number(req.query.patient_id)); }
  const caseId = req.query.case_id || req.query.screening_id;
  if (caseId) { query += ' AND v.screening_id = ?'; params.push(Number(caseId)); }
  query += ' ORDER BY v.created_at DESC';
  return res.json({ measurements: db.prepare(query).all(...params).map(format) });
});

// Explicit patient-history endpoint for integrations that do not use query
// parameters. A dentist may only retrieve records they authored; patients
// can only retrieve their own current records.
router.get('/patient/:patientId', requireAuth, (req, res) => {
  const patientId = Number(req.params.patientId);
  if (!Number.isInteger(patientId)) return res.status(400).json({ error: 'Invalid patient ID' });
  if (req.user.role === 'patient' && patientId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  const db = getDb();
  const query = req.user.role === 'dentist'
    ? 'SELECT * FROM voice_clinical_measurements WHERE patient_id = ? AND dentist_id = ? ORDER BY created_at DESC'
    : 'SELECT * FROM voice_clinical_measurements WHERE patient_id = ? AND corrected = 0 ORDER BY created_at DESC';
  const rows = req.user.role === 'dentist' ? db.prepare(query).all(patientId, req.user.id) : db.prepare(query).all(patientId);
  return res.json({ measurements: rows.map(format) });
});

function correctMeasurement(req, res) {
  const db = getDb();
  const original = db.prepare('SELECT * FROM voice_clinical_measurements WHERE id = ?').get(req.params.id);
  if (!original) return res.status(404).json({ error: 'Measurement not found' });
  if (original.dentist_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  const value = req.body.value;
  if (value === undefined || value === null) return res.status(400).json({ error: 'value is required' });
  const nextValue = original.measurement_type === 'bleeding' ? (value ? 1 : 0) : Number(value);
  if (!Number.isFinite(nextValue) || nextValue < 0 || nextValue > 20) return res.status(400).json({ error: 'value must be between 0 and 20' });
  const write = db.transaction(() => {
    db.prepare("UPDATE voice_clinical_measurements SET corrected = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?").run(original.id);
    return db.prepare(`INSERT INTO voice_clinical_measurements
      (patient_id, dentist_id, screening_id, measurement_type, tooth_identifier, value, unit, site, notes, voice_transcription, confidence_score, corrected, corrects_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`)
      .run(original.patient_id, original.dentist_id, original.screening_id, original.measurement_type, original.tooth_identifier,
        nextValue, original.unit, req.body.site ?? original.site, req.body.notes || null, req.body.voice_transcription || null, null, original.id).lastInsertRowid;
  });
  const id = write();
  return res.status(201).json({ measurement: format(db.prepare('SELECT * FROM voice_clinical_measurements WHERE id = ?').get(id)), corrected_measurement_id: original.id });
}

router.post('/:id/correct', requireAuth, requireRole('dentist'), correctMeasurement);

// PUT is an API-friendly alias for a correction. We intentionally create a
// linked row instead of overwriting a clinical finding, preserving audit history.
router.put('/:id', requireAuth, requireRole('dentist'), correctMeasurement);

module.exports = router;
