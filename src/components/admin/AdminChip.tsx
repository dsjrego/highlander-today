import type { ReactNode } from 'react';

export function AdminChip({
  tone = 'neu',
  dot = false,
  children,
}: {
  tone?: 'ok' | 'pend' | 'bad' | 'neu' | 'role';
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`admin-chip admin-chip-${tone}`}>
      {dot ? <span className="admin-chip-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
