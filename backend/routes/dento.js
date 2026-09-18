'use strict';

const express = require('express');
const { chat } = require('../services/dentoService');
const { getDentoContext } = require('../services/dentoContext');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { message, patient_id } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'message is required',
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        error: 'message is too long',
      });
    }

    // For patients, context is automatically their own records.
    // For dentists, patient_id must identify the patient they are allowed to access.
    let patientId = null;

    if (req.user.role === 'dentist') {
      if (!patient_id) {
        return res.status(400).json({
          error: 'patient_id is required for dentist DENTO requests',
        });
      }

      patientId = Number(patient_id);

      if (!Number.isInteger(patientId) || patientId <= 0) {
        return res.status(400).json({
          error: 'patient_id must be a valid positive integer',
        });
      }
    }

    const patientContext = await getDentoContext(
      req.user,
      patientId
    );

    const response = await chat({
      message: message.trim(),
      patientContext,
      conversation: [],
    });

    res.json({
      assistant: 'DENTO',
      response,
    });
  } catch (error) {
    console.error('[DENTO Error]', error);

    res.status(500).json({
      error: 'DENTO could not process the request',
    });
  }
});

module.exports = router;
