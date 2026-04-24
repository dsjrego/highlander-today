import type { ReactNode } from 'react';

export function AdminFilterBar({
  search,
  children,
  right,
}: {
  search?: ReactNode;
  children?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="admin-filter-bar" role="toolbar" aria-label="Filters">
      {search ? <div className="admin-filter-bar-search">{search}</div> : null}
      <div className="admin-filter-bar-facets">{children}</div>
      {right ? <div className="admin-filter-bar-right">{right}</div> : null}
    </div>
  );
}

export function AdminFacet({
  active,
  onClear,
  onClick,
  children,
}: {
  active?: boolean;
  onClear?: () => void;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`admin-facet ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      {children}
      {active && onClear ? (
        <span
          role="button"
          aria-label="Clear filter"
          className="admin-facet-clear"
          onClick={(event) => {
            event.stopPropagation();
            onClear();
          }}
        >
          ×
        </span>
      ) : null}
    </button>
  );
}
