import type { ReactNode } from 'react';

const toneClasses = {
  ok: 'admin-chip-ok',
  pend: 'admin-chip-pend',
  bad: 'admin-chip-bad',
  neu: 'admin-chip-neu',
  role: 'admin-chip-role',
};

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
    <span className={`admin-chip ${toneClasses[tone]}`}>
      {dot ? <span className="admin-chip-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
