/**
 * AppShell — MOLAR premium application shell.
 * Minimal, focused navigation that prioritizes content.
 */

import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, Menu, X, LayoutDashboard, ScanLine, Activity, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const PATIENT_NAV = [
  { to: '/dashboard', label: 'Overview',  icon: LayoutDashboard, end: true },
  { to: '/screening', label: 'Screening', icon: ScanLine,         end: true },
  { to: '/journey',   label: 'Journey',   icon: Activity,         end: true },
];

const DENTIST_NAV = [
  { to: '/dentist',       label: 'Workspace', icon: LayoutDashboard, end: true },
  { to: '/dentist/cases', label: 'Cases',     icon: ClipboardList,   end: false },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = user?.role === 'dentist' ? DENTIST_NAV : PATIENT_NAV;
  const homeRoute = user?.role === 'dentist' ? '/dentist' : '/dashboard';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const navLinkClass = ({ isActive }) =>
    [
      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
      isActive
        ? 'bg-[var(--accent-3)] text-[var(--accent)]'
        : 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
    ].join(' ');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        borderBottom: '1px solid var(--border)',
        background: 'var(--glass)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '0 20px',
          height: 56,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {/* Logo */}
          <Link to={homeRoute} style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }} aria-label="MOLAR home">
            <span className="m-logo m-logo--sm" aria-hidden="true">M</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, letterSpacing: '0.16em', color: 'var(--text)' }}>MOLAR</span>
          </Link>

          {/* Separator */}
          <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

          {/* Desktop nav */}
          <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 2, flex: 1 }} aria-label="Main navigation">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={navLinkClass}>
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            {/* Role badge */}
            {user && (
              <span style={{
                display: 'none',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                textTransform: 'capitalize',
                padding: '2px 8px', borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--border)',
                color: 'var(--text-3)',
              }} className="sm:inline">
                {user.role}
              </span>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggle}
              style={{
                padding: 8, borderRadius: 'var(--radius-sm)',
                color: 'var(--text-2)', background: 'transparent', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                transition: 'all var(--dur-fast) var(--ease-out)',
              }}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* User avatar */}
            {user && (
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--accent-3)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Logout desktop */}
            <button
              onClick={handleLogout}
              style={{
                display: 'none',
                alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-2)', background: 'transparent', border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                transition: 'all var(--dur-fast) var(--ease-out)',
              }}
              className="md:flex"
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              aria-label="Log out"
            >
              <LogOut size={14} />
              Logout
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              style={{
                padding: 8, borderRadius: 'var(--radius-sm)',
                color: 'var(--text-2)', background: 'transparent', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}
              className="md:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: '12px 16px 16px',
          }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={() => setMobileOpen(false)}
                    className={navLinkClass}
                    style={{ display: 'flex' }}
                  >
                    <Icon size={15} />
                    {label}
                  </NavLink>
                </li>
              ))}
              <li>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-2)', background: 'transparent', border: 'none',
                    cursor: 'pointer', fontSize: 14, fontWeight: 500, textAlign: 'left',
                  }}
                >
                  <LogOut size={15} /> Log out
                </button>
              </li>
            </ul>
          </nav>
        )}
      </header>

      {/* Page */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }} className="m-page-enter">
        {children}
      </main>
    </div>
  );
}
