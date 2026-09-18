'use strict';

/**
 * /api/smile-visualizations
 *
 * Patient smile visualization workflow.
 * Patients upload a smile photo and select a treatment concept.
 *
 * PROTOTYPE NOTE: No generative AI transformation is performed.
 * The API stores the record and returns deterministic concept metadata.
 * The frontend renders a labeled "prototype visualization" overlay.
 * Architecture is designed to accept a real image-transformation service later.
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
    cb(null, `smile-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
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
// Concept metadata — deterministic, never claim clinical accuracy
// ---------------------------------------------------------------------------
const CONCEPT_METADATA = {
  alignment: {
    label: 'Alignment Concept',
    description: 'Visualizes potential tooth alignment improvements. This is a prototype concept visualization, not a clinical treatment outcome.',
    adjustments: ['Tooth spacing adjustment concept', 'Midline alignment concept', 'Arch form concept'],
  },
  whitening: {
    label: 'Whitening Concept',
    description: 'Visualizes a potential whitening result. Actual results depend on tooth structure and clinical factors. Prototype visualization only.',
    adjustments: ['Surface whitening concept', 'Shade enhancement concept'],
  },
  symmetry: {
    label: 'Smile Symmetry Concept',
    description: 'Visualizes potential smile symmetry improvements. This is a concept-level prototype, not a clinical plan.',
    adjustments: ['Gum line concept', 'Tooth proportion concept', 'Lateral balance concept'],
  },
};

// ---------------------------------------------------------------------------
// POST /api/smile-visualizations
// Patient uploads smile photo and selects a concept.
// ---------------------------------------------------------------------------
router.post('/', requireAuth, requireRole('patient'), upload.single('image'), (req, res) => {
  const { concept, notes } = req.body;

  const validConcepts = ['alignment', 'whitening', 'symmetry'];
  const selectedConcept = validConcepts.includes(concept) ? concept : 'alignment';

  if (!req.file) {
    return res.status(400).json({ error: 'A smile photo is required' });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO smile_visualizations (patient_id, image_path, concept, notes)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, req.file.filename, selectedConcept, notes || null);

  const viz = db.prepare('SELECT * FROM smile_visualizations WHERE id = ?').get(result.lastInsertRowid);

  return res.status(201).json({
    visualization: format(viz),
    conceptMeta: CONCEPT_METADATA[selectedConcept],
    disclaimer: 'PROTOTYPE VISUALIZATION — Not clinically validated. Not a diagnosis or guaranteed outcome. A qualified dental professional must evaluate any treatment.',
  });
});

// ---------------------------------------------------------------------------
// GET /api/smile-visualizations
// Patient: their own visualizations.
// ---------------------------------------------------------------------------
router.get('/', requireAuth, requireRole('patient'), (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM smile_visualizations
    WHERE patient_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);

  return res.json({ visualizations: rows.map(format) });
});

// ---------------------------------------------------------------------------
// GET /api/smile-visualizations/:id
// ---------------------------------------------------------------------------
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM smile_visualizations WHERE id = ?').get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Visualization not found' });
  if (req.user.role !== 'patient' || row.patient_id !== req.user.id) {
  return res.status(403).json({ error: 'Access denied' });
}

  const selectedConcept = row.concept || 'alignment';
  return res.json({
    visualization: format(row),
    conceptMeta: CONCEPT_METADATA[selectedConcept],
    disclaimer: 'PROTOTYPE VISUALIZATION — Not clinically validated. Not a diagnosis or guaranteed outcome.',
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/smile-visualizations/:id/save
// Mark a visualization as saved.
// ---------------------------------------------------------------------------
router.patch('/:id/save', requireAuth, requireRole('patient'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM smile_visualizations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Visualization not found' });
  if (existing.patient_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  db.prepare(`
    UPDATE smile_visualizations
    SET saved = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    WHERE id = ?
  `).run(req.params.id);

  const updated = db.prepare('SELECT * FROM smile_visualizations WHERE id = ?').get(req.params.id);
  return res.json({ visualization: format(updated) });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function format(row) {
  if (!row) return null;
  return { ...row, saved: row.saved === 1 };
}

module.exports = router;
