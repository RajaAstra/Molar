/**
 * CreatePlan — dentist creates a treatment plan for a patient screening.
 *
 * Linked from CaseDetail at /dentist/cases/:id/plan.
 *
 * Sections:
 *   1. Back link + heading "Create Treatment Plan" + patient name
 *   2. Card: Plan overview — title + patient-friendly explanation
 *   3. Card: Treatment steps — dynamic list (add / remove)
 *   4. Card: Scheduling — next appointment date picker
 *   5. Card: Follow-up reminder — task + due date (optional)
 *   6. Submit → "Save treatment plan"
 *   7. Success state — checkmark + message + navigation
 *
 * All original business logic is preserved. Only presentation is redesigned.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { Button, Input, Textarea, Card, ErrorMessage, Spinner } from '../components/ui';
import { ChevronLeft, Plus, X, CheckCircle2, Calendar } from 'lucide-react';

// ---------------------------------------------------------------------------
// SectionCard — titled card wrapper
// ---------------------------------------------------------------------------
function SectionCard({ title, subtitle, children }) {
  return (
    <div className="m-card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2
          className="m-eyebrow"
          style={{ color: 'var(--text-3)', marginBottom: subtitle ? 3 : 0 }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, marginTop: 2 }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FieldLabel
// ---------------------------------------------------------------------------
function FieldLabel({ htmlFor, children, optional = false }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-2)',
        marginBottom: 5,
      }}
    >
      {children}
      {optional && (
        <span style={{ fontWeight: 400, color: 'var(--text-3)', marginLeft: 5 }}>
          (optional)
        </span>
      )}
    </label>
  );
}

// ---------------------------------------------------------------------------
// StepRow
// ---------------------------------------------------------------------------
function StepRow({ index, step, onChange, onRemove, canRemove }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: '14px 14px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}
    >
      {/* Step number indicator */}
      <div
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--accent-3)',
          color: 'var(--accent)',
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {index + 1}
      </div>

      {/* Inputs */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <FieldLabel htmlFor={`step-desc-${index}`}>Step description</FieldLabel>
          <input
            id={`step-desc-${index}`}
            type="text"
            className="m-input"
            placeholder="e.g. Scale and root plane affected quadrants"
            value={step.step}
            onChange={(e) => onChange(index, 'step', e.target.value)}
            style={{ fontSize: 13 }}
          />
        </div>
        <div>
          <FieldLabel htmlFor={`step-detail-${index}`} optional>
            Patient-friendly detail
          </FieldLabel>
          <input
            id={`step-detail-${index}`}
            type="text"
            className="m-input"
            placeholder="Explain this step in plain language…"
            value={step.detail}
            onChange={(e) => onChange(index, 'detail', e.target.value)}
            style={{ fontSize: 13 }}
          />
        </div>
      </div>

      {/* Remove */}
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          aria-label={`Remove step ${index + 1}`}
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2,
            transition: 'background var(--dur-fast), color var(--dur-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--danger-bg)';
            e.currentTarget.style.color = 'var(--danger)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-3)';
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SuccessState
// ---------------------------------------------------------------------------
function SuccessState({ screeningId, onGoBack }) {
  const navigate = useNavigate();
  return (
    <div
      className="m-page-enter"
      style={{
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div
        className="m-card"
        style={{
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          textAlign: 'center',
        }}
      >
        {/* Checkmark */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--success-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircle2 size={30} style={{ color: 'var(--success)' }} />
        </div>

        {/* Heading */}
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text)',
              margin: '0 0 6px',
              letterSpacing: '-0.01em',
            }}
          >
            Plan saved
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.55 }}>
            Plan saved. Patient can now see it.
          </p>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            width: '100%',
            maxWidth: 280,
          }}
        >
          <button
            type="button"
            className="m-btn m-btn--primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => navigate(`/dentist/cases/${screeningId}`)}
          >
            Back to case
          </button>
          <button
            type="button"
            className="m-btn m-btn--secondary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => navigate('/dentist/cases')}
          >
            All cases
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CreatePlan — main component
// ---------------------------------------------------------------------------
export default function CreatePlan() {
  const { id: screeningId } = useParams();
  const navigate = useNavigate();

  const [screening, setScreening]     = useState(null);
  const [loadingCase, setLoadingCase] = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState('');

  // Form state
  const [title, setTitle]             = useState('');
  const [explanation, setExplanation] = useState('');
  const [steps, setSteps]             = useState([{ step: '', detail: '' }]);
  const [nextAppt, setNextAppt]       = useState('');
  const [followUpTask, setFollowUpTask] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // ---------- Load screening to get patient info ----------
  useEffect(() => {
    api
      .getScreening(screeningId)
      .then(({ screening: s }) => setScreening(s))
      .catch(() => setError('Could not load screening details.'))
      .finally(() => setLoadingCase(false));
  }, [screeningId]);

  // ---------- Step helpers ----------
  function addStep() {
    setSteps((prev) => [...prev, { step: '', detail: '' }]);
  }

  function removeStep(i) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateStep(i, field, value) {
    setSteps((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)),
    );
  }

  // ---------- Submit ----------
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a treatment title.');
      return;
    }
    if (!explanation.trim()) {
      setError('Please enter a patient-friendly explanation.');
      return;
    }

    setSubmitting(true);
    try {
      const filteredSteps = steps.filter((s) => s.step.trim());

      const { plan } = await api.createPlan({
        patient_id:       screening.patient_id,
        screening_id:     Number(screeningId),
        title:            title.trim(),
        explanation:      explanation.trim(),
        steps:            filteredSteps,
        next_appointment: nextAppt || undefined,
      });

      // Optionally create a follow-up task
      if (followUpTask.trim()) {
        await api.createFollowUp({
          patient_id: screening.patient_id,
          plan_id:    plan.id,
          task:       followUpTask.trim(),
          due_date:   followUpDate || undefined,
        });
      }

      setDone(true);
    } catch (err) {
      setError(err.message || 'Failed to create treatment plan.');
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Loading ----------
  if (loadingCase) {
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
          aria-label="Loading screening"
        />
      </div>
    );
  }

  // ---------- Success ----------
  if (done) {
    return <SuccessState screeningId={screeningId} />;
  }

  // ---------- Render form ----------
  return (
    <div
      className="m-page-enter"
      style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* 1. HEADER                                                           */}
      {/* ------------------------------------------------------------------ */}
      <header>
        <Link
          to={`/dentist/cases/${screeningId}`}
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
          Back to case
        </Link>

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
          Create Treatment Plan
        </h1>

        {screening && (
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 5 }}>
            For patient:{' '}
            <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>
              {screening.patient_name}
            </span>
          </p>
        )}
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* FORM                                                                */}
      {/* ------------------------------------------------------------------ */}
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
        noValidate
      >
        {/* ---- 2. Plan Overview ---- */}
        <SectionCard
          title="Plan Overview"
          subtitle="Give the plan a clear title and explain it in language the patient can understand."
        >
          <div>
            <FieldLabel htmlFor="plan-title">Treatment title</FieldLabel>
            <input
              id="plan-title"
              type="text"
              className="m-input"
              placeholder="e.g. Periodontal Disease Management"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoComplete="off"
              style={{ fontSize: 14 }}
            />
          </div>

          <div>
            <FieldLabel htmlFor="plan-explanation">Patient-friendly explanation</FieldLabel>
            <textarea
              id="plan-explanation"
              className="m-input"
              rows={5}
              placeholder="Explain the treatment in plain language. Avoid clinical jargon where possible. The patient will read this directly."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              required
              style={{ resize: 'vertical', minHeight: 100, fontSize: 13, lineHeight: 1.55 }}
            />
          </div>
        </SectionCard>

        {/* ---- 3. Treatment Steps ---- */}
        <SectionCard
          title="Treatment Steps"
          subtitle="Break the treatment into clear, numbered steps."
        >
          {/* Step list */}
          <div
            className="m-stagger"
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {steps.map((s, i) => (
              <StepRow
                key={i}
                index={i}
                step={s}
                onChange={updateStep}
                onRemove={removeStep}
                canRemove={steps.length > 1}
              />
            ))}
          </div>

          {/* Add step */}
          <button
            type="button"
            onClick={addStep}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: '1.5px dashed var(--border-2)',
              borderRadius: 'var(--radius)',
              padding: '9px 14px',
              color: 'var(--accent)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'border-color var(--dur-fast), background var(--dur-fast)',
              width: '100%',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'var(--accent-3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-2)';
              e.currentTarget.style.background = 'none';
            }}
          >
            <Plus size={14} />
            Add step
          </button>
        </SectionCard>

        {/* ---- 4. Scheduling ---- */}
        <SectionCard title="Scheduling">
          <div>
            <FieldLabel htmlFor="next-appt" optional>
              <Calendar size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Next appointment date
            </FieldLabel>
            <input
              id="next-appt"
              type="date"
              className="m-input"
              value={nextAppt}
              onChange={(e) => setNextAppt(e.target.value)}
              style={{ fontSize: 13, maxWidth: 240 }}
            />
          </div>
        </SectionCard>

        {/* ---- 5. Follow-up Reminder ---- */}
        <SectionCard
          title="Follow-up Reminder"
          subtitle="Set a task to remind you to check in with this patient."
        >
          <div>
            <FieldLabel htmlFor="followup-task" optional>Follow-up task</FieldLabel>
            <input
              id="followup-task"
              type="text"
              className="m-input"
              placeholder="e.g. Return for re-evaluation and probing"
              value={followUpTask}
              onChange={(e) => setFollowUpTask(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>

          <div>
            <FieldLabel htmlFor="followup-date" optional>Due date</FieldLabel>
            <input
              id="followup-date"
              type="date"
              className="m-input"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              style={{ fontSize: 13, maxWidth: 240 }}
            />
          </div>
        </SectionCard>

        {/* ---- Error ---- */}
        {error && <ErrorMessage message={error} />}

        {/* ---- 6. Submit ---- */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="submit"
            className="m-btn m-btn--primary m-btn--lg"
            disabled={submitting}
            aria-label="Save treatment plan"
          >
            {submitting ? (
              <span className="m-spinner m-spinner--sm" style={{ color: '#fff' }} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            Save treatment plan
          </button>

          <button
            type="button"
            className="m-btn m-btn--ghost"
            onClick={() => navigate(`/dentist/cases/${screeningId}`)}
            disabled={submitting}
            style={{ fontSize: 13 }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
