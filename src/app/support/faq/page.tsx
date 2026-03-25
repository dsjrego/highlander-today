import type { Metadata } from 'next';
import InternalPageHeader from '@/components/shared/InternalPageHeader';

export const metadata: Metadata = {
  title: 'FAQ | Highlander Today Support',
  description: 'Placeholder FAQ section.',
};

export default function SupportFaqPage() {
  return (
    <div className="space-y-8">
      <InternalPageHeader title="FAQ" />

      <section className="card card-dark">
        <p className="card-label">Support Placeholder</p>
        <h1 className="card-title card-title-lg">Frequently asked questions will live here.</h1>
        <p className="card-body">
          This section is a placeholder for now. It will eventually collect common questions about
          accounts, trust, publishing, marketplace activity, and support workflows.
        </p>
      </section>
    </div>
  );
}
