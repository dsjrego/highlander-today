"use client";

import { KeyboardEvent, ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";

export interface ProfileTabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface ProfileTabsProps {
  tabs: ProfileTabItem[];
  initialActiveTabId?: string;
}

export default function ProfileTabs({ tabs, initialActiveTabId }: ProfileTabsProps) {
  const tabListId = useId();
  const safeTabs = useMemo(() => tabs.filter((tab) => tab.content !== null), [tabs]);
  const normalizedInitialTabId = safeTabs.some((tab) => tab.id === initialActiveTabId)
    ? initialActiveTabId
    : safeTabs[0]?.id ?? "";
  const [activeTabId, setActiveTabId] = useState(normalizedInitialTabId);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setActiveTabId(normalizedInitialTabId);
  }, [normalizedInitialTabId]);

  const activeTab = safeTabs.find((tab) => tab.id === activeTabId) ?? safeTabs[0];

  if (!activeTab) {
    return null;
  }

  function focusTab(index: number) {
    tabRefs.current[index]?.focus();
  }

  function activateTabByIndex(index: number) {
    const nextTab = safeTabs[index];
    if (!nextTab) {
      return;
    }

    setActiveTabId(nextTab.id);
    focusTab(index);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (safeTabs.length < 2) {
      return;
    }

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        activateTabByIndex((index + 1) % safeTabs.length);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        activateTabByIndex((index - 1 + safeTabs.length) % safeTabs.length);
        break;
      case "Home":
        event.preventDefault();
        activateTabByIndex(0);
        break;
      case "End":
        event.preventDefault();
        activateTabByIndex(safeTabs.length - 1);
        break;
      default:
        break;
    }
  }

  const activePanelId = `${tabListId}-${activeTab.id}-panel`;

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <div
          role="tablist"
          aria-label="Profile sections"
          className="flex min-w-max gap-3 rounded-[24px] border border-white/10 bg-slate-950/70 p-2 shadow-[0_18px_42px_rgba(15,23,42,0.18)]"
        >
          {safeTabs.map((tab, index) => {
            const isActive = tab.id === activeTab.id;
            const tabId = `${tabListId}-${tab.id}-tab`;
            const panelId = `${tabListId}-${tab.id}-panel`;

            return (
              <button
                key={tab.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                role="tab"
                id={tabId}
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[var(--brand-primary)] text-slate-950 shadow-[0_12px_24px_rgba(70,168,204,0.28)]"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={activePanelId}
        aria-labelledby={`${tabListId}-${activeTab.id}-tab`}
        tabIndex={0}
      >
        {activeTab.content}
      </div>
    </div>
  );
}
