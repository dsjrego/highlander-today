import type { ReactNode } from 'react';

export function AdminBulkBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  if (count === 0) {
    return null;
  }

  return (
    <div className="admin-bulk-bar" role="region" aria-label={`${count} selected`}>
      <span className="admin-bulk-bar-count">{count} selected</span>
      <div className="admin-bulk-bar-spacer" />
      {children}
      <button
        type="button"
        className="admin-bulk-bar-clear"
        aria-label="Clear selection"
        onClick={onClear}
      >
        ×
      </button>
    </div>
  );
}
