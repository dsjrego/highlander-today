import { ReactNode } from 'react';

interface InternalPageHeaderProps {
  icon?: ReactNode;
  label?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  innerClassName?: string;
  mainClassName?: string;
  iconClassName?: string;
  contentClassName?: string;
  actionsClassName?: string;
  titleClassName?: string;
}

export default function InternalPageHeader({
  icon,
  label,
  title,
  description,
  actions,
  className,
  innerClassName,
  mainClassName,
  iconClassName,
  contentClassName,
  actionsClassName,
  titleClassName,
}: InternalPageHeaderProps) {
  const hasActions = actions !== undefined && actions !== null && actions !== false;

  return (
    <section className={`page-header ${className ?? ''}`.trim()}>
      <div className={`page-header-inner ${innerClassName ?? ''}`.trim()}>
        <div className={`page-header-main ${mainClassName ?? ''}`.trim()}>
          {icon ? <div className={`page-header-icon ${iconClassName ?? ''}`.trim()}>{icon}</div> : null}
          <div className={`page-header-content ${contentClassName ?? ''}`.trim()}>
            {label ? <p className="page-label">{label}</p> : null}
            <h1 className={`page-title ${titleClassName ?? ''}`.trim()}>{title}</h1>
            {description ? <p className="page-description">{description}</p> : null}
          </div>
        </div>
        <div
          className={`page-actions ${!hasActions ? 'page-actions-placeholder' : ''} ${actionsClassName ?? ''}`.trim()}
          aria-hidden={hasActions ? undefined : true}
        >
          {actions}
        </div>
      </div>
    </section>
  );
}
