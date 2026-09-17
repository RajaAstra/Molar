/**
 * DentistCases — full clinical case list.
 *
 * Features:
 *   - Search by patient name / email
 *   - Status filter pills
 *   - Table-like list: avatar, name, email, symptoms count, risk count,
 *     image indicator, status badge, date, arrow
 *   - Empty state
 *   - Click → /dentist/cases/:id
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Badge, Spinner, EmptyState } from '../components/ui';
import { Search, ChevronRight, Filter } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STATUS_FILTERS = [
  { value: 'all',          label: 'All' },
  { value: 'submitted',    label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'reviewed',     label: 'Reviewed' },
  { value: 'closed',       label: 'Closed' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function riskCount(screening) {
  const rf = screening.risk_factors;
  if (!rf || typeof rf !== 'object') return 0;
  return Object.values(rf).filter(Boolean).length;
}

function symptomsLabel(symptoms) {
  if (!Array.isArray(symptoms) || symptoms.length === 0) return null;
  return `${symptoms.length} symptom${symptoms.length > 1 ? 's' : ''}`;
}

// ---------------------------------------------------------------------------
// PatientAvatar
// ---------------------------------------------------------------------------
function PatientAvatar({ name, size = 40 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--accent-3)',
        color: 'var(--accent)',
        fontWeight: 700,
        fontSize: size * 0.35,
        fontFamily: 'var(--font-display)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterPill
// ---------------------------------------------------------------------------
function FilterPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? '' : 'm-card--interactive'}
      style={{
        padding: '6px 14px',
        borderRadius: 'var(--radius-pill)',
        fontSize: 12,
        fontWeight: 600,
        border: active ? 'none' : '1px solid var(--border)',
        background: active ? 'var(--accent)' : 'var(--surface)',
        color: active ? '#fff' : 'var(--text-2)',
        cursor: 'pointer',
        transition: 'all var(--dur-fast) var(--ease-out)',
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// CaseRow
// ---------------------------------------------------------------------------
function CaseRow({ screening, isLast }) {
  const risks = riskCount(screening);
  const sympLabel = symptomsLabel(screening.symptoms);

  return (
    <Link
      to={`/dentist/cases/${screening.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 20px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: 'transparent',
        textDecoration: 'none',
        transition: 'background var(--dur-fast) var(--ease-out)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Avatar */}
      <PatientAvatar name={screening.patient_name} />

      {/* Patient info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--text)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {screening.patient_name || '—'}
        </p>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-3)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {screening.patient_email || ''}
        </p>
      </div>

      {/* Symptoms count */}
      {sympLabel && (
        <span
          style={{
            display: 'none',
            alignItems: 'center',
            background: 'var(--danger-bg)',
            border: '1px solid rgba(220,38,38,0.18)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-pill)',
            padding: '3px 9px',
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          className="symptom-chip"
        >
          {sympLabel}
        </span>
      )}

      {/* Risk count */}
      {risks > 0 && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--warning-bg)',
            border: '1px solid rgba(217,119,6,0.20)',
            color: 'var(--warning)',
            borderRadius: 'var(--radius-pill)',
            padding: '3px 9px',
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {risks} risk
        </span>
      )}

      {/* Image indicator */}
      {screening.image_path && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-3)',
            flexShrink: 0,
            display: 'none',
          }}
          className="image-chip"
        >
          📷 Image
        </span>
      )}

      {/* Status badge */}
      <span
        className={`m-badge m-badge--${screening.status}`}
        style={{ flexShrink: 0 }}
      >
        {screening.status.replace(/_/g, ' ')}
      </span>

      {/* Date */}
      <span
        style={{
          fontSize: 11,
          color: 'var(--text-3)',
          flexShrink: 0,
          minWidth: 72,
          textAlign: 'right',
        }}
      >
        {new Date(screening.created_at).toLocaleDateString()}
      </span>

      {/* Arrow */}
      <ChevronRight size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// DentistCases
// ---------------------------------------------------------------------------
export default function DentistCases() {
  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');

  useEffect(() => {
    api
      .getScreenings()
      .then(({ screenings: s }) => setScreenings(s || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = screenings.filter((s) => {
    const matchStatus =
      filter === 'all' || s.status === filter;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      (s.patient_name || '').toLowerCase().includes(q) ||
      (s.patient_email || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // ---------- Loading ----------
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 0',
        }}
      >
        <span
          className="m-spinner m-spinner--lg"
          style={{ color: 'var(--accent)' }}
          role="status"
          aria-label="Loading patient cases"
        />
      </div>
    );
  }

  return (
    <div className="m-page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ------------------------------------------------------------------ */}
      {/* PAGE HEADER                                                         */}
      {/* ------------------------------------------------------------------ */}
      <header>
        <p className="m-eyebrow" style={{ marginBottom: 4 }}>Clinical case list</p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.875rem',
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          Patient Cases
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
          {screenings.length} screening{screenings.length !== 1 ? 's' : ''} submitted
        </p>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* SEARCH + FILTER BAR                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative', minWidth: 220, flex: '0 1 300px' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-3)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="search"
            className="m-input"
            placeholder="Search patients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              paddingLeft: 36,
              paddingTop: 9,
              paddingBottom: 9,
              fontSize: 13,
            }}
            aria-label="Search patients by name or email"
          />
        </div>

        {/* Status filter pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
          role="group"
          aria-label="Filter by status"
        >
          <Filter size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          {STATUS_FILTERS.map((f) => (
            <FilterPill
              key={f.value}
              label={f.label}
              active={filter === f.value}
              onClick={() => setFilter(f.value)}
            />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CASE LIST                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="m-card" style={{ overflow: 'hidden', padding: 0 }}>
        {filtered.length > 0 ? (
          <div>
            {/* Column header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '10px 20px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            >
              <div style={{ width: 40, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span
                  className="m-eyebrow"
                  style={{ color: 'var(--text-3)', fontSize: 10 }}
                >
                  Patient
                </span>
              </div>
              <span
                className="m-eyebrow"
                style={{ color: 'var(--text-3)', fontSize: 10, minWidth: 72, textAlign: 'right' }}
              >
                Date
              </span>
              <div style={{ width: 14, flexShrink: 0 }} />
            </div>

            {/* Rows */}
            {filtered.map((s, idx) => (
              <CaseRow
                key={s.id}
                screening={s}
                isLast={idx === filtered.length - 1}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={search ? '🔍' : '📋'}
            title={search ? 'No matching cases' : 'No cases yet'}
            description={
              search
                ? 'Try a different name, email, or change the status filter.'
                : 'Patient screening submissions will appear here.'
            }
          />
        )}
      </div>

      {/* Result count */}
      {filtered.length > 0 && (
        <p
          style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}
          aria-live="polite"
        >
          Showing {filtered.length} of {screenings.length} case{screenings.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
