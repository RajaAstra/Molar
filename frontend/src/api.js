/**
 * api.js — MOLAR API client.
 *
 * Thin wrapper around native fetch.
 * Token is read from localStorage on every request so it's always fresh.
 * Images are served through the authenticated /api/uploads route.
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request(method, path, { body, isFormData = false } = {}) {
  const token = localStorage.getItem('molar_token');

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = { error: `HTTP ${res.status}` };
  }

  if (!res.ok) {
    throw new ApiError(data.error || `HTTP ${res.status}`, res.status);
  }

  return data;
}

export const api = {
  // --- Auth ---
  register: (body) => request('POST', '/api/auth/register', { body }),
  login: (body) => request('POST', '/api/auth/login', { body }),
  me: () => request('GET', '/api/auth/me'),

  // --- Screenings ---
  createScreening: (formData) =>
    request('POST', '/api/screenings', { body: formData, isFormData: true }),
  getScreenings: () => request('GET', '/api/screenings'),
  getScreening: (id) => request('GET', `/api/screenings/${id}`),
  updateScreeningStatus: (id, body) =>
    request('PATCH', `/api/screenings/${id}/status`, { body }),

  // --- Treatment plans ---
  createPlan: (body) => request('POST', '/api/treatment-plans', { body }),
  getPlans: () => request('GET', '/api/treatment-plans'),
  getPlan: (id) => request('GET', `/api/treatment-plans/${id}`),
  updatePlanStatus: (id, body) =>
    request('PATCH', `/api/treatment-plans/${id}/status`, { body }),

  // --- Follow-ups ---
  createFollowUp: (body) => request('POST', '/api/follow-ups', { body }),
  getFollowUps: () => request('GET', '/api/follow-ups'),
  updateFollowUpStatus: (id, body) =>
    request('PATCH', `/api/follow-ups/${id}/status`, { body }),

  // --- Clinical measurements ---
  parseMeasurement: (transcript) =>
    request('POST', '/api/measurements/parse', { body: { transcript } }),
  parseCorrection: (transcript) =>
    request('POST', '/api/measurements/parse-correction', { body: { transcript } }),
  createMeasurement: (body) => request('POST', '/api/measurements', { body }),
  getMeasurements: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/measurements${qs ? `?${qs}` : ''}`);
  },
  confirmMeasurement: (id) => request('PATCH', `/api/measurements/${id}/confirm`),
  correctMeasurement: (id, body) =>
    request('POST', `/api/measurements/${id}/correct`, { body }),

  // --- Clinical note draft ---
  getNoteDraft: (screeningId) =>
    request('GET', `/api/measurements/note-draft/${screeningId}`),

  // --- Tooth records ---
  createToothRecord: (body) => request('POST', '/api/tooth-records', { body }),
  getToothRecords: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/tooth-records${qs ? `?${qs}` : ''}`);
  },
  getToothRecord: (id) => request('GET', `/api/tooth-records/${id}`),
  updateToothRecord: (id, body) => request('PATCH', `/api/tooth-records/${id}`, { body }),
  confirmToothRecord: (id) => request('PATCH', `/api/tooth-records/${id}/confirm`),

  // --- Smile visualizations ---
  createSmileVisualization: (formData) =>
    request('POST', '/api/smile-visualizations', { body: formData, isFormData: true }),
  getSmileVisualizations: () => request('GET', '/api/smile-visualizations'),
  getSmileVisualization: (id) => request('GET', `/api/smile-visualizations/${id}`),
  saveSmileVisualization: (id) => request('PATCH', `/api/smile-visualizations/${id}/save`),

  // --- Dentist-authored digital smile designs ---
  createSmileDesign: (formData) =>
    request('POST', '/api/smile-design', { body: formData, isFormData: true }),
  getSmileDesigns: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/smile-design${qs ? `?${qs}` : ''}`);
  },
  getSmileDesign: (id) => request('GET', `/api/smile-design/${id}`),
  updateSmileDesign: (id, body) => request('PATCH', `/api/smile-design/${id}`, { body }),
  updateSmileDesignStatus: (id, status) =>
    request('PATCH', `/api/smile-design/${id}/status`, { body: { status } }),

  // --- Atomic voice clinical documentation ---
  parseClinicalVoice: (transcript) =>
    request('POST', '/api/clinical-measurements/parse', { body: { transcript } }),
  createVoiceClinicalMeasurement: (body) =>
    request('POST', '/api/clinical-measurements', { body }),
  getVoiceClinicalMeasurements: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/clinical-measurements${qs ? `?${qs}` : ''}`);
  },
  correctVoiceClinicalMeasurement: (id, body) =>
    request('POST', `/api/clinical-measurements/${id}/correct`, { body }),
  updateVoiceClinicalMeasurement: (id, body) =>
    request('PUT', `/api/clinical-measurements/${id}`, { body }),

  // --- Tooth scans ---
  createToothScan: (formData) =>
    request('POST', '/api/tooth-scans', { body: formData, isFormData: true }),
  getToothScans: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/tooth-scans${qs ? `?${qs}` : ''}`);
  },
  getToothScan: (id) => request('GET', `/api/tooth-scans/${id}`),
  reviewToothScan: (id) => request('PATCH', `/api/tooth-scans/${id}/review`),

  // --- Authenticated image URL ---
  // Images require a Bearer token, so we build a fetch URL that the browser
  // will call with the Authorization header via an <img> loaded through a blob URL.
  imageUrl: (filename) => (filename ? `${BASE}/api/uploads/${filename}` : null),

  /**
   * Fetch an oral image as a blob URL for use in <img src=...>.
   * Returns null if filename is missing or fetch fails.
   */
  async fetchImageBlob(filename) {
    if (!filename) return null;
    const token = localStorage.getItem('molar_token');
    try {
      const res = await fetch(`${BASE}/api/uploads/${filename}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return null;
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  },
};
