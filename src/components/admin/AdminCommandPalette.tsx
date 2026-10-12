'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useDialogAccessibility } from '@/components/shared/useDialogAccessibility';

type CommandRoute = {
  href: string;
  label: string;
};

const CommandPaletteContext = createContext<(() => void) | null>(null);

export function AdminCommandPaletteProvider({
  routes,
  children,
}: {
  routes: CommandRoute[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);

  useDialogAccessibility({
    isOpen: open,
    onClose: closePalette,
    containerRef: dialogRef,
    initialFocusRef: inputRef,
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
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

  return (
    <CommandPaletteContext.Provider value={openPalette}>
      {children}
      {open ? (
        <div className="admin-palette-scrim" onClick={closePalette}>
          <div
            ref={dialogRef}
            className="admin-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Administrator route search"
            onClick={(e) => e.stopPropagation()}
          >
            <label htmlFor="admin-route-search" className="admin-palette-label">
              Search administrator routes
            </label>
            <input
              ref={inputRef}
              id="admin-route-search"
              className="admin-palette-input"
              placeholder="Jump to a route, run a command, or paste a link…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <ul className="admin-palette-results">
              {results.map((route) => (
                <li key={route.href}>
                  <button
                    type="button"
                    className="admin-palette-row"
                    onClick={() => {
                      router.push(route.href);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    {route.label}
                  </button>
                </li>
              ))}
              {results.length === 0 ? (
                <li className="admin-palette-empty">No matching routes.</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </CommandPaletteContext.Provider>
  );
}

export function AdminCommandPalette() {
  const openPalette = useContext(CommandPaletteContext);
  if (!openPalette) return null;

  return (
    <button
      type="button"
      className="admin-palette-trigger"
      aria-label="Jump to an administrator route"
      aria-haspopup="dialog"
      onClick={openPalette}
    >
      <Search className="admin-palette-trigger-icon" aria-hidden="true" />
      <span className="admin-palette-trigger-copy">
        Jump to a route, run a command, or paste a link…
      </span>
      <kbd className="admin-kbd" aria-hidden="true">
        ⌘K
      </kbd>
    </button>
  );
}
