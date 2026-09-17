'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Initialize DB (runs migrations on first boot)
const { getDb } = require('./db');
getDb();

const app = express();

// ---------------------------------------------------------------------------
// Security headers via Helmet
// Adds X-Content-Type-Options, X-Frame-Options, Referrer-Policy, etc.
// ---------------------------------------------------------------------------
app.use(
  helmet({
    // CSP is intentionally permissive for dev — tighten for production
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// ---------------------------------------------------------------------------
// CORS — only allow the configured frontend origin
// ---------------------------------------------------------------------------
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Allow requests with no origin (curl, mobile apps in dev)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    // Limit allowed methods to only those the API actually uses
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

// Strict limiter for auth endpoints — 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please try again in 15 minutes.' },
  skipSuccessfulRequests: false,
});

// General API limiter — 200 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please slow down.' },
});

// Apply general limiter to all API routes
app.use('/api', apiLimiter);

// ---------------------------------------------------------------------------
// Body parsers
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));

// ---------------------------------------------------------------------------
// Static file serving for uploaded oral images
// Access is intentionally controlled by the requireAuth middleware on the
// /api/uploads route below — the raw express.static path is NOT exposed
// publicly. Instead, images are served through an authenticated API route.
// ---------------------------------------------------------------------------
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/screenings', require('./routes/screenings'));
app.use('/api/treatment-plans', require('./routes/treatmentPlans'));
app.use('/api/follow-ups', require('./routes/followUps'));
app.use('/api/measurements', require('./routes/measurements'));
app.use('/api/tooth-records', require('./routes/toothRecords'));
app.use('/api/smile-visualizations', require('./routes/smileVisualizations'));
app.use('/api/tooth-scans', require('./routes/toothScans'));

// ---------------------------------------------------------------------------
// Authenticated image serving
// Only authenticated users can retrieve uploaded oral images.
// The file path is constructed server-side from the basename only
// to prevent path traversal.
// ---------------------------------------------------------------------------
const { requireAuth } = require('./middleware/auth');

app.get('/api/uploads/:filename', requireAuth, (req, res) => {
  // Sanitize: only allow the basename, reject any path separators
  const basename = path.basename(req.params.filename);
  if (!basename || basename !== req.params.filename) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  // Only serve files that match expected oral/smile/scan image name pattern
  if (!/^(oral|smile|scan)-[\w-]+\.(jpg|jpeg|png|webp)$/i.test(basename)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = path.join(UPLOADS_DIR, basename);
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).json({ error: 'Image not found' });
  });
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MOLAR API', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// 404 handler for unmatched API routes
// ---------------------------------------------------------------------------
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ---------------------------------------------------------------------------
// Global error handler
// Never expose stack traces or internal error details to clients.
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Image file is too large (max 10 MB)' });
  }
  if (err.message && err.message.startsWith('Only JPEG')) {
    return res.status(400).json({ error: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (err.message && err.message.startsWith('CORS')) {
    return res.status(403).json({ error: 'CORS policy violation' });
  }

  // Log internally but never expose stack traces to clients
  console.error('[MOLAR API Error]', err.message);
  res.status(500).json({ error: 'An unexpected error occurred' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`MOLAR API running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;
