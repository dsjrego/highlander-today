'use client';

import React, { useState } from 'react';

interface DOBEntryModalProps {
  userName: string;
  onSubmit: (dob: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const DOBEntryModal: React.FC<DOBEntryModalProps> = ({
  userName,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [dob, setDob] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dob && isAgreed) {
      await onSubmit(dob);
    }
  };

  // Calculate age
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = dob ? calculateAge(dob) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        {/* Header */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">Verify Date of Birth</h2>

        {/* Info */}
        <p className="text-sm text-gray-600 mb-6">
          To complete your vouching for <strong>{userName}</strong>, please enter your date of birth.
          This is permanently recorded with your vouching record.
        </p>

        {/* Warning */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-xs text-red-800 font-semibold mb-2">Important</p>
          <p className="text-xs text-red-700">
            This information will be permanently associated with your account and your vouch.
            If the user you vouched for is found to be fraudulent, you may be held accountable.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Input */}
          <div>
            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              id="dob"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {age !== null && (
              <p className="text-xs text-gray-500 mt-2">
                Age: {age} years old
              </p>
            )}
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="w-5 h-5 mt-0.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-700">
              I confirm that the above information is correct and understand that it will be
              permanently recorded with my vouching of {userName}.
            </span>
          </label>

          {/* Buttons */}
          <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!dob || !isAgreed || isLoading}
              className="px-4 py-2 text-white rounded-lg font-medium text-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {isLoading ? 'Submitting...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
