/**
 * PatientDashboard — premium patient hub.
 *
 * Layout:
 *   1. Context-aware hero (greeting + headline driven by journey stage)
 *   2. Care stage strip (horizontal pills)
 *   3. 2-col grid: latest screening card + active treatment plan card
 *   4. Follow-up row (pending items)
 *   5. Quick-action tiles
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Badge, Spinner, EmptyState } from '../components/ui';
import {
  ChevronRight,
  Calendar,
  ClipboardList,
  Activity,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Care stage definitions
// ---------------------------------------------------------------------------
const CARE_STAGES = [
  { key: 'screened',    label: 'Screened' },
  { key: 'reviewed',   label: 'Reviewed' },
  { key: 'treatment',  label: 'Treatment' },
  { key: 'followup',   label: 'Follow-up' },
  { key: 'maintenance',label: 'Maintenance' },
];

function getStageIndex(screenings, plans, followUps) {
  if (!screenings.length) return -1;
  const s = screenings[0];
  const activePlan = plans.find((p) => p.status === 'active') || plans[0] || null;
  if (activePlan) {
    const allDone =
      followUps.length > 0 && followUps.every((f) => f.status === 'completed');
    if (allDone) return 4; // Maintenance
    if (followUps.length > 0) return 3; // Follow-up
    return 2; // Treatment
  }
  if (s.status === 'reviewed') return 1;
  return 0; // Screened, awaiting review
}

// ---------------------------------------------------------------------------
// Hero section — context-aware headline
// ---------------------------------------------------------------------------
function HeroSection({ user, screenings, plans }) {
  const firstName = user?.name?.split(' ')[0] || 'there';
  const activePlan = plans.find((p) => p.status === 'active') || plans[0] || null;
  const latestScreening = screenings[0] || null;

  let headline, sub, cta;

  if (!latestScreening) {
    headline = 'Start your dental journey.';
    sub = 'Complete a short oral health screening to get professional feedback from a dentist.';
    cta = (
      <Link
        to="/screening"
        className="m-btn m-btn--primary m-btn--lg inline-flex items-center gap-2"
      >
        Begin screening <ArrowRight size={16} />
      </Link>
    );
  } else if (activePlan) {
    headline = 'Your care is moving forward.';
    sub = `Your treatment plan "${activePlan.title}" is active. Keep following through on your steps.`;
    cta = (
      <Link
        to="/journey"
        className="m-btn m-btn--primary m-btn--lg inline-flex items-center gap-2"
      >
        View my journey <ArrowRight size={16} />
      </Link>
    );
  } else {
    headline = 'Your screening is being reviewed.';
    sub =
      'A dental professional will review your submission and create a treatment plan for you.';
    cta = (
      <span
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
        style={{
          background: 'var(--warning-bg)',
          borderColor: 'rgba(217,119,6,0.25)',
          color: 'var(--warning)',
        }}
      >
        <span
          className="h-2 w-2 rounded-full animate-pulse"
          style={{ background: 'var(--warning)' }}
        />
        Under review
      </span>
    );
  }

  return (
    <div
      className="rounded-[var(--radius-xl)] p-8 sm:p-10 overflow-hidden relative"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--accent) 7%, var(--surface)) 0%, var(--surface) 60%)',
        border: '1px solid var(--border-accent)',
        boxShadow: 'var(--shadow)',
      }}
    >
      {/* Decorative accent blob */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          background: 'var(--accent-glow)',
          filter: 'blur(64px)',
          pointerEvents: 'none',
        }}
      />

      <p className="m-eyebrow mb-3">
        {timeGreeting()}, {firstName}
      </p>

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          color: 'var(--text)',
          maxWidth: '560px',
        }}
      >
        {headline}
      </h1>

      <p
        className="mt-3 text-base leading-relaxed"
        style={{ color: 'var(--text-2)', maxWidth: '480px' }}
      >
        {sub}
      </p>

      <div className="mt-6">{cta}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Care stage strip
// ---------------------------------------------------------------------------
function CareStageStrip({ currentIndex }) {
  return (
    <div
      className="m-card flex items-center gap-1 overflow-x-auto p-3"
      style={{ scrollbarWidth: 'none' }}
    >
      {CARE_STAGES.map((stage, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isUpcoming = i > currentIndex;

        return (
          <div key={stage.key} className="flex items-center gap-1 shrink-0">
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200"
              style={
                isCurrent
                  ? {
                      background: 'var(--accent)',
                      color: '#fff',
                      boxShadow: '0 2px 8px var(--accent-glow)',
                    }
                  : isDone
                  ? {
                      background: 'var(--success-bg)',
                      color: 'var(--success)',
                      border: '1px solid rgba(5,150,105,0.20)',
                    }
                  : {
                      background: 'var(--surface-2)',
                      color: 'var(--text-3)',
                      border: '1px solid var(--border)',
                    }
              }
            >
              {isDone && '✓ '}
              {stage.label}
            </span>
            {i < CARE_STAGES.length - 1 && (
              <ChevronRight
                size={12}
                style={{ color: isDone ? 'var(--success)' : 'var(--border-2)', flexShrink: 0 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Latest screening card
// ---------------------------------------------------------------------------
function ScreeningCard({ screening }) {
  if (!screening) {
    return (
      <div className="m-card p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-base font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
          >
            Latest Screening
          </h2>
          <Link
            to="/screening"
            className="m-eyebrow flex items-center gap-1 hover:opacity-70 transition-opacity"
          >
            Start now <ChevronRight size={11} />
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl mb-3"
            style={{ background: 'var(--surface-2)' }}
          >
            🦷
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            No screening yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
            Complete your first oral health screening
          </p>
          <Link to="/screening" className="m-btn m-btn--primary m-btn--sm mt-4 inline-flex">
            Start screening
          </Link>
        </div>
      </div>
    );
  }

  const symptoms = Array.isArray(screening.symptoms)
    ? screening.symptoms
    : JSON.parse(screening.symptoms || '[]');

  const riskFactors =
    typeof screening.risk_factors === 'object' && !Array.isArray(screening.risk_factors)
      ? Object.keys(screening.risk_factors).filter((k) => screening.risk_factors[k])
      : [];

  return (
    <div className="m-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h2
          className="text-base font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          Latest Screening
        </h2>
        <div className="flex items-center gap-2">
          <Badge status={screening.status} />
          <Link
            to="/screening"
            className="m-eyebrow flex items-center gap-1 hover:opacity-70 transition-opacity"
          >
            New <ChevronRight size={11} />
          </Link>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {/* Submitted date */}
        <div className="flex items-center gap-2">
          <Calendar size={13} style={{ color: 'var(--text-3)' }} />
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>
            Submitted {formatDate(screening.created_at)}
          </span>
        </div>

        {/* Symptoms */}
        {symptoms.length > 0 ? (
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-3)' }}
            >
              Reported symptoms
            </p>
            <div className="flex flex-wrap gap-1.5">
              {symptoms.slice(0, 5).map((s) => (
                <span
                  key={s}
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--text-2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {s.replace(/_/g, ' ')}
                </span>
              ))}
              {symptoms.length > 5 && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--text-3)',
                    border: '1px solid var(--border)',
                  }}
                >
                  +{symptoms.length - 5} more
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            No symptoms reported.
          </p>
        )}

        {/* Image indicator */}
        {screening.image_filename && (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
            style={{
              background: 'var(--success-bg)',
              color: 'var(--success)',
              border: '1px solid rgba(5,150,105,0.20)',
            }}
          >
            <span>📷</span> Oral image attached
          </div>
        )}

        {/* Dentist note */}
        {screening.dentist_note && (
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--text-3)' }}
            >
              Dentist note
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
              {screening.dentist_note}
            </p>
          </div>
        )}

        {/* Awaiting review info banner */}
        {screening.status === 'submitted' && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              background: 'var(--info-bg)',
              border: '1px solid rgba(2,132,199,0.20)',
              color: 'var(--info)',
            }}
          >
            Your screening has been received. A dental professional will review it shortly.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active treatment plan card
// ---------------------------------------------------------------------------
function PlanCard({ plan }) {
  if (!plan) {
    return (
      <div className="m-card p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-base font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
          >
            Treatment Plan
          </h2>
          <Link
            to="/journey"
            className="m-eyebrow flex items-center gap-1 hover:opacity-70 transition-opacity"
          >
            Journey <ChevronRight size={11} />
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl mb-3"
            style={{ background: 'var(--surface-2)' }}
          >
            📋
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            No treatment plan yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
            Your dentist will create a plan after reviewing your screening.
          </p>
        </div>
      </div>
    );
  }

  const steps = Array.isArray(plan.steps)
    ? plan.steps
    : JSON.parse(plan.steps || '[]');

  return (
    <div className="m-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h2
          className="text-base font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          Treatment Plan
        </h2>
        <Link
          to="/journey"
          className="m-eyebrow flex items-center gap-1 hover:opacity-70 transition-opacity"
        >
          Full journey <ChevronRight size={11} />
        </Link>
      </div>

      <div className="flex-1 space-y-4">
        {/* Title + status */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p
              className="font-bold text-base leading-tight truncate"
              style={{ color: 'var(--text)' }}
            >
              {plan.title}
            </p>
            {plan.dentist_name && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                by Dr. {plan.dentist_name}
              </p>
            )}
          </div>
          <Badge status={plan.status} />
        </div>

        {/* Explanation excerpt */}
        {plan.explanation && (
          <p
            className="text-sm leading-relaxed line-clamp-3"
            style={{ color: 'var(--text-2)' }}
          >
            {plan.explanation}
          </p>
        )}

        {/* Steps preview */}
        {steps.length > 0 && (
          <div className="space-y-2">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-3)' }}
            >
              Treatment steps
            </p>
            <ol className="space-y-1.5">
              {steps.slice(0, 3).map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5"
                    style={{
                      background: 'var(--accent-3)',
                      color: 'var(--accent)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: 'var(--text-2)' }}>
                    {typeof step === 'object' ? step.step : step}
                  </span>
                </li>
              ))}
              {steps.length > 3 && (
                <li className="text-xs pl-7" style={{ color: 'var(--text-3)' }}>
                  +{steps.length - 3} more steps
                </li>
              )}
            </ol>
          </div>
        )}

        {/* Next appointment */}
        {plan.next_appointment && (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{
              background: 'var(--accent-3)',
              border: '1px solid var(--border-accent)',
            }}
          >
            <Calendar size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span className="text-xs" style={{ color: 'var(--text-2)' }}>
              Next appointment:
            </span>
            <span
              className="text-xs font-bold ml-auto"
              style={{ color: 'var(--accent)' }}
            >
              {formatDate(plan.next_appointment)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Follow-up row
// ---------------------------------------------------------------------------
function FollowUpRow({ followUps }) {
  const pending = followUps.filter((f) => f.status === 'pending');
  if (pending.length === 0) return null;

  return (
    <div className="m-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-base font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          Pending Follow-ups
        </h2>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-bold"
          style={{
            background: 'var(--warning-bg)',
            color: 'var(--warning)',
            border: '1px solid rgba(217,119,6,0.20)',
          }}
        >
          {pending.length} pending
        </span>
      </div>

      <div className="space-y-2">
        {pending.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-4 rounded-xl px-4 py-3"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <span
              className="h-2 w-2 rounded-full shrink-0 animate-pulse"
              style={{ background: 'var(--warning)' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                {f.task}
              </p>
              {f.due_date && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                  Due {formatDate(f.due_date)}
                </p>
              )}
            </div>
            <Badge status={f.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick action tiles
// ---------------------------------------------------------------------------
function QuickActions() {
  const tiles = [
    {
      to: '/screening',
      icon: <ClipboardList size={20} style={{ color: 'var(--accent)' }} />,
      title: 'New Screening',
      desc: 'Answer a few quick questions',
    },
    {
      to: '/journey',
      icon: <Activity size={20} style={{ color: 'var(--accent)' }} />,
      title: 'View Journey',
      desc: 'Track your care progress',
    },
    {
      to: '/journey',
      icon: <MessageCircle size={20} style={{ color: 'var(--accent)' }} />,
      title: 'Ask Dento',
      desc: 'Get answers about your care',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {tiles.map((tile) => (
        <Link
          key={tile.to + tile.title}
          to={tile.to}
          className="m-card m-card--interactive group flex items-center gap-4 p-5 transition-all duration-200 hover:border-[var(--border-accent)]"
          style={{ textDecoration: 'none' }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200"
            style={{
              background: 'var(--surface-2)',
            }}
          >
            {tile.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {tile.title}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
              {tile.desc}
            </p>
          </div>
          <ArrowRight
            size={14}
            className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
            style={{ color: 'var(--text-3)' }}
          />
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function PatientDashboard() {
  const { user } = useAuth();
  const [screenings, setScreenings] = useState([]);
  const [plans, setPlans] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getScreenings().catch(() => ({ screenings: [] })),
      api.getPlans().catch(() => ({ plans: [] })),
      api.getFollowUps().catch(() => ({ followUps: [] })),
    ]).then(([s, p, f]) => {
      setScreenings(s.screenings || []);
      setPlans(p.plans || []);
      setFollowUps(f.followUps || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span
          className="m-spinner m-spinner--lg"
          role="status"
          aria-label="Loading"
          style={{ color: 'var(--accent)' }}
        />
      </div>
    );
  }

  const latestScreening = screenings[0] || null;
  const activePlan = plans.find((p) => p.status === 'active') || plans[0] || null;
  const stageIndex = getStageIndex(screenings, plans, followUps);

  return (
    <div className="m-page-enter space-y-6">
      {/* 1. Hero */}
      <HeroSection user={user} screenings={screenings} plans={plans} />

      {/* 2. Care stage strip — only show once screening started */}
      {stageIndex >= 0 && <CareStageStrip currentIndex={stageIndex} />}

      {/* 3. Main 2-col grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ScreeningCard screening={latestScreening} />
        <PlanCard plan={activePlan} />
      </div>

      {/* 4. Follow-up row */}
      <FollowUpRow followUps={followUps} />

      {/* 5. Quick actions */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-3)' }}
        >
          Quick actions
        </p>
        <QuickActions />
      </div>

      {/* Safety disclaimer */}
      <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
        MOLAR provides screening support only.{' '}
        <span className="font-semibold">This is not a substitute for professional dental care.</span>
      </p>
    </div>
  );
}
