'use client';

import { useId, useRef } from 'react';
import { useDialogAccessibility } from '@/components/shared/useDialogAccessibility';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  tone?: 'danger' | 'neutral';
}

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  onConfirm,
  onCancel,
  tone = 'danger',
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useDialogAccessibility({
    isOpen: true,
    onClose: onCancel,
    containerRef: dialogRef,
    initialFocusRef: cancelButtonRef,
  });

  const confirmClassName =
    tone === 'danger'
      ? 'rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60'
      : 'rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={isSubmitting ? undefined : onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="mb-3 text-xl font-bold text-gray-900">
          {title}
        </h2>
        <p id={descriptionId} className="text-sm leading-6 text-gray-600">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isSubmitting}
            className={confirmClassName}
          >
            {isSubmitting ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
