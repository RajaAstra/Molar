'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { parseMeasurement, parseCorrection } = require('../periodontalParser');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/measurements/parse
// Dentist submits a transcript for parsing (before saving).
// Returns parsed data or error — does NOT save to DB.
// ---------------------------------------------------------------------------
router.post('/parse', requireAuth, requireRole('dentist'), (req, res) => {
  const { transcript } = req.body;
  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'transcript is required' });
  }

  const result = parseMeasurement(transcript);
  return res.json(result);
});

// ---------------------------------------------------------------------------
// POST /api/measurements/parse-correction
// Dentist submits a correction transcript for parsing.
// ---------------------------------------------------------------------------
router.post('/parse-correction', requireAuth, requireRole('dentist'), (req, res) => {
  const { transcript } = req.body;
  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'transcript is required' });
  }

  const result = parseCorrection(transcript);
  return res.json(result);
});

// ---------------------------------------------------------------------------
// POST /api/measurements
// Dentist saves a confirmed measurement.
// Body: { patient_id, screening_id?, tooth_number, mesial_mm, middle_mm,
//         distal_mm, bleeding, source, raw_transcript?, notes? }
// ---------------------------------------------------------------------------
router.post('/', requireAuth, requireRole('dentist'), (req, res) => {
  const {
    patient_id, screening_id, tooth_number,
    mesial_mm, middle_mm, distal_mm,
    bleeding, source, raw_transcript, notes,
  } = req.body;

  // Validate required fields
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

  const result = db
    .prepare(
      `INSERT INTO clinical_measurements
         (patient_id, dentist_id, screening_id,
          tooth_number, mesial_mm, middle_mm, distal_mm,
          bleeding, source, raw_transcript,
          confirmation_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      Number(patient_id),
      req.user.id,
      screening_id ? Number(screening_id) : null,
      Number(tooth_number),
      mesial_mm != null ? Number(mesial_mm) : null,
      middle_mm != null ? Number(middle_mm) : null,
      distal_mm != null ? Number(distal_mm) : null,
      bleeding ? 1 : 0,
      source || 'manual',
      raw_transcript || null,
      notes || null,
    );

  const measurement = db
    .prepare('SELECT * FROM clinical_measurements WHERE id = ?')
    .get(result.lastInsertRowid);

  return res.status(201).json({ measurement: format(measurement) });
});

// ---------------------------------------------------------------------------
// GET /api/measurements?patient_id=&screening_id=
// Dentist: all measurements they created (filtered by patient/screening).
// Patient: their own confirmed measurements.
// ---------------------------------------------------------------------------
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { patient_id, screening_id } = req.query;

  let rows;
  if (req.user.role === 'patient') {
    // Patients see only their own confirmed measurements
    let q = `SELECT m.*, u.name AS dentist_name
             FROM clinical_measurements m
             JOIN users u ON m.dentist_id = u.id
             WHERE m.patient_id = ? AND m.confirmation_status = 'confirmed'
             ORDER BY m.tooth_number, m.created_at DESC`;
    rows = db.prepare(q).all(req.user.id);
  } else {
    // Dentists see all their measurements, optionally filtered
    let q = `SELECT m.*, u.name AS patient_name
             FROM clinical_measurements m
             JOIN users u ON m.patient_id = u.id
             WHERE m.dentist_id = ?`;
    const params = [req.user.id];
    if (patient_id) { q += ' AND m.patient_id = ?'; params.push(Number(patient_id)); }
    if (screening_id) { q += ' AND m.screening_id = ?'; params.push(Number(screening_id)); }
    q += ' ORDER BY m.tooth_number, m.created_at DESC';
    rows = db.prepare(q).all(...params);
  }

  return res.json({ measurements: rows.map(format) });
});

// ---------------------------------------------------------------------------
// PATCH /api/measurements/:id/confirm
// Dentist confirms a pending measurement.
// ---------------------------------------------------------------------------
router.patch('/:id/confirm', requireAuth, requireRole('dentist'), (req, res) => {
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM clinical_measurements WHERE id = ?')
    .get(req.params.id);

  if (!existing) return res.status(404).json({ error: 'Measurement not found' });
  if (existing.dentist_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (existing.confirmation_status === 'confirmed') {
    return res.status(409).json({ error: 'Measurement is already confirmed' });
  }

  db.prepare(
    `UPDATE clinical_measurements
     SET confirmation_status = 'confirmed',
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE id = ?`,
  ).run(req.params.id);

  const updated = db.prepare('SELECT * FROM clinical_measurements WHERE id = ?').get(req.params.id);
  return res.json({ measurement: format(updated) });
});

// ---------------------------------------------------------------------------
// POST /api/measurements/:id/correct
// Dentist submits a correction to a confirmed measurement.
// Creates a new measurement with source='corrected' and references original.
// Marks original as 'corrected'. Requires dentist confirmation.
// Body: { field, value, notes? }
// ---------------------------------------------------------------------------
router.post('/:id/correct', requireAuth, requireRole('dentist'), (req, res) => {
  const { field, value, notes } = req.body;

  const CORRECTABLE_FIELDS = ['mesial_mm', 'middle_mm', 'distal_mm', 'bleeding', 'mesial', 'middle', 'distal'];
  if (!field || !CORRECTABLE_FIELDS.includes(field)) {
    return res.status(400).json({
      error: `field must be one of: mesial_mm, middle_mm, distal_mm, bleeding`,
    });
  }
  if (value === undefined || value === null) {
    return res.status(400).json({ error: 'value is required' });
  }

  const db = getDb();
  const original = db
    .prepare('SELECT * FROM clinical_measurements WHERE id = ?')
    .get(req.params.id);

  if (!original) return res.status(404).json({ error: 'Measurement not found' });
  if (original.dentist_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  // Map short field names to DB column names
  const fieldMap = { mesial: 'mesial_mm', middle: 'middle_mm', distal: 'distal_mm' };
  const dbField = fieldMap[field] || field;

  // Create corrected measurement (copy original, override the changed field)
  const correctedRow = {
    patient_id: original.patient_id,
    dentist_id: original.dentist_id,
    screening_id: original.screening_id,
    tooth_number: original.tooth_number,
    mesial_mm: original.mesial_mm,
    middle_mm: original.middle_mm,
    distal_mm: original.distal_mm,
    bleeding: original.bleeding,
    source: 'corrected',
    raw_transcript: null,
    corrects_id: original.id,
    notes: notes || null,
  };

  // Apply the correction
  if (dbField === 'bleeding') {
    correctedRow.bleeding = value ? 1 : 0;
  } else {
    const numVal = Number(value);
    if (!Number.isInteger(numVal) || numVal < 1 || numVal > 20) {
      return res.status(400).json({ error: 'Measurement value must be an integer between 1 and 20' });
    }
    correctedRow[dbField] = numVal;
  }

  // Record what changed for the UI to display
  const originalValue = dbField === 'bleeding' ? (original.bleeding === 1) : original[dbField];
  const newValue = dbField === 'bleeding' ? (value ? true : false) : correctedRow[dbField];

  // Use a transaction: mark original as corrected + insert new record
  const transaction = db.transaction(() => {
    db.prepare(
      `UPDATE clinical_measurements
       SET confirmation_status = 'corrected',
           updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
       WHERE id = ?`,
    ).run(original.id);

    const result = db
      .prepare(
        `INSERT INTO clinical_measurements
           (patient_id, dentist_id, screening_id, tooth_number,
            mesial_mm, middle_mm, distal_mm, bleeding,
            source, raw_transcript, confirmation_status, corrects_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'corrected', ?, 'pending', ?, ?)`,
      )
      .run(
        correctedRow.patient_id,
        correctedRow.dentist_id,
        correctedRow.screening_id,
        correctedRow.tooth_number,
        correctedRow.mesial_mm,
        correctedRow.middle_mm,
        correctedRow.distal_mm,
        correctedRow.bleeding,
        correctedRow.raw_transcript,
        correctedRow.corrects_id,
        correctedRow.notes,
      );

    return result.lastInsertRowid;
  });

  const newId = transaction();
  const newMeasurement = db
    .prepare('SELECT * FROM clinical_measurements WHERE id = ?')
    .get(newId);

  return res.status(201).json({
    measurement: format(newMeasurement),
    correction: {
      field: dbField,
      from: originalValue,
      to: newValue,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /api/measurements/note-draft/:screening_id
// Generate a clinical note draft from stored data.
// Dentist only. Never invents data.
// ---------------------------------------------------------------------------
router.get('/note-draft/:screening_id', requireAuth, requireRole('dentist'), (req, res) => {
  const db = getDb();
  const screeningId = Number(req.params.screening_id);

  const screening = db
    .prepare(
      `SELECT s.*, u.name AS patient_name
       FROM screenings s
       JOIN users u ON s.patient_id = u.id
       WHERE s.id = ?`,
    )
    .get(screeningId);

  if (!screening) return res.status(404).json({ error: 'Screening not found' });

  const plan = db
    .prepare(
      `SELECT tp.*, u.name AS dentist_name
       FROM treatment_plans tp
       JOIN users u ON tp.dentist_id = u.id
       WHERE tp.screening_id = ?
       ORDER BY tp.created_at DESC LIMIT 1`,
    )
    .get(screeningId);

  const measurements = db
    .prepare(
      `SELECT * FROM clinical_measurements
       WHERE screening_id = ? AND confirmation_status = 'confirmed'
       ORDER BY tooth_number`,
    )
    .all(screeningId);

  const followUps = db
    .prepare(
      `SELECT * FROM follow_ups
       WHERE plan_id IN (SELECT id FROM treatment_plans WHERE screening_id = ?)
       AND status = 'pending'
       ORDER BY due_date`,
    )
    .all(screeningId);

  // Build the draft note from stored data only
  const note = buildNoteDraft({
    screening,
    plan,
    measurements: measurements.map(format),
    followUps,
  });

  return res.json({ draft: note, generatedAt: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function format(row) {
  if (!row) return null;
  return {
    ...row,
    bleeding: row.bleeding === 1,
  };
}

function tryParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function buildNoteDraft({ screening, plan, measurements, followUps }) {
  const rf = tryParse(screening.risk_factors, {});
  const symptoms = tryParse(screening.symptoms, []);
  const riskList = Object.entries(rf).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' '));

  let note = `DRAFT — REQUIRES DENTIST REVIEW\n`;
  note += `Generated: ${new Date().toLocaleString()}\n`;
  note += `Patient: ${screening.patient_name}\n\n`;

  note += `PATIENT-REPORTED FINDINGS\n`;
  note += `${'─'.repeat(40)}\n`;

  if (symptoms.length > 0) {
    note += `Reported symptoms:\n`;
    for (const s of symptoms) note += `  • ${s.replace(/_/g, ' ')}\n`;
  } else {
    note += `Reported symptoms: None\n`;
  }

  if (screening.symptom_duration) {
    note += `Duration: ${screening.symptom_duration}\n`;
  }

  if (riskList.length > 0) {
    note += `\nRisk factors:\n`;
    for (const r of riskList) note += `  • ${r}\n`;
  } else {
    note += `\nRisk factors: None reported\n`;
  }

  if (screening.notes) {
    note += `\nPatient notes: ${screening.notes}\n`;
  }

  if (measurements.length > 0) {
    note += `\nCLINICAL MEASUREMENTS (Confirmed)\n`;
    note += `${'─'.repeat(40)}\n`;
    for (const m of measurements) {
      note += `Tooth ${m.tooth_number}: `;
      const depths = [m.mesial_mm, m.middle_mm, m.distal_mm]
        .map((v) => (v != null ? `${v}mm` : '?'))
        .join('/');
      note += `${depths} (M/Mi/D)`;
      note += ` | BOP: ${m.bleeding ? 'Present' : 'Absent'}\n`;
    }
  }

  if (plan) {
    note += `\nTREATMENT PLAN\n`;
    note += `${'─'.repeat(40)}\n`;
    note += `Title: ${plan.title}\n`;
    note += `\n${plan.explanation}\n`;

    const steps = tryParse(plan.steps, []);
    if (steps.length > 0) {
      note += `\nPlanned steps:\n`;
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        note += `  ${i + 1}. ${typeof s === 'object' ? s.step : s}\n`;
      }
    }

    if (plan.next_appointment) {
      note += `\nNext appointment: ${plan.next_appointment}\n`;
    }
  }

  if (followUps.length > 0) {
    note += `\nFOLLOW-UPS\n`;
    note += `${'─'.repeat(40)}\n`;
    for (const f of followUps) {
      note += `  • ${f.task}`;
      if (f.due_date) note += ` (due: ${f.due_date})`;
      note += '\n';
    }
  }

  note += `\n${'─'.repeat(40)}\n`;
  note += `DRAFT — This note was generated from stored patient data.\n`;
  note += `It must be reviewed and signed by the treating clinician.\n`;
  note += `It is not a substitute for a clinical examination.\n`;

  return note;
}

module.exports = router;
