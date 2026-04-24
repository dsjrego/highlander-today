'use client';

import React, { useId, useRef, useState } from 'react';
import { useDialogAccessibility } from '@/components/shared/useDialogAccessibility';

interface VouchConfirmModalProps {
  userName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const VouchConfirmModal: React.FC<VouchConfirmModalProps> = ({
  userName,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  const [isAgreed, setIsAgreed] = useState(false);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="bg-white rounded-lg shadow-lg max-w-md w-full p-6"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <h2 id={titleId} className="text-xl font-bold text-gray-900 mb-4">Confirm Vouch</h2>

        {/* Warning Section */}
        <div id={descriptionId} className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-sm text-red-800 font-semibold mb-2">Accountability Warning</p>
          <p className="text-sm text-red-700 leading-relaxed">
            You are confirming that you personally know <strong>{userName}</strong> and that they are
            who they claim to be. If this user is later found to be fake, disruptive, or engaged in
            fraudulent activity, your own account may be suspended or reviewed.
          </p>
        </div>

        {/* Important Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
          <p className="text-sm text-yellow-800">
            This action is permanent and you should only vouch for people you trust completely.
          </p>
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 mb-6">
          <input
            type="checkbox"
            checked={isAgreed}
            onChange={(e) => setIsAgreed(e.target.checked)}
            className="w-5 h-5 mt-0.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            I understand the accountability implications and confirm that I personally know {userName}
          </span>
        </label>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isAgreed || isLoading}
            className="px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {isLoading ? 'Vouching...' : 'Confirm Vouch'}
          </button>
        </div>
      </div>
    </div>
  );
};
