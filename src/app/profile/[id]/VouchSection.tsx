"use client";

import VouchProfileButton from "./VouchProfileButton";

interface VouchSectionProps {
  userId: string;
  firstName: string;
  lastName: string;
  trustLevel: string;
  hasDateOfBirth: boolean;
}

export default function VouchSection({
  userId,
  firstName,
  lastName,
  trustLevel,
  hasDateOfBirth,
}: VouchSectionProps) {
  return (
    <div className="rounded-lg border border-blue-200 bg-[var(--article-card-badge-bg)] p-6">
      <h3 className="font-bold text-lg mb-2 text-[var(--brand-primary)]">
        Help Verify This Member
      </h3>
      <p className="text-gray-700 mb-4">
        If you know this person and vouch for their identity, you can help them
        become a trusted member. Your vouch is permanent and ties to your
        account.
      </p>

      <VouchProfileButton
        userId={userId}
        firstName={firstName}
        lastName={lastName}
        trustLevel={trustLevel}
        hasDateOfBirth={hasDateOfBirth}
        className="rounded-full bg-[var(--brand-accent)] px-6 py-2 font-semibold text-white shadow-sm transition-shadow duration-200 hover:shadow-md"
      >
        Vouch for This Member
      </VouchProfileButton>
    </div>
  );
}
