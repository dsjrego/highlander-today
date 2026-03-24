import { ReactNode } from 'react';

interface InternalPageHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
  titleClassName?: string;
}

export default function InternalPageHeader({
  title,
  actions,
  titleClassName,
}: InternalPageHeaderProps) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.96),rgba(10,32,51,0.94))] px-6 py-4.5 text-white shadow-[0_35px_80px_rgba(7,17,26,0.22)] md:px-10 md:py-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex max-w-3xl items-center md:self-center">
          <h1
            className={`translate-y-1.5 text-sm font-semibold uppercase tracking-[0.32em] leading-none ${
              titleClassName ?? 'text-cyan-100/74'
            }`}
          >
            {title}
          </h1>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
