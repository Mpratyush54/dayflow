import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface Command {
  label: string;
  hint?: string;
  to: string;
}

export default function CommandPalette({ commands }: { commands: Command[] }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setQuery('');
        setIndex(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(
    () => commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase())),
    [commands, query],
  );

  function choose(i: number) {
    const item = results[i];
    if (!item) return;
    setOpen(false);
    navigate(item.to);
  }

  if (!open) return null;

  return (
    <div className="cmdk__backdrop" onClick={() => setOpen(false)}>
      <div className="cmdk" onClick={e => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <input
          ref={inputRef}
          className="cmdk__input"
          placeholder="Search pages, employees, actions…"
          value={query}
          onChange={e => { setQuery(e.target.value); setIndex(0); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, results.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)); }
            if (e.key === 'Enter') choose(index);
          }}
        />
        <ul className="cmdk__list">
          {results.map((c, i) => (
            <li
              key={c.label}
              className={`cmdk__item ${i === index ? 'is-active' : ''}`}
              onMouseEnter={() => setIndex(i)}
              onClick={() => choose(i)}
            >
              <span>{c.label}</span>
              {c.hint && <span className="cmdk__hint">{c.hint}</span>}
            </li>
          ))}
          {results.length === 0 && <li className="cmdk__empty">No matches</li>}
        </ul>
        <div className="cmdk__footer">
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}
