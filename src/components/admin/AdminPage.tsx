import type { ReactNode } from 'react';

export function AdminPage({
  breadcrumb,
  title,
  count,
  actions,
  children,
}: {
  breadcrumb?: ReactNode;
  title: string;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-page-header-title">
          {breadcrumb ? <div className="admin-page-breadcrumb">{breadcrumb}</div> : null}
          <h1 className="admin-page-h1">
            {title}
            {typeof count === 'number' ? (
              <span className="admin-page-count">· {count.toLocaleString()}</span>
            ) : null}
          </h1>
        </div>
        {actions ? <div className="admin-page-actions">{actions}</div> : null}
      </header>
      <div className="admin-page-body">{children}</div>
    </div>
  );
}
