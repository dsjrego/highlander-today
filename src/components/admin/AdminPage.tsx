import type { ReactNode } from 'react';
import { AdminCommandPalette } from './AdminCommandPalette';

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
        {breadcrumb ? (
          <div className="admin-page-breadcrumb">{breadcrumb}</div>
        ) : null}
        <div className="admin-page-header-row">
          <div className="admin-page-header-title">
            <h1 className="admin-page-h1">
              {title}
              {typeof count === 'number' ? (
                <span className="admin-page-count">
                  · {count.toLocaleString()}
                </span>
              ) : null}
            </h1>
          </div>
          <div className="admin-page-search">
            <AdminCommandPalette />
          </div>
        </div>
        {actions ? <div className="admin-page-actions">{actions}</div> : null}
      </header>
      <div className="admin-page-body">{children}</div>
    </div>
  );
}
