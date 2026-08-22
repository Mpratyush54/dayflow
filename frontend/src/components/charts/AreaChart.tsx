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
  const maxRaw = Math.max(...points, 0);
  const max = Math.max(maxRaw * 1.15, 1);
  const line = points.length > 1 ? toPath(points, w, h, max) : `M 0 ${h} L ${w} ${h}`;
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const maxVal = Math.max(...points, 0);
  const maxIndex = maxRaw > 0 ? points.indexOf(maxVal) : -1;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const peakX = maxIndex >= 0 ? maxIndex * step : w / 2;
  const peakY = h - (maxVal / max) * h;

  return (
    <div className="area-chart" style={{ height }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gradient-sky)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-gradient-sky)" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id={`stroke-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-gradient-mint)" />
            <stop offset="100%" stopColor="var(--color-gradient-sky)" />
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
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {maxRaw > 0 && <circle className="area-chart__dot" cx={peakX} cy={peakY} r="5" fill="var(--color-gradient-sky)" />}
      </svg>
      <div className="area-chart__labels">
        {labels?.map((l) => <span key={l}>{l}</span>)}
      </div>
      <span className="area-chart__peak">peak {maxVal}{suffix}</span>
    </div>
  );
}
