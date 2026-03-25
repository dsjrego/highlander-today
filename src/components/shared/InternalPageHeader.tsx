import { ReactNode } from 'react';

interface InternalPageHeaderProps {
  label?: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
  titleClassName?: string;
}

export default function InternalPageHeader({
  label,
  title,
  actions,
  titleClassName,
}: InternalPageHeaderProps) {
  return (
    <section className="page-header">
      <div className="page-header-inner">
        <div className="flex max-w-3xl flex-col justify-center">
          {label ? <p className="page-label">{label}</p> : null}
          <h1 className={`page-title ${titleClassName ?? ''}`.trim()}>{title}</h1>
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
    </section>
  );
}
