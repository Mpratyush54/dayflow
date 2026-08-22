interface DonutProps {
  value: number; // 0-100
  size?: number;
  label: string;
  sublabel?: string;
}

export default function Donut({ value, size = 150, label, sublabel }: DonutProps) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);

  return (
    <div className="donut" style={{ width: size }}>
      <svg viewBox="0 0 100 100" role="img" aria-label={`${label}: ${value}%`}>
        <defs>
          <linearGradient id="donut-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-gradient-mint)" />
            <stop offset="50%" stopColor="var(--color-gradient-lavender)" />
            <stop offset="100%" stopColor="var(--color-gradient-peach)" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-surface-strong)" strokeWidth="10" />
        <circle
          className="donut__value"
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#donut-grad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ ['--dash' as string]: `${c}` }}
        />
      </svg>
      <div className="donut__center">
        <span className="donut__num">{value}%</span>
        {sublabel && <span className="donut__sub">{sublabel}</span>}
      </div>
      <span className="donut__label">{label}</span>
    </div>
  );
}
