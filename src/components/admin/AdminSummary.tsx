import type { ReactNode } from 'react';

export function AdminSummary({
  label,
  items,
}: {
  label: string;
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="admin-summary" aria-label={label}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
