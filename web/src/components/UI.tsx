import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/**
 * Shared UI primitives.
 *
 * These exist so an empty screen, a switch or a copyable token looks the same
 * everywhere. Before this each page invented its own, which is how a product
 * ends up feeling like six products.
 */

// --- Empty-state artwork -----------------------------------------------------
// Drawn rather than illustrated-from-a-library: a few brand-coloured shapes at
// low opacity read as considered without pulling in an image dependency.

const ART: Record<string, ReactNode> = {
  radar: (
    <>
      <circle cx="58" cy="46" r="30" fill="var(--brand-soft)" />
      <circle cx="58" cy="46" r="30" fill="none" stroke="var(--brand-border)" strokeWidth="1.5" />
      <circle cx="58" cy="46" r="19" fill="none" stroke="var(--brand-border)" strokeWidth="1.5" />
      <circle cx="58" cy="46" r="8" fill="none" stroke="var(--brand-border)" strokeWidth="1.5" />
      <path d="M58 46 84 26" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="84" cy="26" r="5" fill="var(--brand)" />
      <circle cx="30" cy="66" r="3" fill="var(--violet)" opacity="0.7" />
      <circle cx="78" cy="62" r="2.5" fill="var(--violet)" opacity="0.5" />
    </>
  ),
  inbox: (
    <>
      <rect x="22" y="24" width="72" height="50" rx="9" fill="var(--brand-soft)" stroke="var(--brand-border)" strokeWidth="1.5" />
      <path d="M22 56h20l5 8h22l5-8h20" fill="none" stroke="var(--brand)" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M40 38h36M40 46h22" stroke="var(--brand-border)" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  chart: (
    <>
      <rect x="20" y="20" width="76" height="58" rx="9" fill="var(--brand-soft)" stroke="var(--brand-border)" strokeWidth="1.5" />
      <path d="M32 64v-12M46 64V38M60 64V48M74 64V30" stroke="var(--brand)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M28 68h60" stroke="var(--brand-border)" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  spark: (
    <>
      <circle cx="58" cy="46" r="30" fill="var(--brand-soft)" />
      <path d="M58 28l4.6 12.4L75 45l-12.4 4.6L58 62l-4.6-12.4L41 45l12.4-4.6z" fill="var(--brand)" />
      <path d="M82 60l1.8 4.4 4.4 1.8-4.4 1.8L82 72l-1.8-4-4.4-1.8 4.4-1.8z" fill="var(--violet)" opacity="0.75" />
    </>
  ),
  lock: (
    <>
      <circle cx="58" cy="46" r="30" fill="var(--brand-soft)" />
      <rect x="42" y="44" width="32" height="24" rx="6" fill="none" stroke="var(--brand)" strokeWidth="2.6" />
      <path d="M49 44v-6a9 9 0 0 1 18 0v6" fill="none" stroke="var(--brand)" strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
};

export function EmptyState({
  art = 'inbox',
  title,
  children,
  action,
}: {
  art?: keyof typeof ART;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <svg className="art" viewBox="0 0 116 88" aria-hidden="true">{ART[art]}</svg>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

// --- Controls ----------------------------------------------------------------

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="track" />
      {label ? <span style={{ fontSize: 13 }}>{label}</span> : null}
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A value the user needs to copy exactly — an intake address, a token, a URL. */
export function CopyRow({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      {label ? <div className="faint" style={{ marginBottom: 4 }}>{label}</div> : null}
      <div className="copy-row">
        <code>{value}</code>
        <button
          className="btn sm ghost"
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          <Icon name={copied ? 'check' : 'copy'} /> {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export function Meter({ value, tone }: { value: number; tone?: 'green' | 'amber' }) {
  return (
    <div className={`meter ${tone ?? ''}`}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function SectionHead({
  icon,
  title,
  hint,
  children,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <h2 className="row" style={{ gap: 8 }}>
          {icon ? <Icon name={icon} /> : null}
          {title}
        </h2>
        {hint ? <div className="hint">{hint}</div> : null}
      </div>
      {children ? <div className="row">{children}</div> : null}
    </div>
  );
}

/** List-shaped loading placeholder — steadier than a spinner for tables. */
export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="stack" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width: `${92 - i * 12}%` }} />
      ))}
    </div>
  );
}
