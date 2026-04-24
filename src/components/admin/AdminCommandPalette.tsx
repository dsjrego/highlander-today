'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type CommandRoute = {
  href: string;
  label: string;
};

export function AdminCommandPalette({ routes }: { routes: CommandRoute[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }

      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return routes
      .filter((route) => route.label.toLowerCase().includes(normalized))
      .slice(0, 8);
  }, [query, routes]);

  if (!open) {
    return (
      <button type="button" className="admin-palette-trigger" onClick={() => setOpen(true)}>
        <span>Jump to a route, run a command, or paste a link…</span>
        <kbd className="admin-kbd">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="admin-palette-scrim" onClick={() => setOpen(false)}>
      <div className="admin-palette" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="admin-palette-input"
          placeholder="Jump to a route, run a command, or paste a link…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <ul className="admin-palette-results" role="listbox">
          {results.map((route) => (
            <li
              key={route.href}
              className="admin-palette-row"
              onClick={() => {
                router.push(route.href);
                setOpen(false);
                setQuery('');
              }}
            >
              {route.label}
            </li>
          ))}
          {results.length === 0 ? <li className="admin-palette-empty">No matching routes.</li> : null}
        </ul>
      </div>
    </div>
  );
}
