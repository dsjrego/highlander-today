import Link from 'next/link';
import type {
  ButtonHTMLAttributes,
  ComponentPropsWithoutRef,
  ReactNode,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { ActionTooltip } from './ActionTooltip';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

type CrudActionVariant =
  | 'primary'
  | 'secondary'
  | 'neutral'
  | 'danger'
  | 'inline'
  | 'inline-link'
  | 'inline-success'
  | 'inline-danger';

const VARIANT_CLASS_NAMES: Record<CrudActionVariant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  neutral: 'btn btn-neutral',
  danger: 'btn btn-danger',
  inline: 'admin-list-cell-button',
  'inline-link': 'admin-list-cell-button crud-action-link',
  'inline-success': 'admin-list-cell-button crud-action-success',
  'inline-danger': 'admin-list-cell-button crud-action-danger',
};

type SharedCrudActionProps = {
  icon: LucideIcon;
  label: string;
  variant?: CrudActionVariant;
  iconClassName?: string;
  className?: string;
  children?: ReactNode;
  iconOnly?: boolean;
};

export function CrudActionButton({
  icon: Icon,
  label,
  variant = 'neutral',
  iconClassName,
  className,
  children,
  iconOnly = variant.startsWith('inline'),
  title,
  ...props
}: SharedCrudActionProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <ActionTooltip text={title || label} enabled={iconOnly}>
      <button
        aria-label={label}
        title={iconOnly ? undefined : title || label}
        className={joinClasses(
          'crud-action-button',
          iconOnly && 'crud-action-icon-only',
          VARIANT_CLASS_NAMES[variant],
          className,
        )}
        {...props}
      >
        <Icon
          aria-hidden="true"
          className={joinClasses(
            'crud-action-icon h-4 w-4 shrink-0',
            iconClassName,
          )}
        />
        {!iconOnly ? (
          <span className="crud-action-label">{children ?? label}</span>
        ) : null}
      </button>
    </ActionTooltip>
  );
}

export function CrudActionLink({
  icon: Icon,
  label,
  variant = 'inline-link',
  iconClassName,
  className,
  children,
  iconOnly = variant.startsWith('inline'),
  title,
  ...props
}: SharedCrudActionProps & ComponentPropsWithoutRef<typeof Link>) {
  return (
    <ActionTooltip text={title || label} enabled={iconOnly}>
      <Link
        aria-label={label}
        title={iconOnly ? undefined : title || label}
        className={joinClasses(
          'crud-action-button',
          iconOnly && 'crud-action-icon-only',
          VARIANT_CLASS_NAMES[variant],
          className,
        )}
        {...props}
      >
        <Icon
          aria-hidden="true"
          className={joinClasses(
            'crud-action-icon h-4 w-4 shrink-0',
            iconClassName,
          )}
        />
        {!iconOnly ? (
          <span className="crud-action-label">{children ?? label}</span>
        ) : null}
      </Link>
    </ActionTooltip>
  );
}
