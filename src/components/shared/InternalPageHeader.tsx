import { ReactNode } from 'react';

interface InternalPageHeaderProps {
  icon?: ReactNode;
  label?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  mobileAlign?: 'start' | 'center';
  compactMobile?: boolean;
  reserveActionsSpace?: boolean;
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
  mobileAlign = 'center',
  compactMobile = false,
  reserveActionsSpace = false,
  className,
  innerClassName,
  mainClassName,
  iconClassName,
  contentClassName,
  actionsClassName,
  titleClassName,
}: InternalPageHeaderProps) {
  const hasActions = actions !== undefined && actions !== null && actions !== false;
  const shouldRenderActionsSlot = hasActions || reserveActionsSpace;

  return (
    <section className={`page-header ${compactMobile ? 'page-header-compact-mobile' : ''} ${className ?? ''}`.trim()}>
      <div
        className={`page-header-inner page-header-mobile-${mobileAlign} ${innerClassName ?? ''}`.trim()}
      >
        <div className={`page-header-main ${mobileAlign === 'start' ? 'page-header-main-mobile-start' : ''} ${mainClassName ?? ''}`.trim()}>
          {icon ? <div className={`page-header-icon ${iconClassName ?? ''}`.trim()}>{icon}</div> : null}
          <div
            className={`page-header-content ${mobileAlign === 'start' ? 'page-header-content-mobile-start' : ''} ${contentClassName ?? ''}`.trim()}
          >
            {label ? <p className="page-label">{label}</p> : null}
            <h1 className={`page-title ${titleClassName ?? ''}`.trim()}>{title}</h1>
            {description ? <p className="page-description">{description}</p> : null}
          </div>
        </div>
        {shouldRenderActionsSlot ? (
          <div
            className={`page-actions ${!hasActions ? 'page-actions-placeholder' : ''} ${actionsClassName ?? ''}`.trim()}
            aria-hidden={hasActions ? undefined : true}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
