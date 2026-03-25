import type { Metadata } from 'next';
import Link from 'next/link';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import { SUPPORT_NAV_ITEMS } from '@/lib/support';

export const metadata: Metadata = {
  title: 'Support | Highlander Today',
  description: 'Placeholder support hub for internal review.',
};

export default function SupportPage() {
  return (
    <div className="space-y-8">
      <InternalPageHeader title="Support" />

      <section className="grid gap-4 md:grid-cols-2">
        {SUPPORT_NAV_ITEMS.map((item) => (
          <article key={item.href} className="card card-dark">
            <p className="card-label">Placeholder</p>
            <h2 className="card-title card-title-lg">{item.label}</h2>
            <p className="card-body">{item.description}</p>
            <Link
              href={item.href}
              className="mt-6 inline-flex rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-slate-950"
            >
              Open {item.label}
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
