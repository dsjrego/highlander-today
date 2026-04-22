'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

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
  'inline-link': 'admin-list-cell-button text-[#2563eb]',
  'inline-success': 'admin-list-cell-button text-[#1f7a45]',
  'inline-danger': 'admin-list-cell-button text-[var(--brand-accent)]',
};

type SharedCrudActionProps = {
  icon: LucideIcon;
  label: string;
  variant?: CrudActionVariant;
  iconClassName?: string;
  className?: string;
  children?: ReactNode;
};

export function CrudActionButton({
  icon: Icon,
  label,
  variant = 'neutral',
  iconClassName,
  className,
  children,
  ...props
}: SharedCrudActionProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      title={label}
      className={joinClasses(
        'crud-action-button',
        VARIANT_CLASS_NAMES[variant],
        className
      )}
      {...props}
    >
      <Icon aria-hidden="true" className={joinClasses('crud-action-icon h-4 w-4 shrink-0', iconClassName)} />
      <span className="crud-action-label">{children ?? label}</span>
    </button>
  );
}

export function CrudActionLink({
  icon: Icon,
  label,
  variant = 'inline-link',
  iconClassName,
  className,
  children,
  ...props
}: SharedCrudActionProps & ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      aria-label={label}
      title={label}
      className={joinClasses(
        'crud-action-button',
        VARIANT_CLASS_NAMES[variant],
        className
      )}
      {...props}
    >
      <Icon aria-hidden="true" className={joinClasses('crud-action-icon h-4 w-4 shrink-0', iconClassName)} />
      <span className="crud-action-label">{children ?? label}</span>
    </Link>
  );
}
