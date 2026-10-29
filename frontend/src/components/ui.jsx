import { X } from 'lucide-react';

export const fieldClass =
  'w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15';

export const labelClass =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted';

const buttonVariants = {
  primary:
    'border-brand-700 bg-brand-700 text-white hover:border-brand-800 hover:bg-brand-800',
  secondary:
    'border-line-strong bg-surface text-ink hover:border-muted hover:bg-canvas',
  ghost:
    'border-transparent bg-transparent text-muted hover:bg-surface hover:text-ink',
  danger:
    'border-line-strong bg-surface text-red-700 hover:border-red-200 hover:bg-red-50',
};

export function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md border px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

const iconTones = {
  neutral: 'text-muted hover:border-line-strong hover:bg-canvas hover:text-ink',
  danger: 'text-muted hover:border-red-200 hover:bg-red-50 hover:text-red-700',
};

export function IconButton({ label, tone = 'neutral', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface transition-colors ${iconTones[tone]} ${className}`}
      {...props}
    />
  );
}

const badgeTones = {
  neutral: 'border-line bg-canvas text-muted',
  brand: 'border-brand-200 bg-brand-50 text-brand-800',
  success: 'border-[#c8dcc3] bg-[#eff5ec] text-[#3f6b3a]',
  warning: 'border-[#e2d3a7] bg-[#fbf6e9] text-[#6b5518]',
  danger: 'border-red-200 bg-red-50 text-red-700',
  ink: 'border-ink bg-ink text-white',
};

export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${badgeTones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const alertTones = {
  info: 'border-line bg-canvas text-muted',
  success: 'border-[#c8dcc3] bg-[#eff5ec] text-[#345c30]',
  warning: 'border-[#e2d3a7] bg-[#fbf6e9] text-[#6b5518]',
  danger: 'border-red-200 bg-red-50 text-red-700',
};

export function Alert({ tone = 'info', className = '', children }) {
  return (
    <div className={`rounded-md border px-3 py-2.5 text-xs leading-relaxed ${alertTones[tone]} ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ kicker, title, description, actions }) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {kicker && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
            {kicker}
          </p>
        )}
        <h1 className="font-serif text-3xl leading-tight text-ink">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-canvas text-faint">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-muted">{description}</p>}
    </div>
  );
}

export function Modal({ open, onClose, children, maxWidth = 'max-w-2xl' }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-4 sm:p-8"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative my-auto w-full ${maxWidth} rounded-lg border border-line bg-surface shadow-2xl`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
