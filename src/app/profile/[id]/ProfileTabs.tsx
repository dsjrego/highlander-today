"use client";

import { ReactNode, useMemo, useState } from "react";

export interface ProfileTabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface ProfileTabsProps {
  tabs: ProfileTabItem[];
}

export default function ProfileTabs({ tabs }: ProfileTabsProps) {
  const safeTabs = useMemo(() => tabs.filter((tab) => tab.content !== null), [tabs]);
  const [activeTabId, setActiveTabId] = useState(safeTabs[0]?.id ?? "");

  const activeTab = safeTabs.find((tab) => tab.id === activeTabId) ?? safeTabs[0];

  if (!activeTab) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-3 rounded-[24px] border border-white/10 bg-slate-950/70 p-2 shadow-[0_18px_42px_rgba(15,23,42,0.18)]">
          {safeTabs.map((tab) => {
            const isActive = tab.id === activeTab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#46A8CC] text-slate-950 shadow-[0_12px_24px_rgba(70,168,204,0.28)]"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>{activeTab.content}</div>
    </div>
  );
}
