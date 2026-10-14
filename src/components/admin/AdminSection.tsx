import type { ReactNode } from 'react';

export function AdminSection({
  title,
  count,
  actions,
  children,
}: {
  title: string;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="admin-section-card" aria-label={title}>
      <div className="admin-section-card-head">
        <h2 className="admin-section-card-title">
          {title}
          {typeof count === 'number' ? (
            <span className="admin-section-count">
              {count.toLocaleString()}
            </span>
          ) : null}
        </h2>
        {actions ? <div className="admin-row-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
