/**
 * Shared skeleton / shimmer building blocks.
 * All components use the existing .skeleton-card / .skeleton-line CSS
 * so no extra styles are needed.
 */

interface SkeletonCardProps {
  className?: string;
  children: React.ReactNode;
}

export function SkeletonCard({ className = '', children }: SkeletonCardProps) {
  return (
    <div className={`skeleton-card ${className}`}>
      {children}
    </div>
  );
}

interface SkeletonLineProps {
  /** CSS width string, e.g. "60%" or "120px". Defaults to "70%". */
  width?: string;
  /** CSS height string. Defaults to "14px". */
  height?: string;
  style?: React.CSSProperties;
}

export function SkeletonLine({ width = '70%', height = '14px', style }: SkeletonLineProps) {
  return (
    <div
      className="skeleton-line"
      style={{ width, height, ...style }}
    />
  );
}

/** A big title-style skeleton line */
export function SkeletonTitle({ width = '45%' }: { width?: string }) {
  return <SkeletonLine width={width} height="22px" />;
}

/** A small circular avatar blob */
export function SkeletonAvatar({ size = 48 }: { size?: number }) {
  return (
    <div
      className="skeleton-line"
      style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }}
    />
  );
}

/** A single stat card placeholder */
export function SkeletonStat({ className = '' }: { className?: string }) {
  return (
    <SkeletonCard className={className}>
      <SkeletonTitle width="55%" />
      <SkeletonLine width="40%" height="36px" style={{ marginTop: 12 }} />
      <SkeletonLine width="70%" style={{ marginTop: 8 }} />
    </SkeletonCard>
  );
}

/** A table body placeholder: `rows` rows, each with `cols` shimmer cells */
interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export function SkeletonTableRows({ rows = 5, cols = 4 }: SkeletonTableProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} style={{ opacity: 1 - r * 0.12 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} style={{ padding: '10px 12px' }}>
              <div
                className="skeleton-line"
                style={{ width: c === 0 ? '80%' : c === cols - 1 ? '50%' : '65%' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Full table skeleton including a thead placeholder */
export function SkeletonTable({ rows = 5, cols = 4 }: SkeletonTableProps) {
  return (
    <table className="table" style={{ opacity: 0.7 }}>
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i}>
              <div className="skeleton-line" style={{ width: i === 0 ? '60%' : '40%', height: '12px' }} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <SkeletonTableRows rows={rows} cols={cols} />
      </tbody>
    </table>
  );
}
