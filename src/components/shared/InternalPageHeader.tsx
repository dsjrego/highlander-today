import { ReactNode } from 'react';

interface InternalPageHeaderProps {
  icon?: ReactNode;
  label?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  titleClassName?: string;
}

export default function InternalPageHeader({
  icon,
  label,
  title,
  description,
  actions,
  titleClassName,
}: InternalPageHeaderProps) {
  return (
    <section className="page-header">
      <div className="page-header-inner">
        <div className="page-header-main">
          {icon ? <div className="page-header-icon">{icon}</div> : null}
          <div className="page-header-content">
            {label ? <p className="page-label">{label}</p> : null}
            <h1 className={`page-title ${titleClassName ?? ''}`.trim()}>{title}</h1>
            {description ? <p className="page-description">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
    </section>
  );
}
