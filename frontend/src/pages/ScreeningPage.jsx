/**
 * ScreeningPage — focused, guided oral health screening experience.
 *
 * SAFETY: This screening does NOT diagnose disease.
 * All result language uses "professional evaluation recommended" framing.
 *
 * Steps:
 *   1. Introduction & informed consent
 *   2. Risk factors (tobacco, alcohol, areca nut, etc.)
 *   3. Symptoms (oral ulcer, patches, lumps, etc.)
 *   4. Duration & notes
 *   5. Optional oral image upload
 *   6. Review & submit
 *   7. Confirmation / result view
 *
 * Design: one centered step card, max-w-xl, full focus.
 * Progress: thin accent bar at top. Step N of 7 eyebrow.
 * Selections use large toggle cards (accent border + light accent bg when selected).
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import {
  ChevronRight,
  ChevronLeft,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

const TOTAL_STEPS = 7;

// ---------------------------------------------------------------------------
// Data definitions — preserved from Phase 1
// ---------------------------------------------------------------------------

const RISK_FACTORS = [
  { key: 'tobacco_smoking',      label: 'Tobacco smoking',                       desc: 'Cigarettes, cigars, pipe' },
  { key: 'smokeless_tobacco',    label: 'Smokeless tobacco',                     desc: 'Chewing tobacco, snuff' },
  { key: 'areca_nut',            label: 'Areca nut / Betel quid',                desc: 'Pan, gutka, supari' },
  { key: 'alcohol',              label: 'Alcohol use',                           desc: 'Regular consumption' },
  { key: 'hpv_history',          label: 'Known HPV history',                     desc: 'Previously diagnosed' },
  { key: 'sun_exposure',         label: 'Prolonged sun exposure',                desc: 'Lips specifically' },
  { key: 'poor_oral_hygiene',    label: 'Poor oral hygiene',                     desc: 'Infrequent brushing/flossing' },
  { key: 'ill_fitting_dentures', label: 'Ill-fitting dentures or dental appliances', desc: '' },
];

const SYMPTOMS = [
  { key: 'persistent_ulcer',      label: 'Persistent oral ulcer',        desc: 'Sore that does not heal in 2+ weeks' },
  { key: 'white_patch',           label: 'White patch in mouth',         desc: 'Leukoplakia-like appearance' },
  { key: 'red_patch',             label: 'Red or mixed patch',           desc: 'Erythroplakia or red/white area' },
  { key: 'lump_thickening',       label: 'Lump or thickening',           desc: 'In cheek, tongue, or lip' },
  { key: 'unexplained_bleeding',  label: 'Unexplained oral bleeding',    desc: 'Not from obvious injury' },
  { key: 'difficulty_swallowing', label: 'Difficulty swallowing',        desc: 'Dysphagia, pain on swallowing' },
  { key: 'jaw_stiffness',         label: 'Jaw stiffness or pain',        desc: 'Trismus, difficulty opening mouth' },
  { key: 'tooth_sensitivity',     label: 'Tooth sensitivity or pain',    desc: 'Hot, cold, or pressure' },
  { key: 'gum_problems',          label: 'Bleeding or swollen gums',     desc: 'Gingivitis-like symptoms' },
  { key: 'bad_breath',            label: 'Persistent bad breath',        desc: 'Not relieved by brushing' },
  { key: 'loose_teeth',           label: 'Loose or shifting teeth',      desc: '' },
  { key: 'numbness',              label: 'Numbness or tingling',         desc: 'In mouth, lips, or face' },
];

const DURATION_OPTIONS = [
  'Less than 1 week',
  '1–2 weeks',
  '2–4 weeks',
  '1–3 months',
  'More than 3 months',
  'Not sure',
];

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

/** Thin accent progress bar at the very top of the page */
function TopProgressBar({ step, total }) {
  const pct = Math.round(((step - 1) / (total - 1)) * 100);
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50"
      style={{ height: '3px', background: 'var(--surface-3)' }}
    >
      <div
        className="m-progress__fill h-full"
        style={{ width: `${pct}%`, transition: 'width 0.5s cubic-bezier(0.0,0,0.2,1)' }}
      />
    </div>
  );
}

/** Step eyebrow + navigation buttons row */
function StepNav({ step, total, onBack, onNext, nextLabel = 'Continue', nextDisabled = false, loading = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      {step > 1 ? (
        <button
          type="button"
          onClick={onBack}
          className="m-btn m-btn--ghost m-btn--sm inline-flex items-center gap-1"
          disabled={loading}
        >
          <ChevronLeft size={15} /> Back
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || loading}
        className="m-btn m-btn--primary inline-flex items-center gap-2"
      >
        {loading && (
          <span
            className="m-spinner m-spinner--sm"
            style={{ color: 'var(--accent-2)' }}
            role="status"
            aria-label="Loading"
          />
        )}
        {nextLabel}
        {!loading && <ChevronRight size={15} />}
      </button>
    </div>
  );
}

/** Toggle card used for risk factors and symptoms */
function ToggleCard({ selected, onClick, label, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-150 focus-visible:outline-none"
      style={
        selected
          ? {
              background: 'color-mix(in srgb, var(--accent) 8%, var(--surface))',
              borderColor: 'var(--accent)',
              boxShadow: '0 0 0 1px var(--accent)',
            }
          : {
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }
      }
      aria-pressed={selected}
    >
      {/* Custom checkbox */}
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150"
        style={
          selected
            ? { background: 'var(--accent)', borderColor: 'var(--accent)' }
            : { borderColor: 'var(--border-2)', background: 'transparent' }
        }
        aria-hidden="true"
      >
        {selected && (
          <svg viewBox="0 0 10 8" fill="none" width="10" height="8">
            <path d="M1 4l3 3 5-6" stroke="#f5d77a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <p
          className="text-sm font-semibold leading-tight"
          style={{ color: selected ? 'var(--accent)' : 'var(--text)' }}
        >
          {label}
        </p>
        {desc && (
          <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-3)' }}>
            {desc}
          </p>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Introduction
// ---------------------------------------------------------------------------
function StepIntro({ onNext }) {
  return (
    <div className="space-y-7">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
        style={{ background: 'var(--accent-3)' }}
      >
        🦷
      </div>

      <div>
        <p className="m-eyebrow mb-2">Oral health screening</p>
        <h2
          className="text-2xl font-bold leading-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          Let's assess your oral health.
        </h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          This short questionnaire helps your dental team understand your oral health and
          any symptoms you may have noticed. It takes about 2–3 minutes.
        </p>
      </div>

      {/* Safety notice */}
      <div
        className="rounded-2xl p-4 flex gap-3"
        style={{
          background: 'var(--warning-bg)',
          border: '1px solid rgba(217,119,6,0.25)',
        }}
      >
        <AlertCircle size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '1px' }} />
        <div className="text-sm" style={{ color: 'var(--warning)' }}>
          <p className="font-semibold mb-0.5">Important</p>
          <p className="leading-relaxed opacity-90">
            This screening is not a diagnosis. A dental professional should evaluate concerning
            findings. Results are for screening purposes only and do not replace a clinical
            examination.
          </p>
        </div>
      </div>

      {/* What to expect */}
      <ul className="space-y-2.5">
        {[
          'Takes about 2–3 minutes to complete',
          'Your responses are shared with your dental team',
          'Optional: upload a photo of your mouth',
        ].map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-2)' }}>
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: 'var(--accent)' }}
            />
            {item}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onNext}
        className="m-btn m-btn--primary m-btn--lg w-full sm:w-auto inline-flex items-center gap-2"
      >
        Begin screening <ArrowRight size={16} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Risk factors
// ---------------------------------------------------------------------------
function StepRiskFactors({ value, onChange, onNext, onBack }) {
  function toggle(key) {
    onChange({ ...value, [key]: !value[key] });
  }
  const selectedCount = Object.values(value).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="m-eyebrow mb-1">Step 2 of 7</p>
        <h2
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          Risk Factors
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Select any that apply to you. This helps identify relevant risk areas.
          {selectedCount > 0 && (
            <span
              className="ml-2 font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              {selectedCount} selected
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {RISK_FACTORS.map(({ key, label, desc }) => (
          <ToggleCard
            key={key}
            selected={!!value[key]}
            onClick={() => toggle(key)}
            label={label}
            desc={desc}
          />
        ))}
      </div>

      <StepNav step={2} total={TOTAL_STEPS} onBack={onBack} onNext={onNext} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Symptoms
// ---------------------------------------------------------------------------
function StepSymptoms({ value, onChange, onNext, onBack }) {
  function toggle(key) {
    onChange(value.includes(key) ? value.filter((s) => s !== key) : [...value, key]);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="m-eyebrow mb-1">Step 3 of 7</p>
        <h2
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          Current Symptoms
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Select any symptoms you are currently experiencing or have noticed recently.
          {value.length > 0 && (
            <span className="ml-2 font-semibold" style={{ color: 'var(--accent)' }}>
              {value.length} selected
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {SYMPTOMS.map(({ key, label, desc }) => (
          <ToggleCard
            key={key}
            selected={value.includes(key)}
            onClick={() => toggle(key)}
            label={label}
            desc={desc}
          />
        ))}
      </div>

      {value.length > 0 && (
        <div
          className="rounded-2xl p-3.5 flex gap-2.5 text-sm"
          style={{
            background: 'var(--warning-bg)',
            border: '1px solid rgba(217,119,6,0.25)',
            color: 'var(--warning)',
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            <strong>Professional evaluation recommended.</strong> You've reported symptoms.
            Please see a dentist for a clinical assessment.
          </span>
        </div>
      )}

      <StepNav step={3} total={TOTAL_STEPS} onBack={onBack} onNext={onNext} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Duration & notes
// ---------------------------------------------------------------------------
function StepDuration({ duration, notes, onDurationChange, onNotesChange, onNext, onBack }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="m-eyebrow mb-1">Step 4 of 7</p>
        <h2
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          Duration & Notes
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          If you reported symptoms, how long have you been experiencing them?
        </p>
      </div>

      {/* Duration options */}
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
          Symptom duration
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onDurationChange(opt)}
              className="rounded-2xl border px-4 py-3 text-sm font-medium text-left transition-all duration-150 focus-visible:outline-none"
              style={
                duration === opt
                  ? {
                      background: 'color-mix(in srgb, var(--accent) 8%, var(--surface))',
                      borderColor: 'var(--accent)',
                      color: 'var(--accent)',
                      boxShadow: '0 0 0 1px var(--accent)',
                    }
                  : {
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-2)',
                    }
              }
              aria-pressed={duration === opt}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Notes textarea */}
      <div>
        <label
          htmlFor="screening-notes"
          className="block text-sm font-semibold mb-1.5"
          style={{ color: 'var(--text)' }}
        >
          Additional notes{' '}
          <span className="font-normal" style={{ color: 'var(--text-3)' }}>
            (optional)
          </span>
        </label>
        <textarea
          id="screening-notes"
          className="m-input resize-none"
          rows={4}
          placeholder="Describe anything else you'd like your dental team to know…"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>

      <StepNav step={4} total={TOTAL_STEPS} onBack={onBack} onNext={onNext} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Image upload
// ---------------------------------------------------------------------------
function StepImageUpload({ file, onFileChange, onNext, onBack }) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileChange(f);
  }

  function handleFileInput(e) {
    const f = e.target.files[0];
    if (f) onFileChange(f);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="m-eyebrow mb-1">Step 5 of 7</p>
        <h2
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          Oral Image
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Optionally upload a photo of the area of concern. Not required but can help your
          dental team.
        </p>
      </div>

      {/* Privacy notice */}
      <div
        className="rounded-xl p-3 flex gap-2 text-xs"
        style={{
          background: 'var(--warning-bg)',
          border: '1px solid rgba(217,119,6,0.20)',
          color: 'var(--warning)',
        }}
      >
        <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
        <span>
          Images are used by your dental team for screening support only — not for automated
          diagnosis. A clinical examination is always required.
        </span>
      </div>

      {!file ? (
        /* Drop zone */
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload oral image"
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-150 focus-visible:outline-none"
          style={{
            borderColor: dragOver ? 'var(--accent)' : 'var(--border-2)',
            background: dragOver
              ? 'color-mix(in srgb, var(--accent) 4%, var(--surface))'
              : 'var(--surface)',
          }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'var(--surface-2)' }}
          >
            <Upload size={24} style={{ color: 'var(--text-3)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Click or drag to upload
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              JPEG, PNG, WebP — max 10 MB
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      ) : (
        /* Preview */
        <div
          className="flex items-center gap-4 rounded-2xl p-4"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }}
        >
          <img
            src={URL.createObjectURL(file)}
            alt="Uploaded oral image preview"
            className="h-20 w-20 rounded-xl object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
              {file.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              {(file.size / 1024).toFixed(0)} KB
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs font-semibold mt-1.5"
              style={{ color: 'var(--accent)' }}
            >
              Change image
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="rounded-xl p-2 transition-colors duration-150"
            style={{ color: 'var(--text-3)' }}
            aria-label="Remove image"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <StepNav
        step={5}
        total={TOTAL_STEPS}
        onBack={onBack}
        onNext={onNext}
        nextLabel={file ? 'Continue' : 'Skip — Continue'}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 6 — Review & submit
// ---------------------------------------------------------------------------
function StepReview({ riskFactors, symptoms, duration, notes, file, onBack, onSubmit, loading, error }) {
  const selectedRisks = RISK_FACTORS.filter(({ key }) => riskFactors[key]);
  const selectedSymptoms = SYMPTOMS.filter(({ key }) => symptoms.includes(key));

  return (
    <div className="space-y-6">
      <div>
        <p className="m-eyebrow mb-1">Step 6 of 7</p>
        <h2
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          Review & Submit
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Review your information before sending it to your dental team.
        </p>
      </div>

      {/* Summary sections */}
      <div className="space-y-3">
        <ReviewSection label="Risk Factors">
          {selectedRisks.length > 0
            ? selectedRisks.map((r) => r.label).join(', ')
            : 'None selected'}
        </ReviewSection>
        <ReviewSection label="Reported Symptoms">
          {selectedSymptoms.length > 0
            ? selectedSymptoms.map((s) => s.label).join(', ')
            : 'None selected'}
        </ReviewSection>
        {duration && <ReviewSection label="Symptom Duration">{duration}</ReviewSection>}
        {notes && <ReviewSection label="Additional Notes">{notes}</ReviewSection>}
        <ReviewSection label="Oral Image">
          {file ? file.name : 'Not uploaded'}
        </ReviewSection>
      </div>

      {/* Final safety reminder */}
      <div
        className="rounded-2xl p-4 flex gap-3 text-sm"
        style={{
          background: 'var(--info-bg)',
          border: '1px solid rgba(2,132,199,0.20)',
          color: 'var(--info)',
        }}
      >
        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
        <span>
          <strong>Reminder:</strong> This screening is not a diagnosis. A dental professional
          should evaluate any concerning findings.
        </span>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'var(--danger-bg)',
            border: '1px solid rgba(220,38,38,0.20)',
            color: 'var(--danger)',
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      <StepNav
        step={6}
        total={TOTAL_STEPS}
        onBack={onBack}
        onNext={onSubmit}
        nextLabel="Submit screening"
        loading={loading}
      />
    </div>
  );
}

function ReviewSection({ label, children }) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-1"
        style={{ color: 'var(--text-3)' }}
      >
        {label}
      </p>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
        {children}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 7 — Confirmation
// ---------------------------------------------------------------------------
function StepConfirmation({ screening }) {
  const navigate = useNavigate();
  const symptoms = Array.isArray(screening?.symptoms)
    ? screening.symptoms
    : JSON.parse(screening?.symptoms || '[]');
  const hasSymptoms = symptoms.length > 0;

  return (
    <div className="space-y-7">
      {/* Success icon */}
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: 'var(--success-bg)' }}
      >
        <CheckCircle2 size={32} style={{ color: 'var(--success)' }} />
      </div>

      <div>
        <p className="m-eyebrow mb-2" style={{ color: 'var(--success)' }}>
          Submitted successfully
        </p>
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          Screening received.
        </h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Your screening has been sent to your dental team for review. You'll be able to
          track progress from your dashboard and journey page.
        </p>
      </div>

      {/* Professional evaluation warning (only when symptoms present) */}
      {hasSymptoms && (
        <div
          className="rounded-2xl p-5 space-y-2"
          style={{
            background: 'var(--warning-bg)',
            border: '1.5px solid rgba(217,119,6,0.30)',
          }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <p className="text-sm font-bold" style={{ color: 'var(--warning)' }}>
              Professional evaluation recommended.
            </p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--warning)', opacity: 0.85 }}>
            You reported oral symptoms. Please book an appointment with a dental professional
            for a clinical evaluation. This screening is not a diagnosis.
          </p>
        </div>
      )}

      {/* What happens next */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
          What happens next
        </p>
        {[
          'A dental professional will review your screening.',
          'They may add notes or update your case status.',
          'Your dentist will create a treatment plan if needed.',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3 text-sm" style={{ color: 'var(--text-2)' }}>
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: 'var(--accent-3)', color: 'var(--accent)', marginTop: '1px' }}
            >
              {i + 1}
            </span>
            {step}
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="m-btn m-btn--primary inline-flex items-center gap-2"
        >
          Back to dashboard <ArrowRight size={15} />
        </button>
        <button
          type="button"
          onClick={() => navigate('/journey')}
          className="m-btn m-btn--secondary inline-flex items-center gap-2"
        >
          View my journey
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ScreeningPage
// ---------------------------------------------------------------------------
export default function ScreeningPage() {
  const [step, setStep] = useState(1);
  const [riskFactors, setRiskFactors] = useState({});
  const [symptoms, setSymptoms] = useState([]);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('risk_factors', JSON.stringify(riskFactors));
      formData.append('symptoms', JSON.stringify(symptoms));
      if (duration) formData.append('symptom_duration', duration);
      if (notes) formData.append('notes', notes);
      if (imageFile) formData.append('image', imageFile);

      const { screening } = await api.createScreening(formData);
      setResult(screening);
      setStep(7);
    } catch (err) {
      setError(err.message || 'Failed to submit screening. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Scroll to top of card on step change
  function goTo(n) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(n);
  }

  return (
    <>
      {/* Top progress bar (fixed, above everything) */}
      {step < 7 && <TopProgressBar step={step} total={TOTAL_STEPS} />}

      {/* Page centering wrapper */}
      <div className="mx-auto max-w-xl py-6 px-4">
        {/* Step eyebrow label (outside card, subtle) */}
        {step > 1 && step < 7 && (
          <p className="m-eyebrow mb-4 text-center">Step {step} of {TOTAL_STEPS}</p>
        )}

        {/* Step card */}
        <div
          className="m-card m-page-enter p-6 sm:p-8"
          key={step} /* remount animation on each step */
          style={{ boxShadow: 'var(--shadow)' }}
        >
          {step === 1 && <StepIntro onNext={() => goTo(2)} />}

          {step === 2 && (
            <StepRiskFactors
              value={riskFactors}
              onChange={setRiskFactors}
              onNext={() => goTo(3)}
              onBack={() => goTo(1)}
            />
          )}

          {step === 3 && (
            <StepSymptoms
              value={symptoms}
              onChange={setSymptoms}
              onNext={() => goTo(4)}
              onBack={() => goTo(2)}
            />
          )}

          {step === 4 && (
            <StepDuration
              duration={duration}
              notes={notes}
              onDurationChange={setDuration}
              onNotesChange={setNotes}
              onNext={() => goTo(5)}
              onBack={() => goTo(3)}
            />
          )}

          {step === 5 && (
            <StepImageUpload
              file={imageFile}
              onFileChange={setImageFile}
              onNext={() => goTo(6)}
              onBack={() => goTo(4)}
            />
          )}

          {step === 6 && (
            <StepReview
              riskFactors={riskFactors}
              symptoms={symptoms}
              duration={duration}
              notes={notes}
              file={imageFile}
              onBack={() => goTo(5)}
              onSubmit={handleSubmit}
              loading={submitting}
              error={error}
            />
          )}

          {step === 7 && <StepConfirmation screening={result} />}
        </div>

        {/* Safety disclaimer at bottom */}
        {step < 7 && (
          <p className="mt-5 text-xs text-center" style={{ color: 'var(--text-3)' }}>
            This screening is not a diagnosis. A dental professional should evaluate concerning
            findings.
          </p>
        )}
      </div>
    </>
  );
}
