'use strict';

const Database = require('better-sqlite3');
const path = require('path');

// Database file lives next to this module, gitignored via *.sqlite
const DB_PATH = path.join(__dirname, 'molar.sqlite');

let _db = null;

/**
 * Return the single shared database connection (lazy singleton).
 * Creates and migrates the schema on first call.
 */
function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH);

  // Enable WAL for better concurrent read performance
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  migrate(_db);
  return _db;
}

/**
 * Run schema migrations in order.
 * Each migration is idempotent (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).
 */
function migrate(db) {
  db.exec(`
    -- -------------------------------------------------------
    -- users
    -- -------------------------------------------------------
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password    TEXT    NOT NULL,
      role        TEXT    NOT NULL CHECK(role IN ('patient', 'dentist')),
      created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    -- -------------------------------------------------------
    -- screenings
    -- -------------------------------------------------------
    CREATE TABLE IF NOT EXISTS screenings (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id          INTEGER NOT NULL REFERENCES users(id),

      -- Risk factors (stored as JSON boolean object for flexibility)
      risk_factors        TEXT    NOT NULL DEFAULT '{}',

      -- Reported symptoms (JSON array of strings)
      symptoms            TEXT    NOT NULL DEFAULT '[]',

      -- How long symptoms have been present (free text, e.g. "2 weeks")
      symptom_duration    TEXT,

      -- Optional free-text notes from patient
      notes               TEXT,

      -- Path / filename of uploaded oral image (if any)
      image_path          TEXT,

      -- Workflow status
      status              TEXT    NOT NULL DEFAULT 'submitted'
                          CHECK(status IN ('submitted', 'under_review', 'reviewed', 'closed')),

      -- Optional review note from dentist
      dentist_note        TEXT,

      -- Dentist who reviewed (nullable until reviewed)
      reviewed_by         INTEGER REFERENCES users(id),

      created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_screenings_patient  ON screenings(patient_id);
    CREATE INDEX IF NOT EXISTS idx_screenings_status   ON screenings(status);

    -- -------------------------------------------------------
    -- treatment_plans
    -- -------------------------------------------------------
    CREATE TABLE IF NOT EXISTS treatment_plans (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id      INTEGER NOT NULL REFERENCES users(id),
      dentist_id      INTEGER NOT NULL REFERENCES users(id),
      screening_id    INTEGER REFERENCES screenings(id),

      title           TEXT    NOT NULL,
      -- Patient-friendly explanation written by dentist
      explanation     TEXT    NOT NULL,
      -- Structured steps as JSON array of {step, detail}
      steps           TEXT    NOT NULL DEFAULT '[]',

      next_appointment TEXT,   -- ISO date string

      status          TEXT    NOT NULL DEFAULT 'active'
                      CHECK(status IN ('active', 'completed', 'cancelled')),

      created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_plans_patient  ON treatment_plans(patient_id);
    CREATE INDEX IF NOT EXISTS idx_plans_dentist  ON treatment_plans(dentist_id);

    -- -------------------------------------------------------
    -- follow_ups
    -- -------------------------------------------------------
    CREATE TABLE IF NOT EXISTS follow_ups (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id      INTEGER NOT NULL REFERENCES users(id),
      dentist_id      INTEGER REFERENCES users(id),
      plan_id         INTEGER REFERENCES treatment_plans(id),

      task            TEXT    NOT NULL,
      due_date        TEXT,   -- ISO date string

      status          TEXT    NOT NULL DEFAULT 'pending'
                      CHECK(status IN ('pending', 'completed', 'missed')),

      created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_followups_patient ON follow_ups(patient_id);

    -- -------------------------------------------------------
    -- clinical_measurements
    -- Periodontal probing depths entered by the dentist via
    -- voice charting or manual entry.
    -- Patients have read access to their own records only.
    -- Only the creating dentist can modify unconfirmed measurements.
    -- Confirmed measurements are immutable (correction creates a new record).
    -- -------------------------------------------------------
    CREATE TABLE IF NOT EXISTS clinical_measurements (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id          INTEGER NOT NULL REFERENCES users(id),
      dentist_id          INTEGER NOT NULL REFERENCES users(id),
      screening_id        INTEGER REFERENCES screenings(id),

      tooth_number        INTEGER NOT NULL CHECK(tooth_number BETWEEN 11 AND 48),

      -- Probing depths in mm (nullable -- may not all be captured)
      mesial_mm           INTEGER CHECK(mesial_mm BETWEEN 1 AND 20),
      middle_mm           INTEGER CHECK(middle_mm BETWEEN 1 AND 20),
      distal_mm           INTEGER CHECK(distal_mm BETWEEN 1 AND 20),

      -- Clinical indicators
      bleeding            INTEGER NOT NULL DEFAULT 0 CHECK(bleeding IN (0, 1)),
      mobility            TEXT CHECK(mobility IN ('0','1','2','3') OR mobility IS NULL),
      furcation           TEXT CHECK(furcation IN ('0','1','2','3') OR furcation IS NULL),

      -- How the entry was captured
      source              TEXT NOT NULL DEFAULT 'manual'
                          CHECK(source IN ('voice', 'manual', 'corrected')),

      -- Raw transcript for voice entries (audit trail)
      raw_transcript      TEXT,

      -- Confirmation workflow
      confirmation_status TEXT NOT NULL DEFAULT 'pending'
                          CHECK(confirmation_status IN ('pending', 'confirmed', 'corrected')),

      -- If this is a correction, reference to the original measurement
      corrects_id         INTEGER REFERENCES clinical_measurements(id),

      notes               TEXT,

      created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_measurements_patient ON clinical_measurements(patient_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_dentist ON clinical_measurements(dentist_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_screening ON clinical_measurements(screening_id);

    -- -------------------------------------------------------
    -- tooth_records
    -- Reusable tooth record — used by tooth scan, voice charting,
    -- clinical history, treatment planning, and patient journey.
    -- -------------------------------------------------------
    CREATE TABLE IF NOT EXISTS tooth_records (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id          INTEGER NOT NULL REFERENCES users(id),
      dentist_id          INTEGER REFERENCES users(id),
      screening_id        INTEGER REFERENCES screenings(id),

      tooth_number        INTEGER NOT NULL CHECK(tooth_number BETWEEN 11 AND 48),

      -- Source: how this record was created
      source              TEXT NOT NULL DEFAULT 'manual'
                          CHECK(source IN ('voice', 'manual', 'scan', 'corrected')),

      -- Periodontal measurements (mm)
      mesial_mm           INTEGER CHECK(mesial_mm BETWEEN 1 AND 20),
      middle_mm           INTEGER CHECK(middle_mm BETWEEN 1 AND 20),
      distal_mm           INTEGER CHECK(distal_mm BETWEEN 1 AND 20),

      bleeding            INTEGER NOT NULL DEFAULT 0 CHECK(bleeding IN (0, 1)),
      mobility            TEXT CHECK(mobility IN ('0','1','2','3') OR mobility IS NULL),
      furcation           TEXT CHECK(furcation IN ('0','1','2','3') OR furcation IS NULL),

      -- Free-text observations (JSON array of strings)
      observations        TEXT NOT NULL DEFAULT '[]',

      -- Treatment status
      treatment_status    TEXT NOT NULL DEFAULT 'none'
                          CHECK(treatment_status IN ('none','planned','in_progress','completed')),

      -- Dentist confirmation
      confirmation_status TEXT NOT NULL DEFAULT 'pending'
                          CHECK(confirmation_status IN ('pending','confirmed','corrected')),

      dentist_notes       TEXT,
      raw_transcript      TEXT,

      -- Image region reference (filename from uploads)
      image_path          TEXT,

      created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tooth_records_patient   ON tooth_records(patient_id);
    CREATE INDEX IF NOT EXISTS idx_tooth_records_screening ON tooth_records(screening_id);

    -- -------------------------------------------------------
    -- smile_visualizations
    -- Patient smile visualization workflow records.
    -- -------------------------------------------------------
    CREATE TABLE IF NOT EXISTS smile_visualizations (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id          INTEGER NOT NULL REFERENCES users(id),

      -- Uploaded smile photo filename
      image_path          TEXT NOT NULL,

      -- Selected treatment concept
      concept             TEXT NOT NULL DEFAULT 'alignment'
                          CHECK(concept IN ('alignment','whitening','symmetry')),

      -- Patient notes
      notes               TEXT,

      -- Saved flag
      saved               INTEGER NOT NULL DEFAULT 0 CHECK(saved IN (0, 1)),

      created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_smile_viz_patient ON smile_visualizations(patient_id);

    -- -------------------------------------------------------
    -- tooth_scans
    -- Intraoral scan session records.
    -- -------------------------------------------------------
    CREATE TABLE IF NOT EXISTS tooth_scans (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id          INTEGER NOT NULL REFERENCES users(id),
      dentist_id          INTEGER REFERENCES users(id),
      screening_id        INTEGER REFERENCES screenings(id),

      -- Uploaded intraoral image
      image_path          TEXT NOT NULL,

      -- JSON array of {tooth_number, region, confidence} detected regions
      detected_regions    TEXT NOT NULL DEFAULT '[]',

      -- Scan status
      status              TEXT NOT NULL DEFAULT 'uploaded'
                          CHECK(status IN ('uploaded','analyzed','reviewed')),

      notes               TEXT,

      created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tooth_scans_patient ON tooth_scans(patient_id);
    CREATE INDEX IF NOT EXISTS idx_tooth_scans_dentist ON tooth_scans(dentist_id);

    -- -------------------------------------------------------
    -- smile_designs
    -- Dentist-authored, patient-visible only after approval.
    -- Image filenames are storage-provider agnostic for future cloud storage.
    -- -------------------------------------------------------
    CREATE TABLE IF NOT EXISTS smile_designs (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id            INTEGER NOT NULL REFERENCES users(id),
      dentist_id            INTEGER NOT NULL REFERENCES users(id),
      screening_id          INTEGER REFERENCES screenings(id),
      original_image_path   TEXT,
      simulated_image_path  TEXT,
      treatment_plan        TEXT NOT NULL DEFAULT '[]',
      annotations           TEXT NOT NULL DEFAULT '[]',
      notes                 TEXT,
      patient_summary       TEXT,
      status                TEXT NOT NULL DEFAULT 'draft'
                            CHECK(status IN ('draft','review','approved','archived')),
      approved_by           INTEGER REFERENCES users(id),
      approved_at           TEXT,
      created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_smile_design_patient ON smile_designs(patient_id);
    CREATE INDEX IF NOT EXISTS idx_smile_design_dentist ON smile_designs(dentist_id);

    -- -------------------------------------------------------
    -- voice_clinical_measurements
    -- Atomic, voice-derived measurements kept separate from the established
    -- three-site periodontal chart for an auditable documentation workflow.
    -- -------------------------------------------------------
    CREATE TABLE IF NOT EXISTS voice_clinical_measurements (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id            INTEGER NOT NULL REFERENCES users(id),
      dentist_id            INTEGER NOT NULL REFERENCES users(id),
      screening_id          INTEGER REFERENCES screenings(id),
      measurement_type      TEXT NOT NULL,
      tooth_identifier      TEXT,
      value                 REAL,
      unit                  TEXT,
      site                  TEXT,
      notes                 TEXT,
      voice_transcription   TEXT,
      confidence_score      REAL,
      corrected             INTEGER NOT NULL DEFAULT 0 CHECK(corrected IN (0, 1)),
      corrects_id           INTEGER REFERENCES voice_clinical_measurements(id),
      created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_voice_measurement_patient ON voice_clinical_measurements(patient_id);
    CREATE INDEX IF NOT EXISTS idx_voice_measurement_dentist ON voice_clinical_measurements(dentist_id);
  `);

  // Older local databases may have been created before correction history was
  // introduced. SQLite has no ADD COLUMN IF NOT EXISTS, so inspect first.
  const voiceColumns = db.prepare("PRAGMA table_info('voice_clinical_measurements')").all();
  if (voiceColumns.length && !voiceColumns.some((column) => column.name === 'corrects_id')) {
    db.exec('ALTER TABLE voice_clinical_measurements ADD COLUMN corrects_id INTEGER REFERENCES voice_clinical_measurements(id)');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_voice_measurement_corrects ON voice_clinical_measurements(corrects_id)');

  const smileDesignColumns = db.prepare("PRAGMA table_info('smile_designs')").all();
  if (smileDesignColumns.length && !smileDesignColumns.some((column) => column.name === 'approved_by')) {
    db.exec('ALTER TABLE smile_designs ADD COLUMN approved_by INTEGER REFERENCES users(id)');
  }
  if (smileDesignColumns.length && !smileDesignColumns.some((column) => column.name === 'approved_at')) {
    db.exec('ALTER TABLE smile_designs ADD COLUMN approved_at TEXT');
  }
}

module.exports = { getDb };
