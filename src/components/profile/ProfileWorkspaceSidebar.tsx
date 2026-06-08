'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase } from 'lucide-react';
import type { ProfileWorkspaceNavSection } from '@/lib/profile-workspace';

function isActivePath(pathname: string, href: string) {
  if (/^\/profile\/[^/]+$/.test(href)) {
    return pathname === href;
  }

  if (href.includes('/workspace') && !href.endsWith('/workspace')) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return pathname === href;
}

export default function ProfileWorkspaceSidebar({
  sections,
}: {
  sections: ReadonlyArray<ProfileWorkspaceNavSection>;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-full flex-col bg-[var(--masthead-bg)] text-white">
      <div className="border-b border-white/10 px-6 py-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-accent)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <Briefcase className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex h-10 items-center">
            <p className="text-xs font-medium uppercase tracking-[0.22em] leading-none text-white/60">Workspace</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-7 px-4 py-7" aria-label="Workspace navigation">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/35">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-xl px-3 py-3 text-[1.05rem] font-medium transition ${
                      isActive
                        ? 'bg-white/10 text-white shadow-[inset_2px_0_0_var(--brand-accent)]'
                        : 'text-white/70 hover:bg-white/6 hover:text-white'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700/80 text-sm font-semibold text-white">
            WS
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Workspace Member</p>
            <p className="text-xs text-white/55">Organization manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
