interface Person {
  initials: string;
  tone: string;
}

interface AvatarStackProps {
  people: Person[];
  max?: number;
}

export default function AvatarStack({ people, max = 3 }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;

  return (
    <span className="avatar-stack">
      {shown.map((p) => (
        <span key={p.initials} className={`avatar avatar--${p.tone}`}>{p.initials}</span>
      ))}
      {rest > 0 && <span className="avatar avatar--rest">+{rest}</span>}
    </span>
  );
}
