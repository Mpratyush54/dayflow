import { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import Badge from './Badge';
import Input from './Input';
import Dialog from './Dialog';
import { getEmployeeDirectory, type DirectoryEntry } from '../../api/employees';

const TONES = ['mint', 'peach', 'lavender', 'sky'] as const;

function toneFor(id: string) {
  return TONES[[...(id ?? '')].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length];
}

function initialsOf(name: string, email: string) {
  const base = name.trim() || email;
  return base
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function presenceMeta(presence: DirectoryEntry['presence']) {
  if (presence === 'present') return { icon: '●', label: 'Present', tone: 'success' as const };
  if (presence === 'leave') return { icon: '✈', label: 'On leave', tone: 'neutral' as const };
  return { icon: '●', label: 'Absent', tone: 'error' as const };
}

export default function EmployeeDirectory() {
  const [people, setPeople] = useState<DirectoryEntry[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<DirectoryEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEmployeeDirectory()
      .then((data) => { if (!cancelled) setPeople(data); })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load directory');
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!people) return [];
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.employeeId.toLowerCase().includes(q),
    );
  }, [people, query]);

  return (
    <>
      <Card className="bento__wide directory-card" heading="Employees">
        <div className="directory-search">
          <Input
            label="Search"
            type="search"
            placeholder="Name, email or ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        {!people && !error && (
          <div className="directory-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="directory-card-item skeleton-card">
                <div className="skeleton-avatar" style={{ width: 48, height: 48 }} />
                <div className="skeleton-line" style={{ width: '70%', marginTop: 10 }} />
                <div className="skeleton-line" style={{ width: '50%', marginTop: 6 }} />
              </div>
            ))}
          </div>
        )}

        {people && filtered.length === 0 && (
          <p className="dash-sub">No employees match your search.</p>
        )}

        {filtered.length > 0 && (
          <div className="directory-grid">
            {filtered.map((person) => {
              const meta = presenceMeta(person.presence);
              const tone = toneFor(person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  className="directory-card-item animate-in"
                  onClick={() => setSelected(person)}
                >
                  <span
                    className={`directory-card-item__dot directory-card-item__dot--${person.presence}`}
                    title={meta.label}
                    aria-hidden
                  >
                    {meta.icon}
                  </span>
                  <span className={`avatar avatar--${tone}`}>
                    {person.profilePicture ? (
                      <img src={person.profilePicture} alt="" loading="lazy" />
                    ) : (
                      initialsOf(person.name ?? '', person.email)
                    )}
                  </span>
                  <span className="directory-card-item__name">
                    {person.name?.trim() || person.email}
                  </span>
                  <span className="directory-card-item__id">{person.employeeId}</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name?.trim() || selected?.email || 'Employee'}
      >
        {selected && (
          <dl className="directory-detail">
            <div><dt>Employee ID</dt><dd>{selected.employeeId}</dd></div>
            <div><dt>Email</dt><dd>{selected.email}</dd></div>
            <div><dt>Role</dt><dd>{selected.role}</dd></div>
            <div>
              <dt>Status today</dt>
              <dd>
                <Badge tone={presenceMeta(selected.presence).tone}>
                  {presenceMeta(selected.presence).label}
                </Badge>
              </dd>
            </div>
          </dl>
        )}
      </Dialog>
    </>
  );
}
