interface AreaChartProps {
  points: number[];
  labels?: string[];
  height?: number;
  suffix?: string;
  id: string;
}

function toPath(points: number[], w: number, h: number, max: number) {
  const step = w / (points.length - 1);
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(2)} ${(h - (p / max) * h).toFixed(2)}`)
    .join(' ');
}

export default function AreaChart({ points, labels, height = 180, suffix = '', id }: AreaChartProps) {
  const w = 600;
  const h = 180;
  const max = Math.max(...points) * 1.15;
  const line = toPath(points, w, h, max);
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const maxVal = Math.max(...points);
  const lastX = w;
  const lastY = h - (points[points.length - 1] / max) * h;

  return (
    <div className="area-chart" style={{ height }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gradient-lavender)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--color-gradient-lavender)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`stroke-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-gradient-mint)" />
            <stop offset="100%" stopColor="var(--color-gradient-lavender)" />
          </linearGradient>
        </defs>
        <path className="area-chart__area" d={area} fill={`url(#fill-${id})`} />
        <path
          className="area-chart__line"
          d={line}
          fill="none"
          stroke={`url(#stroke-${id})`}
          strokeWidth="3"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle className="area-chart__dot" cx={lastX} cy={lastY} r="5" fill="var(--color-gradient-lavender)" />
      </svg>
      <div className="area-chart__labels">
        {labels?.map((l) => <span key={l}>{l}</span>)}
      </div>
      <span className="area-chart__peak">peak {maxVal}{suffix}</span>
    </div>
  );
}
