interface CountdownRingProps {
  days: number;
  total: number;
  label: string;
}

export default function CountdownRing({ days, total, label }: CountdownRingProps) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - days / total);

  return (
    <div className="ring" role="img" aria-label={`${days} days ${label}`}>
      <svg viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-surface-dark-elevated)" strokeWidth="6" />
        <circle
          cx="32" cy="32" r={r} fill="none"
          stroke="url(#ring-grad)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
          className="ring__value"
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a7e5d3" />
            <stop offset="100%" stopColor="#c8b8e0" />
          </linearGradient>
        </defs>
      </svg>
      <span className="ring__num">{days}<small>d</small></span>
      <span className="ring__label">{label}</span>
    </div>
  );
}
