"use client";

import { ReactNode } from "react";

type StatusMessageVariant = "error" | "warning" | "message" | "success";

interface StatusMessageProps {
  variant: StatusMessageVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

function joinClasses(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

const VARIANT_STYLES: Record<
  StatusMessageVariant,
  { root: string; icon: string; iconPath: JSX.Element }
> = {
  error: {
    root: "status-message status-message-error",
    icon: "status-message-icon status-message-icon-error",
    iconPath: (
      <path
        d="M10 6v5m0 3h.01M18 10a8 8 0 11-16 0 8 8 0 0116 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  warning: {
    root: "status-message status-message-warning",
    icon: "status-message-icon status-message-icon-warning",
    iconPath: (
      <path
        d="M10 3.5 18 17H2l8-13.5Zm0 4.5v3.5m0 3h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  message: {
    root: "status-message status-message-message",
    icon: "status-message-icon status-message-icon-message",
    iconPath: (
      <path
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-11.5h.01M9.25 9h.75v4h.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  success: {
    root: "status-message status-message-success",
    icon: "status-message-icon status-message-icon-success",
    iconPath: (
      <path
        d="M5 10.5 8.25 13.5 15 6.75M18 10a8 8 0 11-16 0 8 8 0 0116 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
};

export default function StatusMessage({
  variant,
  title,
  children,
  className,
}: StatusMessageProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div className={joinClasses(styles.root, className)}>
      <div className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          {styles.iconPath}
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        {title ? <p className="status-message-title">{title}</p> : null}
        <div className="status-message-body">{children}</div>
      </div>
    </div>
  );
}
