import type { Metadata } from 'next';
import InternalPageHeader from '@/components/shared/InternalPageHeader';

export const metadata: Metadata = {
  title: 'How To | Highlander Today Support',
  description: 'Placeholder how-to section.',
};

export default function SupportHowToPage() {
  return (
    <div className="space-y-8">
      <InternalPageHeader title="How To" />

      <section className="card card-dark">
        <p className="card-label">Support Placeholder</p>
        <h1 className="card-title card-title-lg">Step-by-step guides will live here.</h1>
        <p className="card-body">
          This section is a placeholder for now. It will eventually explain common tasks such as
          creating posts, managing listings, using trust features, and navigating admin flows.
        </p>
      </section>
    </div>
  );
}
