import type { Metadata } from 'next';
import InternalPageHeader from '@/components/shared/InternalPageHeader';

export const metadata: Metadata = {
  title: 'Report A Problem | Highlander Today Support',
  description: 'Placeholder report-a-problem section.',
};

export default function SupportReportAProblemPage() {
  return (
    <div className="space-y-8">
      <InternalPageHeader title="Report A Problem" />

      <section className="card card-dark">
        <p className="card-label">Support Placeholder</p>
        <h1 className="card-title card-title-lg">Issue reporting will live here.</h1>
        <p className="card-body">
          This section is a placeholder for now. It will eventually direct people to the right path
          for bugs, broken pages, account issues, moderation concerns, and operational incidents.
        </p>
      </section>
    </div>
  );
}
