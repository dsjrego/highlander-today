import type { ReactNode } from 'react';

type FormCardProps = {
  children: ReactNode;
  className?: string;
};

type FormCardActionsProps = {
  children: ReactNode;
  className?: string;
};

export default function FormCard({ children, className = '' }: FormCardProps) {
  return (
    <section
      className={`rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] p-5 shadow-[0_24px_55px_rgba(15,23,42,0.16)] backdrop-blur md:p-7 ${className}`.trim()}
    >
      {children}
    </section>
  );
}

export function FormCardActions({ children, className = '' }: FormCardActionsProps) {
  return <div className={`form-card-actions ${className}`.trim()}>{children}</div>;
}
