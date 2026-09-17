/**
 * Shared UI primitives for MOLAR.
 * Small, composable components that keep pages consistent.
 */

// ---------------------------------------------------------------------------
// Spinner — subtle loading indicator
// ---------------------------------------------------------------------------
export function Spinner({ size = 'md', className = '' }) {
  const sz = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6';
  return (
    <span
      className={`inline-block ${sz} animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

// ---------------------------------------------------------------------------
// Button — primary / secondary / ghost variants
// ---------------------------------------------------------------------------
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] focus-visible:ring-[var(--color-accent)] shadow-md hover:shadow-lg hover:-translate-y-0.5',
    secondary:
      'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus-visible:ring-[var(--color-accent)]',
    ghost:
      'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] focus-visible:ring-[var(--color-accent)]',
    danger:
      'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500 shadow-md hover:-translate-y-0.5',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Input — styled text input
// ---------------------------------------------------------------------------
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-[var(--color-text)]">{label}</label>
      )}
      <input
        className={`w-full rounded-xl border px-4 py-3 text-sm text-[var(--color-text)] bg-[var(--color-surface)] placeholder:text-[var(--color-text-muted)] border-[var(--color-border)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-all duration-200 ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Textarea
// ---------------------------------------------------------------------------
export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-[var(--color-text)]">{label}</label>
      )}
      <textarea
        className={`w-full rounded-xl border px-4 py-3 text-sm text-[var(--color-text)] bg-[var(--color-surface)] placeholder:text-[var(--color-text-muted)] border-[var(--color-border)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-all duration-200 resize-none ${error ? 'border-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card — glass-effect container
// ---------------------------------------------------------------------------
export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge — status pill
// ---------------------------------------------------------------------------
const BADGE_VARIANTS = {
  submitted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
  under_review: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  reviewed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  closed: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  completed: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  cancelled: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400',
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  missed: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400',
};

const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  reviewed: 'Reviewed',
  closed: 'Closed',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending: 'Pending',
  missed: 'Missed',
};

export function Badge({ status, className = '' }) {
  const style = BADGE_VARIANTS[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  const label = STATUS_LABELS[status] || status;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ErrorMessage
// ---------------------------------------------------------------------------
export function ErrorMessage({ message, className = '' }) {
  if (!message) return null;
  return (
    <div
      className={`rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 ${className}`}
      role="alert"
    >
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-4xl">{icon}</div>}
      <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
      {description && (
        <p className="max-w-xs text-sm text-[var(--color-text-muted)]">{description}</p>
      )}
      {action}
    </div>
  );
}
