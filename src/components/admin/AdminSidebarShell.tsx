'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { AdminSidebarNav } from '@/components/admin/AdminSidebarNav';

type AdminNavItem = {
  href: string;
  label: string;
};

type AdminNavSection = {
  title: string;
  items: ReadonlyArray<AdminNavItem>;
};

const SIDEBAR_COLLAPSED_KEY = 'hl-admin-sidebar-collapsed';
const SIDEBAR_ORDER_KEY = 'hl-admin-sidebar-order';
const SIDEBAR_SECTION_ORDER_KEY = 'hl-admin-sidebar-section-order';

function normalizeSections(
  sourceSections: ReadonlyArray<AdminNavSection>,
  preferredOrder: Record<string, { section: string; index: number }>,
  preferredSectionOrder: string[]
) {
  const originalSectionByHref = new Map<string, string>();
  const allItems = new Map<string, AdminNavItem>();

  for (const section of sourceSections) {
    for (const item of section.items) {
      originalSectionByHref.set(item.href, section.title);
      allItems.set(item.href, item);
    }
  }

  const normalizedSections = sourceSections.map((section) => {
    const items = [...allItems.values()]
      .filter((item) => {
        const preferredSection = preferredOrder[item.href]?.section;
        const fallbackSection = originalSectionByHref.get(item.href);
        return (preferredSection ?? fallbackSection) === section.title;
      })
      .sort((a, b) => {
        const left = preferredOrder[a.href];
        const right = preferredOrder[b.href];

        if (left?.section === section.title && right?.section === section.title) {
          return left.index - right.index;
        }

        if (left?.section === section.title) return -1;
        if (right?.section === section.title) return 1;

        return (
          section.items.findIndex((item) => item.href === a.href) -
          section.items.findIndex((item) => item.href === b.href)
        );
      });

    return {
      title: section.title,
      items,
    };
  });

  return [...normalizedSections].sort((a, b) => {
    const leftIndex = preferredSectionOrder.indexOf(a.title);
    const rightIndex = preferredSectionOrder.indexOf(b.title);

    if (leftIndex >= 0 && rightIndex >= 0) {
      return leftIndex - rightIndex;
    }

    if (leftIndex >= 0) return -1;
    if (rightIndex >= 0) return 1;

    return sourceSections.findIndex((section) => section.title === a.title) -
      sourceSections.findIndex((section) => section.title === b.title);
  });
}

export function AdminSidebarShell({
  sections,
  allowCustomization,
}: {
  sections: ReadonlyArray<AdminNavSection>;
  allowCustomization: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [preferredOrder, setPreferredOrder] = useState<Record<string, { section: string; index: number }>>({});
  const [preferredSectionOrder, setPreferredSectionOrder] = useState<string[]>([]);
  const [draggedHref, setDraggedHref] = useState<string | null>(null);
  const [draggedSectionTitle, setDraggedSectionTitle] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedCollapsed = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (storedCollapsed === '1') {
        setCollapsed(true);
      }

      const storedOrder = window.localStorage.getItem(SIDEBAR_ORDER_KEY);
      if (storedOrder) {
        setPreferredOrder(JSON.parse(storedOrder) as Record<string, { section: string; index: number }>);
      }

      const storedSectionOrder = window.localStorage.getItem(SIDEBAR_SECTION_ORDER_KEY);
      if (storedSectionOrder) {
        setPreferredSectionOrder(JSON.parse(storedSectionOrder) as string[]);
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

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_ORDER_KEY, JSON.stringify(preferredOrder));
    } catch {
      // Ignore storage failures.
    }
  }, [preferredOrder]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_SECTION_ORDER_KEY, JSON.stringify(preferredSectionOrder));
    } catch {
      // Ignore storage failures.
    }
  }, [preferredSectionOrder]);

  const orderedSections = useMemo(
    () => normalizeSections(sections, preferredOrder, preferredSectionOrder),
    [preferredOrder, preferredSectionOrder, sections]
  );

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
    setPreferredOrder(nextOrder);
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
    setPreferredSectionOrder(reordered);
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
