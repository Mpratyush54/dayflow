import type { EmployeeProfile } from '../../types';

export const PROFILE_COMPLETION_FIELDS: (keyof EmployeeProfile)[] = [
  'name',
  'phone',
  'address',
  'dateOfBirth',
  'designation',
  'department',
  'workLocation',
  'nationality',
  'personalEmail',
  'gender',
  'maritalStatus',
  'profilePicture',
  'pan',
  'bankAccountNo',
];

export function computeProfileCompletion(profile: Partial<EmployeeProfile> | null | undefined): number {
  if (!profile) return 0;
  const total = PROFILE_COMPLETION_FIELDS.length;
  let filled = 0;
  for (const key of PROFILE_COMPLETION_FIELDS) {
    const v = profile[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') filled++;
  }
  return Math.round((filled / total) * 100);
}

export function missingFields(profile: Partial<EmployeeProfile> | null | undefined): string[] {
  if (!profile) return [...PROFILE_COMPLETION_FIELDS];
  return PROFILE_COMPLETION_FIELDS.filter((k) => {
    const v = profile[k];
    return v === undefined || v === null || String(v).trim() === '';
  });
}

interface Props {
  value: number;
  size?: number;
  label?: string;
  showChecklist?: boolean;
  missing?: string[];
  onCtaClick?: () => void;
}

export default function ProfileCompletionRing({ value, size = 120, label = 'Profile complete', missing, onCtaClick }: Props) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  const isComplete = value >= 85;
  const tone = isComplete ? 'var(--color-success)' : 'var(--color-gradient-lavender)';

  return (
    <div
      className="pc-ring animate-in"
      role="img"
      aria-label={`${label}: ${value}%`}
      aria-live="polite"
    >
      <div className="pc-ring__orb" aria-hidden />
      <div className="pc-ring__circle" style={{ width: size, height: size } as React.CSSProperties}>
        <svg viewBox="0 0 100 100" role="img" aria-label={`${value}% complete`}>
          <defs>
            <linearGradient id="pc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-gradient-mint)" />
              <stop offset="50%" stopColor="var(--color-gradient-lavender)" />
              <stop offset="100%" stopColor="var(--color-gradient-peach)" />
            </linearGradient>
            <linearGradient id="pc-grad-done" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-gradient-mint)" />
              <stop offset="100%" stopColor="var(--color-success)" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-surface-strong)" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={isComplete ? 'url(#pc-grad-done)' : 'url(#pc-grad)'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
            className="pc-ring__value"
            style={{ ['--dash' as string]: `${c}` } as React.CSSProperties}
          />
        </svg>
        <div className="pc-ring__center">
          <span className="pc-ring__num" style={isComplete ? { color: tone } : undefined}>{value}%</span>
          <span className="pc-ring__sub">{isComplete ? 'All set ✓' : 'complete'}</span>
        </div>
      </div>
      <div className="pc-ring__meta">
        <span className="pc-ring__label">{label}</span>
        {value < 100 && missing && missing.length > 0 && (
          <span className="pc-ring__hint">
            Missing: {missing.slice(0, 3).join(', ')}{missing.length > 3 ? ` +${missing.length - 3} more` : ''}
          </span>
        )}
        {value < 85 && onCtaClick && (
          <button type="button" className="pc-ring__cta" onClick={onCtaClick}>
            Complete profile →
          </button>
        )}
        {isComplete && <span className="pc-ring__done">85%+ — great onboarding!</span>}
      </div>
    </div>
  );
}
