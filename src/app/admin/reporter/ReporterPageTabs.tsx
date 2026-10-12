'use client';

import { useRef, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const sections = [
  { key: 'editor-ready', label: 'Editor Ready' },
  { key: 'assigned', label: 'Assigned Stories' },
  { key: 'candidates', label: 'Candidates' },
  { key: 'interviews', label: 'Interviews' },
] as const;

type SectionKey = (typeof sections)[number]['key'];

export default function ReporterPageTabs({
  panels,
}: {
  panels: Record<SectionKey, ReactNode>;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const requested = params.get('section');
  // Existing run filters/create links still open the reporting-job panel.
  const legacyView = params.get('view');
  const fallback =
    (legacyView && legacyView !== 'editor-ready') || params.has('focus')
      ? 'assigned'
      : 'editor-ready';
  const active = sections.some((section) => section.key === requested)
    ? requested
    : fallback;

  function select(key: SectionKey) {
    const next = new URLSearchParams(params);
    next.set('section', key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div>
      <div
        className="admin-view-tabs"
        role="tablist"
        aria-label="Reporter queues"
      >
        {sections.map((section, index) => (
          <button
            key={section.key}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            id={`reporter-tab-${section.key}`}
            type="button"
            role="tab"
            aria-selected={active === section.key}
            aria-controls={`reporter-panel-${section.key}`}
            tabIndex={active === section.key ? 0 : -1}
            className={`admin-view-tab ${active === section.key ? 'is-active' : ''}`}
            onClick={() => select(section.key)}
            onKeyDown={(event) => {
              let target: number;
              if (event.key === 'ArrowRight')
                target = (index + 1) % sections.length;
              else if (event.key === 'ArrowLeft')
                target = (index + sections.length - 1) % sections.length;
              else if (event.key === 'Home') target = 0;
              else if (event.key === 'End') target = sections.length - 1;
              else return;
              event.preventDefault();
              tabs.current[target]?.focus();
              select(sections[target].key);
            }}
          >
            {section.label}
          </button>
        ))}
      </div>
      {sections.map((section) => (
        <div
          key={section.key}
          id={`reporter-panel-${section.key}`}
          role="tabpanel"
          aria-labelledby={`reporter-tab-${section.key}`}
          tabIndex={0}
          hidden={active !== section.key}
        >
          {panels[section.key]}
        </div>
      ))}
    </div>
  );
}
