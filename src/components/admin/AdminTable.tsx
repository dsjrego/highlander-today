import { Fragment, type ReactNode } from 'react';

type AdminColumn<T> = {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => ReactNode;
};

const alignmentClasses = {
  left: 'admin-align-left',
  right: 'admin-align-right',
  center: 'admin-align-center',
};

/** List-first tables share semantics, alignment, scroll and empty-state handling. */
export function AdminTable<T>({
  label,
  columns,
  rows,
  rowKey,
  emptyMessage,
  expandedRowKey,
  renderExpanded,
}: {
  label: string;
  columns: AdminColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage: string;
  expandedRowKey?: string | null;
  renderExpanded?: (row: T) => ReactNode;
}) {
  return (
    <div className="admin-list">
      <div
        className="admin-list-table-wrap"
        tabIndex={0}
        role="region"
        aria-label={label}
      >
        <table className="admin-list-table" aria-label={label}>
          <thead className="admin-list-head">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                    className={`admin-list-header-cell ${alignmentClasses[column.align ?? 'left']}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <Fragment key={rowKey(row)}>
                  <tr
                    className={`admin-list-row ${expandedRowKey === rowKey(row) ? 'is-expanded' : ''}`}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`admin-list-cell ${alignmentClasses[column.align ?? 'left']}`}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                  {expandedRowKey === rowKey(row) && renderExpanded ? (
                    <tr className="admin-list-detail">
                      <td colSpan={columns.length}>{renderExpanded(row)}</td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            ) : (
              <tr>
                <td className="admin-list-empty" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
