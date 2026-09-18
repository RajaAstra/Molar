/**
 * CaseDetail — dentist's primary workspace for a single patient case.
 *
 * Sections:
 *   1. Header — back link, patient name + email, status badge, submitted date,
 *               'Protected clinical record' indicator.
 *   2. 3-column layout:
 *      Left (2/3) — risk factors (amber chips), symptoms (red chips), duration,
 *                   patient notes, clinical safety disclaimer.
 *      Right (1/3) — image panel (blob URL via api.fetchImageBlob), dentist
 *                    review (textarea + status buttons), create plan link.
 *   3. Image expand modal.
 *
 * Status transitions:
 *   submitted   → under_review | reviewed
 *   under_review→ reviewed | closed
 *   reviewed    → closed
 *   closed      → (none)
 */

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Badge, Button, Spinner, EmptyState, ErrorMessage } from '../components/ui';
import {
  ChevronLeft,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  CheckCircle2,
  Lock,
  X,
  Mic,
  Sparkles,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STATUS_TRANSITIONS = {
  submitted:    ['under_review', 'reviewed'],
  under_review: ['reviewed', 'closed'],
  reviewed:     ['closed'],
  closed:       [],
};

const STATUS_BUTTON_CONFIG = {
  under_review: { label: 'Mark Under Review', variant: 'secondary', icon: null },
  reviewed:     { label: 'Mark Reviewed',      variant: 'primary',   icon: <CheckCircle2 size={14} /> },
  closed:       { label: 'Close Case',          variant: 'secondary', icon: null },
};

// ---------------------------------------------------------------------------
// RiskChip
// ---------------------------------------------------------------------------
function RiskChip({ label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'var(--warning-bg)',
        border: '1px solid rgba(217,119,6,0.22)',
        color: 'var(--warning)',
        borderRadius: 'var(--radius-pill)',
        padding: '4px 11px',
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      ⚠ {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SymptomChip
// ---------------------------------------------------------------------------
function SymptomChip({ label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--danger-bg)',
        border: '1px solid rgba(220,38,38,0.18)',
        color: 'var(--danger)',
        borderRadius: 'var(--radius-pill)',
        padding: '4px 11px',
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SectionHeading
// ---------------------------------------------------------------------------
function SectionHeading({ children }) {
  return (
    <h2
      className="m-eyebrow"
      style={{
        marginBottom: 12,
        color: 'var(--text-3)',
        letterSpacing: '0.10em',
      }}
    >
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// CaseDetail
// ---------------------------------------------------------------------------
export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [screening, setScreening]       = useState(null);
  const [loading, setLoading]           = useState(true);
  const [updating, setUpdating]         = useState(false);
  const [note, setNote]                 = useState('');
  const [error, setError]               = useState('');
  const [showImageModal, setShowImageModal] = useState(false);

  // Image blob state
  const [imageBlob, setImageBlob]       = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  // ---------- Load case ----------
  useEffect(() => {
    api
      .getScreening(id)
      .then(({ screening: s }) => {
        setScreening(s);
        setNote(s.dentist_note || '');
      })
      .catch(() => setError('Could not load this case.'))
      .finally(() => setLoading(false));
  }, [id]);

  // ---------- Load image blob when case arrives ----------
  useEffect(() => {
    if (!screening?.image_path) return;
    setImageLoading(true);
    api
      .fetchImageBlob(screening.image_path)
      .then((url) => setImageBlob(url))
      .catch(() => setImageBlob(null))
      .finally(() => setImageLoading(false));

    // Revoke object URL on cleanup
    return () => {
      if (imageBlob) URL.revokeObjectURL(imageBlob);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screening?.image_path]);

  // ---------- Status update ----------
  async function updateStatus(newStatus) {
    setError('');
    setUpdating(true);
    try {
      const { screening: updated } = await api.updateScreeningStatus(id, {
        status: newStatus,
        dentist_note: note,
      });
      setScreening(updated);
      setNote(updated.dentist_note || '');
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  }

  // ---------- Loading ----------
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <span
          className="m-spinner m-spinner--lg"
          style={{ color: 'var(--accent)' }}
          role="status"
          aria-label="Loading case"
        />
      </div>
    );
  }

  // ---------- Not found ----------
  if (!screening) {
    return (
      <EmptyState
        icon="❌"
        title="Case not found"
        description={error || 'This case may not exist or you may not have access.'}
        action={
          <button
            className="m-btn m-btn--secondary"
            onClick={() => navigate('/dentist/cases')}
          >
            Back to cases
          </button>
        }
      />
    );
  }

  // ---------- Derived data ----------
  const riskKeys = Object.entries(screening.risk_factors || {})
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/_/g, ' '));

  const nextStatuses = STATUS_TRANSITIONS[screening.status] || [];
  const canCreatePlan =
    screening.status === 'under_review' || screening.status === 'reviewed';

  const submittedDate = new Date(screening.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="m-page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ------------------------------------------------------------------ */}
      {/* 1. HEADER                                                           */}
      {/* ------------------------------------------------------------------ */}
      <header>
        {/* Back link */}
        <Link
          to="/dentist/cases"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            color: 'var(--text-3)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            marginBottom: 14,
            transition: 'color var(--dur-fast)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; }}
        >
          <ChevronLeft size={14} />
          All cases
        </Link>

        {/* Patient info + status */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.625rem',
                fontWeight: 700,
                color: 'var(--text)',
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {screening.patient_name || 'Unknown Patient'}
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: 13, margin: '3px 0 0' }}>
              {screening.patient_email}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className={`m-badge m-badge--${screening.status}`}>
              {screening.status.replace(/_/g, ' ')}
            </span>
            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
              Submitted {submittedDate}
            </span>
          </div>
        </div>

        {/* Protected record indicator */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            marginTop: 10,
            color: 'var(--text-3)',
            fontSize: 11,
          }}
          aria-label="Protected clinical record"
        >
          <Lock size={11} />
          Protected clinical record
        </div>
      </header>

      {/* Error */}
      {error && (
        <ErrorMessage message={error} />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. MAIN LAYOUT — 2/3 left + 1/3 right                              */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 20,
        }}
        className="case-layout"
      >
        {/* ---- LEFT COLUMN ---- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Risk Factors */}
          <div className="m-card" style={{ padding: '18px 20px' }}>
            <SectionHeading>Risk Factors</SectionHeading>
            {riskKeys.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {riskKeys.map((r) => (
                  <RiskChip key={r} label={r} />
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-3)', fontSize: 13 }}>
                No risk factors reported
              </p>
            )}
          </div>

          {/* Symptoms */}
          <div className="m-card" style={{ padding: '18px 20px' }}>
            <SectionHeading>Reported Symptoms</SectionHeading>
            {screening.symptoms?.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {screening.symptoms.map((s) => (
                  <SymptomChip key={s} label={s.replace(/_/g, ' ')} />
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-3)', fontSize: 13 }}>
                No symptoms reported
              </p>
            )}

            {screening.symptom_duration && (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 6,
                }}
              >
                <span
                  className="m-eyebrow"
                  style={{ color: 'var(--text-3)', fontSize: 10 }}
                >
                  Duration
                </span>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>
                  {screening.symptom_duration}
                </span>
              </div>
            )}
          </div>

          {/* Patient Notes */}
          {screening.notes && (
            <div className="m-card" style={{ padding: '18px 20px' }}>
              <SectionHeading>Patient Notes</SectionHeading>
              <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>
                {screening.notes}
              </p>
            </div>
          )}

          {/* Clinical safety disclaimer */}
          <div
            role="note"
            style={{
              display: 'flex',
              gap: 10,
              background: 'var(--info-bg)',
              border: '1px solid rgba(2,132,199,0.20)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
            }}
          >
            <AlertCircle
              size={15}
              style={{ color: 'var(--info)', flexShrink: 0, marginTop: 1 }}
            />
            <p style={{ fontSize: 12, color: 'var(--info)', lineHeight: 1.55, margin: 0 }}>
              This is a patient-reported screening — not a clinical diagnosis.
              A clinical examination is required before any diagnosis or treatment decision.
            </p>
          </div>
        </div>

        {/* ---- RIGHT COLUMN ---- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Image Panel */}
          <div className="m-card" style={{ padding: '18px 20px' }}>
            <SectionHeading>Oral Image</SectionHeading>

            {screening.image_path ? (
              <>
                {imageLoading ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                      padding: '32px 0',
                    }}
                  >
                    <span
                      className="m-spinner m-spinner--md"
                      style={{ color: 'var(--text-3)' }}
                      role="status"
                      aria-label="Loading image"
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      Loading image…
                    </span>
                  </div>
                ) : imageBlob ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowImageModal(true)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: 0,
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        overflow: 'hidden',
                        cursor: 'zoom-in',
                        background: 'none',
                        transition: 'border-color var(--dur-fast)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                      aria-label="View full-size oral image"
                    >
                      <img
                        src={imageBlob}
                        alt="Patient oral image"
                        style={{
                          width: '100%',
                          display: 'block',
                          objectFit: 'cover',
                          maxHeight: 260,
                        }}
                      />
                    </button>
                    <p
                      style={{
                        marginTop: 7,
                        fontSize: 11,
                        color: 'var(--text-3)',
                        textAlign: 'center',
                      }}
                    >
                      Click to enlarge · Screening support only
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      padding: '28px 0',
                    }}
                  >
                    <ImageIcon size={22} style={{ color: 'var(--text-3)' }} />
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      Image could not be loaded
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '32px 0',
                }}
              >
                <ImageIcon size={22} style={{ color: 'var(--text-3)' }} />
                <p style={{ fontSize: 12, color: 'var(--text-3)' }}>No image uploaded</p>
              </div>
            )}
          </div>

          {/* Dentist Review */}
          <div className="m-card" style={{ padding: '18px 20px' }}>
            <SectionHeading>Dentist Review</SectionHeading>

            <textarea
              className="m-input"
              rows={4}
              placeholder="Add a clinical note for the patient…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                resize: 'vertical',
                minHeight: 90,
                fontSize: 13,
                lineHeight: 1.55,
              }}
              aria-label="Dentist review note"
            />

            {/* Status action buttons */}
            {nextStatuses.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {nextStatuses.map((s) => {
                  const cfg = STATUS_BUTTON_CONFIG[s] || { label: s, variant: 'secondary', icon: null };
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`m-btn m-btn--${cfg.variant === 'primary' ? 'primary' : 'secondary'}`}
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => updateStatus(s)}
                      disabled={updating}
                      aria-label={cfg.label}
                    >
                      {updating ? (
                        <span className="m-spinner m-spinner--sm" style={{ color: 'currentColor' }} />
                      ) : cfg.icon}
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  marginTop: 12,
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'var(--text-3)',
                  textAlign: 'center',
                }}
              >
                Case is {screening.status.replace(/_/g, ' ')}
              </div>
            )}
          </div>

          {/* Create Treatment Plan link */}
          <Link
            to={`/dentist/cases/${id}/clinical`}
            className="molar-case-tool"
          >
            <Mic size={18} />
            <span><strong>Voice clinical measurements</strong><small>Capture and correct findings hands-free</small></span>
          </Link>

          <Link
            to={`/dentist/cases/${id}/smile-design`}
            className="molar-case-tool"
          >
            <Sparkles size={18} />
            <span><strong>Digital Smile Design</strong><small>Create a proposal and control patient visibility</small></span>
          </Link>

          {/* Create Treatment Plan link */}
          {canCreatePlan && (
            <Link
              to={`/dentist/cases/${id}/plan`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'var(--success-bg)',
                border: '1px solid rgba(5,150,105,0.22)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 18px',
                textDecoration: 'none',
                transition: 'box-shadow var(--dur-fast), border-color var(--dur-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow)';
                e.currentTarget.style.borderColor = 'rgba(5,150,105,0.50)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(5,150,105,0.22)';
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius)',
                  background: 'rgba(5,150,105,0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileText size={18} style={{ color: 'var(--success)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: 'var(--success)',
                    margin: 0,
                  }}
                >
                  Create Treatment Plan
                </p>
                <p style={{ fontSize: 11, color: 'var(--success)', opacity: 0.75, margin: 0 }}>
                  Write a care plan for this patient
                </p>
              </div>
              <ChevronLeft
                size={14}
                style={{
                  color: 'var(--success)',
                  transform: 'rotate(180deg)',
                  flexShrink: 0,
                  opacity: 0.7,
                }}
              />
            </Link>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* IMAGE MODAL                                                         */}
      {/* ------------------------------------------------------------------ */}
      {showImageModal && imageBlob && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full-size oral image"
          onClick={() => setShowImageModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.82)',
            padding: 20,
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setShowImageModal(false)}
            aria-label="Close image"
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background var(--dur-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          >
            <X size={16} />
          </button>

          <img
            src={imageBlob}
            alt="Patient oral image — full size"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '100%',
              maxHeight: '90vh',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* Responsive layout hack — inject style once */}
      <style>{`
        @media (min-width: 1024px) {
          .case-layout {
            grid-template-columns: 2fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
