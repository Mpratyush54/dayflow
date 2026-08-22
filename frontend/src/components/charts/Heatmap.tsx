interface HeatmapProps {
  days: { date: number; level: 0 | 1 | 2 | 3 }[];
}

export default function Heatmap({ days }: HeatmapProps) {
  return (
    <div className="heatmap" role="img" aria-label="Attendance heatmap for the month">
      {days.map((d) => (
        <span key={d.date} className={`heatmap__cell heatmap__cell--${d.level}`} title={`${d.date}: level ${d.level}`} />
      ))}
    </div>
  );
}
