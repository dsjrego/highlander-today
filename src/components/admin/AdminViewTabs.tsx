'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type View = { key: string; label: string; count?: number; tone?: 'pend' | 'bad' };

export function AdminViewTabs({ views, defaultView }: { views: View[]; defaultView: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get('view') ?? defaultView;

  return (
    <div className="admin-view-tabs" role="tablist">
      {views.map((view) => {
        const isActive = view.key === active;
        return (
          <button
            key={view.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`admin-view-tab ${isActive ? 'is-active' : ''}`}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set('view', view.key);
              router.replace(`${pathname}?${next.toString()}`);
            }}
          >
            {view.tone ? (
              <span
                className={`admin-view-tab-dot admin-view-tab-dot-${view.tone}`}
                aria-hidden="true"
              />
            ) : null}
            {view.label}
            {typeof view.count === 'number' ? (
              <span className="admin-view-tab-count">{view.count.toLocaleString()}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
