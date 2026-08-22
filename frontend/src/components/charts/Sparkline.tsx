interface SparklineProps {
  points: number[];
  tone?: 'mint' | 'lavender' | 'peach' | 'sky';
}

const colors: Record<string, string> = {
  mint: 'var(--color-gradient-mint)',
  lavender: 'var(--color-gradient-lavender)',
  peach: 'var(--color-gradient-peach)',
  sky: 'var(--color-gradient-sky)',
};

export default function Sparkline({ points, tone = 'mint' }: SparklineProps) {
  const w = 100;
  const h = 28;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points.length - 1)) * w} ${h - ((p - min) / range) * h}`)
    .join(' ');

  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke={colors[tone]} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
