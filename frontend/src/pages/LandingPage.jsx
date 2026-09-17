/**
 * LandingPage — MOLAR cinematic landing page.
 *
 * Typography-first composition. No stock imagery.
 * CSS/SVG geometry for visual depth.
 */

import { Link } from 'react-router-dom';
import { Search, Stethoscope, FileText, MessageCircle, CalendarCheck, Sun, Moon, Shield, Mic, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const JOURNEY_STAGES = [
  { icon: Search,         label: 'Screen',     desc: 'Guided oral health questionnaire' },
  { icon: Stethoscope,    label: 'Evaluate',   desc: 'Professional dentist review' },
  { icon: FileText,       label: 'Treat',      desc: 'Personalised treatment plan' },
  { icon: MessageCircle,  label: 'Understand', desc: 'Dento explains your care' },
  { icon: CalendarCheck,  label: 'Follow up',  desc: 'Continuity and reminders' },
];

const PRINCIPLES = [
  {
    icon: Mic,
    title: 'Clinical Intelligence',
    body: 'Voice-based periodontal charting. Measurements captured, parsed, and confirmed in seconds — no typing required.',
  },
  {
    icon: MessageCircle,
    title: 'Patient Continuity',
    body: 'Patients understand their own care. Dento translates dentist findings into plain language through every stage of the journey.',
  },
  {
    icon: Shield,
    title: 'Privacy by Design',
    body: 'Patient data is isolated by role. Authenticated image serving. Rate-limited auth. Your records stay protected.',
  },
];

export default function LandingPage() {
  const { theme, toggle } = useTheme();

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>

      {/* ------------------------------------------------------------------ */}
      {/* Theme toggle */}
      {/* ------------------------------------------------------------------ */}
      <button
        onClick={toggle}
        style={{
          position: 'fixed', top: 20, right: 20, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '8px 10px',
          color: 'var(--text-2)', cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all var(--dur-base) var(--ease-out)',
          display: 'flex', alignItems: 'center',
        }}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* ------------------------------------------------------------------ */}
      {/* Nav */}
      {/* ------------------------------------------------------------------ */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{
          maxWidth: 1160, margin: '0 auto', padding: '0 24px',
          height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="m-logo m-logo--md" aria-hidden="true">M</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '0.18em', color: 'var(--text)' }}>MOLAR</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to="/login" style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 500, padding: '8px 14px' }}>Sign in</Link>
            <Link to="/register" className="m-btn m-btn--primary m-btn--sm">Get started</Link>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '80px 24px 64px', position: 'relative' }}>
        {/* Background geometry */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          {/* Large circle accent */}
          <div style={{
            position: 'absolute', right: -120, top: -80,
            width: 520, height: 520, borderRadius: '50%',
            background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
          }} />
          {/* Grid lines */}
          <svg width="100%" height="100%" style={{ opacity: 0.04 }}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p className="m-eyebrow" style={{ marginBottom: 20 }}>DSOLVE 2026 · Dental Intelligence Platform</p>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(40px, 7vw, 84px)',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.05,
            color: 'var(--text)',
            maxWidth: 760,
            marginBottom: 28,
          }}>
            Your dental care,{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, #6366f1) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              finally connected.
            </span>
          </h1>

          <p style={{ fontSize: 18, color: 'var(--text-2)', maxWidth: 520, lineHeight: 1.7, marginBottom: 40 }}>
            From early oral-risk awareness to treatment follow-through. MOLAR connects patients and dentists through a seamless clinical intelligence platform.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <Link to="/register" className="m-btn m-btn--primary m-btn--xl">
              Start a screening <ArrowRight size={18} />
            </Link>
            <a href="#journey" className="m-btn m-btn--secondary m-btn--lg" style={{ color: 'var(--text)' }}>
              See how it works
            </a>
          </div>

          <p style={{ marginTop: 28, fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.04em' }}>
            PROTOTYPE · NOT A MEDICAL DEVICE · FOR DEMONSTRATION PURPOSES
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Journey diagram */}
      {/* ------------------------------------------------------------------ */}
      <section id="journey" style={{ background: 'var(--bg-alt, var(--surface-2))', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <p className="m-eyebrow" style={{ marginBottom: 12, textAlign: 'center' }}>The MOLAR journey</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 700, textAlign: 'center', letterSpacing: '-0.025em', marginBottom: 56 }}>
            Five stages. One connected experience.
          </h2>

          {/* Desktop: horizontal flow */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 0,
            position: 'relative',
          }} className="journey-grid">
            {/* Connecting line behind */}
            <div aria-hidden="true" style={{
              position: 'absolute',
              top: 28,
              left: '10%',
              width: '80%',
              height: 2,
              background: 'var(--border)',
              zIndex: 0,
            }}>
              <div style={{
                height: '100%',
                background: 'var(--accent)',
                width: '20%',
                borderRadius: 2,
                animation: 'journey-line-grow 2s var(--ease-out) both',
              }} />
            </div>

            {JOURNEY_STAGES.map((stage, i) => {
              const Icon = stage.icon;
              return (
                <div key={stage.label} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  textAlign: 'center', padding: '0 12px',
                  position: 'relative', zIndex: 1,
                  animation: `m-fade-up 0.5s var(--ease-out) ${i * 80}ms both`,
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: i === 0 ? 'var(--accent)' : 'var(--surface)',
                    border: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: i === 0 ? '#fff' : 'var(--text-3)',
                    boxShadow: i === 0 ? 'var(--shadow-accent)' : 'var(--shadow-sm)',
                    transition: 'all var(--dur-base) var(--ease-out)',
                  }}>
                    <Icon size={22} />
                  </div>
                  <p style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600, fontSize: 14,
                    color: i === 0 ? 'var(--accent)' : 'var(--text)',
                    marginTop: 14, marginBottom: 6,
                  }}>
                    {stage.label}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>{stage.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Mobile: vertical flow */}
          <style>{`
            @keyframes journey-line-grow { from { width: 0 } to { width: 100% } }
            @media (max-width: 640px) {
              .journey-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
              .journey-grid > div { flex-direction: row !important; text-align: left !important; gap: 16px; padding: 12px 0 !important; }
            }
          `}</style>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Principles */}
      {/* ------------------------------------------------------------------ */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '72px 24px' }}>
        <p className="m-eyebrow" style={{ marginBottom: 12, textAlign: 'center' }}>Built differently</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 700, textAlign: 'center', letterSpacing: '-0.025em', marginBottom: 48 }}>
          Three principles guide everything.
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {PRINCIPLES.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="m-card" style={{
                padding: 28,
                animation: `m-fade-up 0.5s var(--ease-out) ${i * 80}ms both`,
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-3)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)', marginBottom: 18,
                }}>
                  <Icon size={20} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65 }}>{p.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA band */}
      {/* ------------------------------------------------------------------ */}
      <section style={{
        background: 'var(--accent)', color: '#fff',
        padding: '56px 24px', textAlign: 'center',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 700, marginBottom: 12 }}>
          Ready to experience MOLAR?
        </h2>
        <p style={{ fontSize: 16, opacity: 0.85, marginBottom: 28 }}>
          Register as a patient or dentist and explore the full demo in minutes.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          <Link to="/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#fff', color: 'var(--accent)',
            padding: '13px 28px', borderRadius: 'var(--radius)',
            fontWeight: 700, fontSize: 15, textDecoration: 'none',
          }}>
            Create account <ArrowRight size={16} />
          </Link>
          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.15)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '13px 28px', borderRadius: 'var(--radius)',
            fontWeight: 600, fontSize: 15, textDecoration: 'none',
          }}>
            Sign in
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer */}
      {/* ------------------------------------------------------------------ */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '24px',
        display: 'flex', flexWrap: 'wrap',
        alignItems: 'center', justifyContent: 'space-between',
        gap: 12, maxWidth: 1160, margin: '0 auto',
        fontSize: 12, color: 'var(--text-3)',
      }}>
        <span>MOLAR · DSOLVE 2026 · Prototype — not a medical device</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/login" style={{ color: 'var(--text-3)' }}>Sign in</Link>
          <Link to="/register" style={{ color: 'var(--accent)' }}>Register</Link>
        </div>
      </footer>
    </div>
  );
}
