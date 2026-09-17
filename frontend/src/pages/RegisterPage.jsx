/**
 * RegisterPage — new account creation for MOLAR.
 *
 * Features:
 *   - Centered full-screen layout on var(--bg)
 *   - MOLAR logo mark + 'Create your account' heading
 *   - Name · Email · Password fields (m-input class)
 *   - Password visibility toggle (Eye / EyeOff)
 *   - Role selector: two large cards — Patient (User icon) vs Dentist (Stethoscope icon)
 *   - Inline error display
 *   - Primary CTA (m-btn m-btn--primary m-btn--lg)
 *   - Link to /login
 *   - Fixed theme toggle (top-right)
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Eye, EyeOff, User, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';

/* ─── Role card definitions ─────────────────────────────────────────── */
const ROLES = [
  {
    value:     'patient',
    label:     'Patient',
    tagline: "I'm seeking dental care",
    icon:      User,
  },
  {
    value:     'dentist',
    label:     'Dentist',
    tagline: "I'm providing dental care",
    icon:      Stethoscope,
  },
];

export default function RegisterPage() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:     '',
    email:    '',
    password: '',
    role:     'patient',
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => {
      setError('');
      setForm((f) => ({ ...f, [field]: e.target.value }));
    };
  }

  function selectRole(role) {
    setForm((f) => ({ ...f, role }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!form.email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await api.register({
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        role:     form.role,
      });
      login(token, user);
      navigate(user.role === 'dentist' ? '/dentist' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight:      '100vh',
        background:     'var(--bg)',
        color:          'var(--text)',
        fontFamily:     'var(--font-body)',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '24px',
      }}
    >
      {/* ── Fixed theme toggle ─────────────────────────────────────── */}
      <button
        onClick={toggle}
        className="m-btn m-btn--ghost m-btn--icon"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          position: 'fixed',
          top:      '16px',
          right:    '16px',
          color:    'var(--text-2)',
          zIndex:   50,
        }}
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      {/* ── Card container ─────────────────────────────────────────── */}
      <div
        className="m-page-enter"
        style={{ width: '100%', maxWidth: '460px' }}
      >
        {/* ── Logo + heading ──────────────────────────────────────── */}
        <div
          style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            textAlign:      'center',
            marginBottom:   '32px',
            gap:            '16px',
          }}
        >
          <Link
            to="/"
            aria-label="MOLAR home"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
          >
            <span className="m-logo m-logo--lg" aria-hidden="true">M</span>
            <span
              style={{
                fontFamily:    'var(--font-display)',
                fontWeight:    700,
                fontSize:      '18px',
                letterSpacing: '0.22em',
                color:         'var(--text)',
              }}
            >
              MOLAR
            </span>
          </Link>

          <div>
            <h1
              style={{
                fontFamily:    'var(--font-display)',
                fontSize:      '26px',
                fontWeight:    700,
                letterSpacing: '-0.03em',
                color:         'var(--text)',
                margin:        0,
              }}
            >
              Create your account
            </h1>
            <p
              style={{
                marginTop: '6px',
                fontSize:  '14px',
                color:     'var(--text-2)',
              }}
            >
              Join MOLAR for a better dental care experience
            </p>
          </div>
        </div>

        {/* ── Form card ───────────────────────────────────────────── */}
        <div
          className="m-card"
          style={{ padding: '36px 32px' }}
        >
          <form
            onSubmit={handleSubmit}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {/* Full name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="reg-name"
                style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}
              >
                Full name
              </label>
              <input
                id="reg-name"
                className="m-input"
                type="text"
                placeholder="Alex Johnson"
                value={form.name}
                onChange={update('name')}
                autoComplete="name"
                autoFocus
                required
              />
            </div>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="reg-email"
                style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}
              >
                Email address
              </label>
              <input
                id="reg-email"
                className="m-input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="reg-password"
                style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  className="m-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={update('password')}
                  autoComplete="new-password"
                  required
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  style={{
                    position:   'absolute',
                    right:      '12px',
                    top:        '50%',
                    transform:  'translateY(-50%)',
                    background: 'none',
                    border:     'none',
                    cursor:     'pointer',
                    color:      'var(--text-3)',
                    padding:    '4px',
                    display:    'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Password strength hint */}
              {form.password.length > 0 && form.password.length < 8 && (
                <span
                  style={{
                    fontSize: '11px',
                    color:    'var(--warning)',
                    fontWeight: 500,
                  }}
                >
                  {8 - form.password.length} more character{8 - form.password.length !== 1 ? 's' : ''} needed
                </span>
              )}
            </div>

            {/* ── Role selector ──────────────────────────────────── */}
            <fieldset
              style={{
                border:  'none',
                padding: 0,
                margin:  0,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <legend
                style={{
                  fontSize:   '13px',
                  fontWeight: 600,
                  color:      'var(--text)',
                  marginBottom: '8px',
                  float: 'left',
                  width: '100%',
                }}
              >
                I am a
              </legend>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {ROLES.map(({ value, label, tagline, icon: Icon }) => {
                  const active = form.role === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => selectRole(value)}
                      aria-pressed={active}
                      style={{
                        display:        'flex',
                        flexDirection:  'column',
                        alignItems:     'flex-start',
                        gap:            '10px',
                        padding:        '16px',
                        borderRadius:   'var(--radius)',
                        border:         active
                          ? '2px solid var(--accent)'
                          : '2px solid var(--border)',
                        background:     active
                          ? 'color-mix(in srgb, var(--accent) 6%, var(--surface))'
                          : 'var(--surface-2)',
                        cursor:         'pointer',
                        textAlign:      'left',
                        transition:     `border-color var(--dur-base) var(--ease-out),
                                         background var(--dur-base) var(--ease-out),
                                         box-shadow var(--dur-base) var(--ease-out)`,
                        boxShadow:      active ? '0 0 0 3px var(--accent-glow)' : 'none',
                      }}
                    >
                      {/* Icon */}
                      <div
                        style={{
                          width:          '36px',
                          height:         '36px',
                          borderRadius:   '10px',
                          background:     active ? 'var(--accent)' : 'var(--surface-3)',
                          color:          active ? '#fff' : 'var(--text-2)',
                          display:        'flex',
                          alignItems:     'center',
                          justifyContent: 'center',
                          transition:     `background var(--dur-base) var(--ease-out),
                                           color var(--dur-base) var(--ease-out)`,
                          flexShrink:     0,
                        }}
                      >
                        <Icon size={18} />
                      </div>

                      {/* Text */}
                      <div>
                        <div
                          style={{
                            fontSize:   '14px',
                            fontWeight: 700,
                            color:      active ? 'var(--accent)' : 'var(--text)',
                            fontFamily: 'var(--font-display)',
                            letterSpacing: '-0.01em',
                            transition: 'color var(--dur-base) var(--ease-out)',
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            fontSize:   '11px',
                            color:      'var(--text-3)',
                            marginTop:  '2px',
                            lineHeight: 1.4,
                          }}
                        >
                          {tagline}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Error message */}
            {error && (
              <div
                role="alert"
                style={{
                  display:      'flex',
                  alignItems:   'flex-start',
                  gap:          '8px',
                  padding:      '12px 14px',
                  borderRadius: 'var(--radius)',
                  background:   'var(--danger-bg)',
                  border:       '1px solid rgba(220,38,38,0.25)',
                  color:        'var(--danger)',
                  fontSize:     '13px',
                  lineHeight:   1.5,
                  fontWeight:   500,
                }}
              >
                <span aria-hidden="true" style={{ fontSize: '14px', flexShrink: 0 }}>⚠</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="m-btn m-btn--primary m-btn--lg"
              disabled={loading}
              style={{ width: '100%', marginTop: '4px' }}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="m-spinner m-spinner--sm" aria-hidden="true" />
                  Creating account…
                </>
              ) : (
                'Create account →'
              )}
            </button>
          </form>
        </div>

        {/* ── Footer link ─────────────────────────────────────────── */}
        <p
          style={{
            textAlign:  'center',
            marginTop:  '24px',
            fontSize:   '13px',
            color:      'var(--text-2)',
          }}
        >
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              fontWeight:     600,
              color:          'var(--accent)',
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
