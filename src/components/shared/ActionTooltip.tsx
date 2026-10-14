'use client';

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

/** Portaled so help remains visible inside scrolling tables and sidebars. */
export function ActionTooltip({
  text,
  enabled = true,
  children,
  className,
}: {
  text: string;
  enabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    above: boolean;
  } | null>(null);

  function cancelHide() {
    clearTimeout(hideTimer.current);
  }

  function show() {
    cancelHide();
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const above = rect.top > 80;
    const halfWidth = Math.min(140, (window.innerWidth - 16) / 2);
    setPosition({
      left: Math.max(
        halfWidth + 8,
        Math.min(window.innerWidth - halfWidth - 8, rect.left + rect.width / 2),
      ),
      top: above ? rect.top - 6 : rect.bottom + 6,
      above,
    });
  }

  function scheduleHide() {
    cancelHide();
    hideTimer.current = setTimeout(() => setPosition(null), 120);
  }

  useEffect(() => () => clearTimeout(hideTimer.current), []);
  useEffect(() => {
    if (!position) return;
    const dismiss = () => setPosition(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [position]);

  if (!enabled) return <>{children}</>;

  return (
    <span
      ref={anchor}
      className={`action-tooltip-anchor ${className ?? ''}`}
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
      onFocus={show}
      onBlur={scheduleHide}
      onClick={() => setPosition(null)}
    >
      {isValidElement<{ 'aria-describedby'?: string }>(children)
        ? cloneElement(children, {
            'aria-describedby': position
              ? id
              : children.props['aria-describedby'],
          })
        : children}
      {position
        ? createPortal(
            <span
              id={id}
              role="tooltip"
              className="action-tooltip"
              style={{
                left: position.left,
                top: position.top,
                transform: `translate(-50%, ${position.above ? '-100%' : '0'})`,
              }}
              onMouseEnter={cancelHide}
              onMouseLeave={scheduleHide}
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
