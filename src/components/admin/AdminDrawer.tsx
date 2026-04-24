'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

export function AdminDrawer({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const focus = params.get('focus');

  function close() {
    const next = new URLSearchParams(params);
    next.delete('focus');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  useEffect(() => {
    if (!focus) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus, pathname, params, router]);

  if (!focus) {
    return null;
  }

  return (
    <>
      <div className="admin-drawer-scrim" onClick={close} />
      <aside className="admin-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header className="admin-drawer-head">
          <h2 className="admin-drawer-title">{title}</h2>
          <button type="button" className="admin-drawer-close" aria-label="Close" onClick={close}>
            ×
          </button>
        </header>
        <div className="admin-drawer-body">{children}</div>
      </aside>
    </>
  );
}
