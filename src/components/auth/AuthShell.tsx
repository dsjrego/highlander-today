import Link from 'next/link';
import type { ReactNode } from 'react';
import InternalPageHeader from '@/components/shared/InternalPageHeader';

interface AuthShellProps {
  showHeader?: boolean;
  showIntroCard?: boolean;
  showAsideCard?: boolean;
  centeredForm?: boolean;
  wrapChildrenCard?: boolean;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  asideTitle: string;
  asideBody: string;
  asideFooter?: ReactNode;
}

export default function AuthShell({
  showHeader = true,
  showIntroCard = true,
  showAsideCard = true,
  centeredForm = false,
  wrapChildrenCard = true,
  eyebrow,
  title,
  description,
  children,
  asideTitle,
  asideBody,
  asideFooter,
}: AuthShellProps) {
  return (
    <div className="space-y-8">
      {showHeader ? (
        <InternalPageHeader label={eyebrow} title={title} titleClassName="text-white" />
      ) : null}

      <section
        className={
          centeredForm
            ? "mx-auto grid w-full max-w-5xl gap-6"
            : "grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,28rem)]"
        }
      >
        <div className={centeredForm ? "hidden" : "space-y-6"}>
          {showIntroCard ? (
            <div className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
              <h2 className="empty-state-title mb-3">{title}</h2>
              <p className="mb-0 max-w-2xl text-base leading-8 text-slate-600">
                {description}
              </p>
            </div>
          ) : null}

          {showAsideCard ? (
            <div className="rounded-[28px] border border-white/10 bg-slate-950 p-6 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/70">
                New Here
              </p>
              <h3 className="mb-3 text-xl font-bold text-white">{asideTitle}</h3>
              <p className="mb-0 text-sm leading-7 text-white/72">{asideBody}</p>
              {asideFooter ? <div className="mt-5">{asideFooter}</div> : null}
            </div>
          ) : null}
        </div>

        {wrapChildrenCard ? (
          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] p-5 shadow-[0_24px_55px_rgba(15,23,42,0.16)] backdrop-blur md:p-7">
            {children}
          </div>
        ) : (
          children
        )}
      </section>
    </div>
  );
}

export function AuthAsideLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/12"
    >
      {children}
    </Link>
  );
}
