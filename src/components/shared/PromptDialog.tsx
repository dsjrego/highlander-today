'use client';

import { useId, useRef, useState } from 'react';
import { useDialogAccessibility } from '@/components/shared/useDialogAccessibility';

interface PromptDialogProps {
  title: string;
  description: string;
  label: string;
  confirmLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
  defaultValue?: string;
  isSubmitting?: boolean;
  tone?: 'danger' | 'neutral';
  onConfirm: (value: string) => Promise<void> | void;
  onCancel: () => void;
}

export default function PromptDialog({
  title,
  description,
  label,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  placeholder,
  defaultValue = '',
  isSubmitting = false,
  tone = 'danger',
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const [value, setValue] = useState(defaultValue);

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
        <div className="mt-4">
          <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-gray-700">
            {label}
          </label>
          <input
            id={inputId}
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
            onClick={() => void onConfirm(value)}
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
