/**
 * DentistDashboard — clinical workspace for dentists.
 *
 * Sections:
 *   1. Header — "Clinical Workspace" + today's date + dentist name
 *   2. Priority strip — 3 stat cards (New Cases, Under Review, Active Plans)
 *   3. Recent cases panel — last 5 screenings
 *   4. Quick actions — review all cases
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Badge, Spinner, EmptyState } from '../components/ui';
import {
  ChevronRight,
  ClipboardList,
  Users,
  FileText,
  Calendar,
  AlertCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function riskCount(screening) {
  const rf = screening.risk_factors;
  if (!rf || typeof rf !== 'object') return 0;
  return Object.values(rf).filter(Boolean).length;
}

function symptomsPreview(symptoms) {
  if (!Array.isArray(symptoms) || symptoms.length === 0) return 'No symptoms reported';
  const preview = symptoms
    .slice(0, 2)
    .map((s) => s.replace(/_/g, ' '))
    .join(', ');
  return symptoms.length > 2 ? `${preview} +${symptoms.length - 2} more` : preview;
}

// ---------------------------------------------------------------------------
// StatCard — priority strip card
// ---------------------------------------------------------------------------
function StatCard({ icon, value, label, accent }) {
  const ACCENT_STYLES = {
    blue:    { icon: 'color: var(--info)',    bg: 'background: var(--info-bg);    border-color: rgba(2,132,199,0.20);' },
    amber:   { icon: 'color: var(--warning)', bg: 'background: var(--warning-bg); border-color: rgba(217,119,6,0.20);' },
    emerald: { icon: 'color: var(--success)', bg: 'background: var(--success-bg); border-color: rgba(5,150,105,0.20);' },
  };

  const a = ACCENT_STYLES[accent] || ACCENT_STYLES.blue;

  return (
    <div className="m-card" style={{ padding: '20px 22px' }}>
      {/* Icon badge */}
      <div
        className="inline-flex items-center justify-center rounded-xl"
        style={{
          width: 40,
          height: 40,
          ...Object.fromEntries(
            a.bg.split(';').filter(Boolean).map((rule) => {
              const [k, v] = rule.split(':').map((s) => s.trim());
              return [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v];
            }),
          ),
        }}
      >
        <span style={{ color: a.icon.split(':')[1].trim() }}>{icon}</span>
      </div>

      {/* Value */}
      <p
        className="m-stat-value"
        style={{ marginTop: 14, fontSize: '2rem', lineHeight: 1 }}
      >
        {value}
      </p>

      {/* Label */}
      <p
        className="m-eyebrow"
        style={{ marginTop: 4, color: 'var(--text-3)' }}
      >
        {label}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PatientAvatar
// ---------------------------------------------------------------------------
function PatientAvatar({ name }) {
  return (
    <div
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{
        width: 38,
        height: 38,
        background: 'var(--accent-3)',
        color: 'var(--accent)',
        fontWeight: 700,
        fontSize: 15,
        fontFamily: 'var(--font-display)',
      }}
      aria-hidden="true"
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DentistDashboard
// ---------------------------------------------------------------------------
export default function DentistDashboard() {
  const { user } = useAuth();
  const [screenings, setScreenings] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getScreenings().catch(() => ({ screenings: [] })),
      api.getPlans().catch(() => ({ plans: [] })),
    ])
      .then(([s, p]) => {
        setScreenings(s.screenings || []);
        setPlans(p.plans || []);
      })
      .catch(() => setError('Unable to load clinical data.'))
      .finally(() => setLoading(false));
  }, []);

  const newCases    = screenings.filter((s) => s.status === 'submitted').length;
  const underReview = screenings.filter((s) => s.status === 'under_review').length;
  const activePlans = plans.filter((p) => p.status === 'active').length;
  const recentCases = screenings.slice(0, 5);

  // ---------- Loading ----------
  if (loading) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}
      >
        <span
          className="m-spinner m-spinner--lg"
          style={{ color: 'var(--accent)' }}
          role="status"
          aria-label="Loading clinical workspace"
        />
      </div>
    );
  }

  return (
    <div className="m-page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ------------------------------------------------------------------ */}
      {/* 1. HEADER                                                           */}
      {/* ------------------------------------------------------------------ */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p className="m-eyebrow">{todayLabel()}</p>
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
          Clinical Workspace
        </h1>
        {user && (
          <p style={{ color: 'var(--text-3)', fontSize: 14, margin: 0 }}>
            Dr.{' '}
            <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>
              {user.name || user.email}
            </span>{' '}
            · Dentist
          </p>
        )}
      </header>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--danger-bg)',
            border: '1px solid rgba(220,38,38,0.20)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            color: 'var(--danger)',
            fontSize: 13,
          }}
        >
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. PRIORITY STRIP                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section aria-label="Case summary">
        <div
          className="m-stagger"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
        >
          <StatCard
            icon={<ClipboardList size={18} />}
            value={newCases}
            label="New Cases"
            accent="blue"
          />
          <StatCard
            icon={<Users size={18} />}
            value={underReview}
            label="Under Review"
            accent="amber"
          />
          <StatCard
            icon={<FileText size={18} />}
            value={activePlans}
            label="Active Plans"
            accent="emerald"
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. RECENT CASES PANEL                                               */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <div className="m-card" style={{ overflow: 'hidden' }}>
          {/* Panel header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 22px 14px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={15} style={{ color: 'var(--accent)' }} />
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                Recent Screenings
              </h2>
            </div>
            <Link
              to="/dentist/cases"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: 'var(--accent)',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.01em',
              }}
            >
              View all <ChevronRight size={12} />
            </Link>
          </div>

          {/* Case rows */}
          {recentCases.length > 0 ? (
            <div>
              {recentCases.map((s, idx) => {
                const risks = riskCount(s);
                return (
                  <Link
                    key={s.id}
                    to={`/dentist/cases/${s.id}`}
                    className="m-card--interactive"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 22px',
                      borderRadius: 0,
                      background: 'transparent',
                      borderTop: idx === 0 ? 'none' : '1px solid var(--border)',
                      borderBottom: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      transition: 'background var(--dur-fast) var(--ease-out)',
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Patient initial circle */}
                    <PatientAvatar name={s.patient_name} />

                    {/* Name + symptoms */}
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
                        {s.patient_name || 'Unknown patient'}
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
                        {symptomsPreview(s.symptoms)}
                      </p>
                    </div>

                    {/* Risk count chip */}
                    {risks > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
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

                    {/* Status badge */}
                    <span
                      className={`m-badge m-badge--${s.status}`}
                      style={{ flexShrink: 0 }}
                    >
                      {s.status.replace(/_/g, ' ')}
                    </span>

                    {/* Date */}
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-3)',
                        flexShrink: 0,
                        display: 'none',
                      }}
                      className="sm:inline"
                    >
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>

                    {/* Arrow */}
                    <ChevronRight
                      size={14}
                      style={{ color: 'var(--text-3)', flexShrink: 0, transition: 'color var(--dur-fast)' }}
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '0 22px' }}>
              <EmptyState
                icon="📋"
                title="No cases yet"
                description="Patient screening submissions will appear here."
              />
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. QUICK ACTIONS                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section aria-label="Quick actions">
        <p className="m-eyebrow" style={{ marginBottom: 12 }}>Quick actions</p>
        <Link
          to="/dentist/cases"
          className="m-card m-card--interactive"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '16px 20px',
            textDecoration: 'none',
            maxWidth: 380,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius)',
              background: 'var(--accent-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ClipboardList size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', margin: 0 }}>
              Review all cases
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
              Search, filter, and manage patient screenings
            </p>
          </div>
          <ChevronRight size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        </Link>
      </section>
    </div>
  );
}
