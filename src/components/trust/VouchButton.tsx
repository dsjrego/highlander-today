'use client';

import React, { useState } from 'react';
import { VouchConfirmModal } from './VouchConfirmModal';

interface VouchButtonProps {
  userId: string;
  userName: string;
  isDisabled?: boolean;
  disabledReason?: string;
  onVouchSuccess?: () => void;
  onVouch: (userId: string) => Promise<void>;
}

export const VouchButton: React.FC<VouchButtonProps> = ({
  userId,
  userName,
  isDisabled = false,
  disabledReason = '',
  onVouchSuccess,
  onVouch
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onVouch(userId);
      setShowModal(false);
      onVouchSuccess?.();
    } catch (error) {
      console.error('Error vouching for user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isDisabled) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg font-medium cursor-not-allowed"
        title={disabledReason}
      >
        Cannot Vouch
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 rounded-lg font-medium transition-colors text-white"
        style={{ backgroundColor: '#46A8CC' }}
      >
        Vouch for {userName}
      </button>

      {showModal && (
        <VouchConfirmModal
          userName={userName}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
          isLoading={isLoading}
        />
      )}
    </>
  );
};
