'use strict';

const { getDb } = require('../db');

function tryParse(value, fallback) {
  if (value == null) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Build the dental context available to DENTO.
 *
 * Patient:
 *   - Can only access their own records.
 *
 * Dentist:
 *   - Can access records they created.
 *   - A specific patient_id may be supplied for patient-focused chat.
 */
function getDentoContext(user, patientId = null) {
  const db = getDb();

  let targetPatientId;

  if (user.role === 'patient') {
    // Patients can only ever access themselves.
    targetPatientId = user.id;
  } else if (user.role === 'dentist') {
    if (!patientId || !Number.isInteger(Number(patientId))) {
      return {
        user: {
          id: user.id,
          role: user.role,
        },
        patient: null,
        screenings: [],
        treatmentPlans: [],
        followUps: [],
        toothRecords: [],
        measurements: [],
        toothScans: [],
        smileVisualizations: [],
        note: 'No patient was selected.',
      };
    }

    targetPatientId = Number(patientId);
  } else {
    throw new Error('Unsupported user role');
  }

  // ---------------------------------------------------------
  // Patient profile
  // ---------------------------------------------------------

  const patient = db
    .prepare(`
      SELECT id, name, email, created_at
      FROM users
      WHERE id = ?
        AND role = 'patient'
    `)
    .get(targetPatientId);

  if (!patient) {
    return {
      user: {
        id: user.id,
        role: user.role,
      },
      patient: null,
      screenings: [],
      treatmentPlans: [],
      followUps: [],
      toothRecords: [],
      measurements: [],
      toothScans: [],
      smileVisualizations: [],
      note: 'Patient not found.',
    };
  }

  // ---------------------------------------------------------
  // Authorization for dentist
  //
  // A dentist can only use DENTO for patients they have
  // existing clinical records for.
  // ---------------------------------------------------------

  if (user.role === 'dentist') {
    const relationship = db.prepare(`
      SELECT 1
      FROM (
        SELECT patient_id
        FROM screenings
        WHERE reviewed_by = ?

        UNION

        SELECT patient_id
        FROM treatment_plans
        WHERE dentist_id = ?

        UNION

        SELECT patient_id
        FROM follow_ups
        WHERE dentist_id = ?

        UNION

        SELECT patient_id
        FROM tooth_records
        WHERE dentist_id = ?

        UNION

        SELECT patient_id
        FROM clinical_measurements
        WHERE dentist_id = ?

        UNION

        SELECT patient_id
        FROM tooth_scans
        WHERE dentist_id = ?
      )
      WHERE patient_id = ?
      LIMIT 1
    `).get(
      user.id,
      user.id,
      user.id,
      user.id,
      user.id,
      user.id,
      targetPatientId,
    );

    if (!relationship) {
      return {
        user: {
          id: user.id,
          role: user.role,
        },
        patient: null,
        screenings: [],
        treatmentPlans: [],
        followUps: [],
        toothRecords: [],
        measurements: [],
        toothScans: [],
        smileVisualizations: [],
        note: 'You do not have an existing clinical relationship with this patient.',
      };
    }
  }

  // ---------------------------------------------------------
  // Screenings
  // ---------------------------------------------------------

  let screenings;

  if (user.role === 'patient') {
    screenings = db.prepare(`
      SELECT
        s.id,
        s.patient_id,
        s.risk_factors,
        s.symptoms,
        s.symptom_duration,
        s.notes,
        s.status,
        s.dentist_note,
        s.created_at,
        s.updated_at
      FROM screenings s
      WHERE s.patient_id = ?
      ORDER BY s.created_at DESC
      LIMIT 20
    `).all(targetPatientId);
  } else {
    screenings = db.prepare(`
      SELECT
        s.id,
        s.patient_id,
        s.risk_factors,
        s.symptoms,
        s.symptom_duration,
        s.notes,
        s.status,
        s.dentist_note,
        s.created_at,
        s.updated_at
      FROM screenings s
      WHERE s.patient_id = ?
        AND s.reviewed_by = ?
      ORDER BY s.created_at DESC
      LIMIT 20
    `).all(targetPatientId, user.id);
  }

  screenings = screenings.map((row) => ({
    ...row,
    risk_factors: tryParse(row.risk_factors, {}),
    symptoms: tryParse(row.symptoms, []),
  }));

  // ---------------------------------------------------------
  // Treatment plans
  // ---------------------------------------------------------

  let treatmentPlans;

  if (user.role === 'patient') {
    treatmentPlans = db.prepare(`
      SELECT
        tp.*,
        d.name AS dentist_name
      FROM treatment_plans tp
      LEFT JOIN users d ON tp.dentist_id = d.id
      WHERE tp.patient_id = ?
      ORDER BY tp.created_at DESC
      LIMIT 20
    `).all(targetPatientId);
  } else {
    treatmentPlans = db.prepare(`
      SELECT
        tp.*,
        d.name AS dentist_name
      FROM treatment_plans tp
      LEFT JOIN users d ON tp.dentist_id = d.id
      WHERE tp.patient_id = ?
        AND tp.dentist_id = ?
      ORDER BY tp.created_at DESC
      LIMIT 20
    `).all(targetPatientId, user.id);
  }

  treatmentPlans = treatmentPlans.map((row) => ({
    ...row,
    steps: tryParse(row.steps, []),
  }));

  // ---------------------------------------------------------
  // Follow-ups
  // ---------------------------------------------------------

  let followUps;

  if (user.role === 'patient') {
    followUps = db.prepare(`
      SELECT
        f.*,
        d.name AS dentist_name
      FROM follow_ups f
      LEFT JOIN users d ON f.dentist_id = d.id
      WHERE f.patient_id = ?
      ORDER BY f.due_date ASC, f.created_at DESC
      LIMIT 30
    `).all(targetPatientId);
  } else {
    followUps = db.prepare(`
      SELECT
        f.*,
        d.name AS dentist_name
      FROM follow_ups f
      LEFT JOIN users d ON f.dentist_id = d.id
      WHERE f.patient_id = ?
        AND f.dentist_id = ?
      ORDER BY f.due_date ASC, f.created_at DESC
      LIMIT 30
    `).all(targetPatientId, user.id);
  }

  // ---------------------------------------------------------
  // Tooth records
  // ---------------------------------------------------------

  let toothRecords;

  if (user.role === 'patient') {
    toothRecords = db.prepare(`
      SELECT
        tr.*,
        d.name AS dentist_name
      FROM tooth_records tr
      LEFT JOIN users d ON tr.dentist_id = d.id
      WHERE tr.patient_id = ?
        AND tr.confirmation_status = 'confirmed'
      ORDER BY tr.tooth_number, tr.created_at DESC
      LIMIT 100
    `).all(targetPatientId);
  } else {
    toothRecords = db.prepare(`
      SELECT
        tr.*,
        d.name AS dentist_name
      FROM tooth_records tr
      LEFT JOIN users d ON tr.dentist_id = d.id
      WHERE tr.patient_id = ?
        AND tr.dentist_id = ?
      ORDER BY tr.tooth_number, tr.created_at DESC
      LIMIT 100
    `).all(targetPatientId, user.id);
  }

  toothRecords = toothRecords.map((row) => ({
    ...row,
    bleeding: row.bleeding === 1,
    observations: tryParse(row.observations, []),
  }));

  // ---------------------------------------------------------
  // Periodontal measurements
  // ---------------------------------------------------------

  let measurements;

  if (user.role === 'patient') {
    measurements = db.prepare(`
      SELECT *
      FROM clinical_measurements
      WHERE patient_id = ?
      ORDER BY tooth_number, created_at DESC
      LIMIT 200
    `).all(targetPatientId);
  } else {
    measurements = db.prepare(`
      SELECT *
      FROM clinical_measurements
      WHERE patient_id = ?
        AND dentist_id = ?
      ORDER BY tooth_number, created_at DESC
      LIMIT 200
    `).all(targetPatientId, user.id);
  }

  // ---------------------------------------------------------
  // Tooth scans
  // ---------------------------------------------------------

  let toothScans;

  if (user.role === 'patient') {
    toothScans = db.prepare(`
      SELECT
        id,
        patient_id,
        dentist_id,
        screening_id,
        detected_regions,
        status,
        notes,
        created_at,
        updated_at
      FROM tooth_scans
      WHERE patient_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(targetPatientId);
  } else {
    toothScans = db.prepare(`
      SELECT
        id,
        patient_id,
        dentist_id,
        screening_id,
        detected_regions,
        status,
        notes,
        created_at,
        updated_at
      FROM tooth_scans
      WHERE patient_id = ?
        AND dentist_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(targetPatientId, user.id);
  }

  toothScans = toothScans.map((row) => ({
    ...row,
    detected_regions: tryParse(row.detected_regions, []),
  }));

  // ---------------------------------------------------------
  // Smile visualizations
  // ---------------------------------------------------------

  const smileVisualizations = db.prepare(`
    SELECT
      id,
      patient_id,
      concept,
      notes,
      saved,
      created_at,
      updated_at
    FROM smile_visualizations
    WHERE patient_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(targetPatientId);

  // ---------------------------------------------------------
  // Final context
  // ---------------------------------------------------------

  return {
    user: {
      id: user.id,
      role: user.role,
    },

    patient,

    screenings,

    treatmentPlans,

    followUps,

    toothRecords,

    measurements,

    toothScans,

    smileVisualizations,
  };
}

module.exports = {
  getDentoContext,
};
