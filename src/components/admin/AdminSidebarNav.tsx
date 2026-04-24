'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

type AdminNavItem = {
  href: string;
  label: string;
};

type AdminNavSection = {
  title: string;
  items: ReadonlyArray<AdminNavItem>;
};

const SIDEBAR_SECTION_STATE_KEY = 'hl-admin-sidebar-sections';

function isActivePath(pathname: string, href: string) {
  if (href === '/admin') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebarNav({
  sections,
  collapsed = false,
  draggable = false,
  draggedHref = null,
  draggedSectionTitle = null,
  onDragStart,
  onDragEnd,
  onSectionDragStart,
  onSectionDragEnd,
  onMoveItem,
  onMoveSection,
}: {
  sections: ReadonlyArray<AdminNavSection>;
  collapsed?: boolean;
  draggable?: boolean;
  draggedHref?: string | null;
  draggedSectionTitle?: string | null;
  onDragStart?: (href: string) => void;
  onDragEnd?: () => void;
  onSectionDragStart?: (title: string) => void;
  onSectionDragEnd?: () => void;
  onMoveItem?: (sourceHref: string, targetHref: string | null, targetSectionTitle: string) => void;
  onMoveSection?: (sourceTitle: string, targetTitle: string) => void;
}) {
  const pathname = usePathname();
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_SECTION_STATE_KEY);
      if (stored) {
        setCollapsedSections(JSON.parse(stored) as Record<string, boolean>);
      }
    } catch {
      // Ignore malformed browser storage and keep defaults.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_SECTION_STATE_KEY, JSON.stringify(collapsedSections));
    } catch {
      // Ignore storage failures.
    }
  }, [collapsedSections]);

  function toggleSection(title: string) {
    setCollapsedSections((current) => ({
      ...current,
      [title]: !current[title],
    }));
  }

  return (
    <nav className="admin-sidebar-nav" aria-label="Admin navigation">
      {sections.map((section) => {
        const hasActiveItem = section.items.some((item) => isActivePath(pathname, item.href));
        const isSectionCollapsed = !collapsed && !hasActiveItem && collapsedSections[section.title] === true;

        return (
          <div
            key={section.title}
            className={`admin-sidebar-section ${dragOverSection === section.title ? 'is-drop-target' : ''}`}
            onDragOver={(event) => {
              if (!draggable || (!draggedHref && !draggedSectionTitle)) {
                return;
              }

              event.preventDefault();
              setDragOverSection(section.title);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDragOverSection((current) => (current === section.title ? null : current));
              }
            }}
            onDrop={(event) => {
              if (!draggable || (!draggedHref && !draggedSectionTitle)) {
                return;
              }

              event.preventDefault();
              if (draggedSectionTitle && draggedSectionTitle !== section.title) {
                onMoveSection?.(draggedSectionTitle, section.title);
                onSectionDragEnd?.();
              } else if (draggedHref) {
                onMoveItem?.(draggedHref, null, section.title);
                onDragEnd?.();
              }
              setDragOverSection(null);
            }}
          >
            {!collapsed ? (
              <button
                type="button"
                className="admin-sidebar-section-toggle"
                onClick={() => toggleSection(section.title)}
                draggable={draggable}
                onDragStart={() => onSectionDragStart?.(section.title)}
                onDragEnd={() => onSectionDragEnd?.()}
                aria-expanded={!isSectionCollapsed}
                aria-controls={`admin-sidebar-section-${section.title}`}
              >
                <span className="admin-sidebar-section-title">{section.title}</span>
                <span className="admin-sidebar-section-toggle-icon" aria-hidden="true">
                  {isSectionCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                </span>
              </button>
            ) : null}
            {!isSectionCollapsed ? (
              <div
                id={`admin-sidebar-section-${section.title}`}
                className="admin-sidebar-section-list"
              >
                {section.items.map((item) => {
                  const isActive = isActivePath(pathname, item.href);
                  const isDragged = draggedHref === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      draggable={draggable}
                      onDragStart={() => onDragStart?.(item.href)}
                      onDragEnd={() => onDragEnd?.()}
                      onDragOver={(event) => {
                        if (!draggable || !draggedHref || draggedHref === item.href) {
                          return;
                        }

                        event.preventDefault();
                      }}
                      onDrop={(event) => {
                        if (!draggable || !draggedHref || draggedHref === item.href) {
                          return;
                        }

                        event.preventDefault();
                        onMoveItem?.(draggedHref, item.href, section.title);
                        setDragOverSection(null);
                        onDragEnd?.();
                      }}
                      className={`admin-sidebar-link ${isActive ? 'is-active' : ''} ${isDragged ? 'is-dragged' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                    >
                      {draggable ? (
                        <span className="admin-sidebar-link-grip" aria-hidden="true">
                          <GripVertical className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                      <span className="admin-sidebar-link-label">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
