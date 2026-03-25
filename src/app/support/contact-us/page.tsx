import type { Metadata } from 'next';
import InternalPageHeader from '@/components/shared/InternalPageHeader';

export const metadata: Metadata = {
  title: 'Contact Us | Highlander Today Support',
  description: 'Placeholder contact-us section.',
};

export default function SupportContactUsPage() {
  return (
    <div className="space-y-8">
      <InternalPageHeader title="Contact Us" />

      <section className="card card-dark">
        <p className="card-label">Support Placeholder</p>
        <h1 className="card-title card-title-lg">Contact options will live here.</h1>
        <p className="card-body">
          This section is a placeholder for now. It will eventually describe the right contact paths
          for general questions, partnership requests, support follow-up, and community outreach.
        </p>
      </section>
    </div>
  );
}
