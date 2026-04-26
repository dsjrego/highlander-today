'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { AdminSidebarNav } from '@/components/admin/AdminSidebarNav';
import { normalizeAdminNavSections } from '@/lib/admin-navigation';
import type { AdminNavItem, AdminNavSection, AdminSidebarOrder } from '@/lib/admin-navigation';

const SIDEBAR_COLLAPSED_KEY = 'hl-admin-sidebar-collapsed';

export function AdminSidebarShell({
  sections,
  allowCustomization,
  initialSidebarOrder,
}: {
  sections: ReadonlyArray<AdminNavSection>;
  allowCustomization: boolean;
  initialSidebarOrder: AdminSidebarOrder;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOrder, setSidebarOrder] = useState<AdminSidebarOrder>(initialSidebarOrder);
  const [draggedHref, setDraggedHref] = useState<string | null>(null);
  const [draggedSectionTitle, setDraggedSectionTitle] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedCollapsed = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (storedCollapsed === '1') {
        setCollapsed(true);
      }
    } catch {
      // Ignore malformed browser storage and use the default navigation.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      // Ignore storage failures.
    }
  }, [collapsed]);

  const orderedSections = useMemo(
    () => normalizeAdminNavSections(sections, sidebarOrder),
    [sidebarOrder, sections]
  );

  async function persistSidebarOrder(nextSidebarOrder: AdminSidebarOrder) {
    try {
      const response = await fetch('/api/admin/sidebar-order', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nextSidebarOrder),
      });

      if (!response.ok) {
        throw new Error('Failed to save admin sidebar order');
      }
    } catch (error) {
      console.error(error);
    }
  }

  function handleMoveItem(sourceHref: string, targetHref: string | null, targetSectionTitle: string) {
    if (!allowCustomization || (targetHref !== null && sourceHref === targetHref)) {
      return;
    }

    const nextSections = orderedSections.map((section) => ({
      title: section.title,
      items: [...section.items],
    }));

    let movedItem: AdminNavItem | null = null;

    for (const section of nextSections) {
      const itemIndex = section.items.findIndex((item) => item.href === sourceHref);
      if (itemIndex >= 0) {
        [movedItem] = section.items.splice(itemIndex, 1);
        break;
      }
    }

    if (!movedItem) {
      return;
    }

    for (const section of nextSections) {
      if (section.title !== targetSectionTitle) continue;

      const targetIndex =
        targetHref === null ? -1 : section.items.findIndex((item) => item.href === targetHref);

      if (targetIndex >= 0) {
        section.items.splice(targetIndex, 0, movedItem);
      } else {
        section.items.push(movedItem);
      }
      break;
    }

    const nextOrder = Object.fromEntries(
      nextSections.flatMap((section) =>
        section.items.map((item, index) => [item.href, { section: section.title, index }])
      )
    );
    const nextSidebarOrder = {
      ...sidebarOrder,
      preferredOrder: nextOrder,
    };
    setSidebarOrder(nextSidebarOrder);
    void persistSidebarOrder(nextSidebarOrder);
  }

  function handleMoveSection(sourceTitle: string, targetTitle: string) {
    if (!allowCustomization || sourceTitle === targetTitle) {
      return;
    }

    const nextSectionTitles = orderedSections.map((section) => section.title);
    const sourceIndex = nextSectionTitles.indexOf(sourceTitle);
    const targetIndex = nextSectionTitles.indexOf(targetTitle);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const reordered = [...nextSectionTitles];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const nextSidebarOrder = {
      ...sidebarOrder,
      preferredSectionOrder: reordered,
    };
    setSidebarOrder(nextSidebarOrder);
    void persistSidebarOrder(nextSidebarOrder);
  }

  return (
    <aside className={`admin-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="admin-sidebar-header">
        <div className="admin-sidebar-brand-row">
          <button
            type="button"
            className="admin-sidebar-toggle"
            onClick={() => setCollapsed((current) => !current)}
            aria-label={collapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
            aria-pressed={collapsed}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AdminSidebarNav
        sections={orderedSections}
        collapsed={collapsed}
        draggable={allowCustomization && !collapsed}
        draggedHref={draggedHref}
        draggedSectionTitle={draggedSectionTitle}
        onDragStart={setDraggedHref}
        onDragEnd={() => setDraggedHref(null)}
        onSectionDragStart={setDraggedSectionTitle}
        onSectionDragEnd={() => setDraggedSectionTitle(null)}
        onMoveItem={handleMoveItem}
        onMoveSection={handleMoveSection}
      />

      <div className="admin-sidebar-footer">
        <Link href="/" className="admin-sidebar-footer-link">
          {collapsed ? 'Home' : 'Back to Site'}
        </Link>
      </div>
    </aside>
  );
}
