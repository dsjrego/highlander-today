import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import {
  BookOpenText,
  Compass,
  GitBranch,
  Layers3,
  LibraryBig,
  Map,
} from 'lucide-react';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import { authOptions } from '@/lib/auth';
import {
  ADMIN_CATEGORY_MAPPING_EXAMPLES,
  ADMIN_CONTENT_MODELS,
  ADMIN_CONTENT_REFERENCE_DOCS,
  ADMIN_CONTENT_SURFACES,
  ADMIN_PLANNED_CONTENT_AREAS,
} from '@/lib/admin-content-reference';
import { checkPermission } from '@/lib/permissions';

export default async function AdminContentArchitecturePage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'articles:approve')) {
    redirect('/');
  }

  return (
    <div className="space-y-4">
      <InternalPageHeader
        icon={<LibraryBig className="h-5 w-5" />}
        label="Admin Reference"
        title="Content Architecture"
        description="Read-only guidance for section purpose, content-model boundaries, and category decisions. Use this before changing taxonomy or future navbar structure."
        actions={
          <Link href="/admin/categories" className="page-header-action">
            Back to Categories
          </Link>
        }
      />

      <section className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <Compass className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Section Purpose</div>
          </div>
          <div className="admin-card-header-actions">Start here</div>
        </div>
        <div className="admin-card-body">
          <div className="grid gap-4 xl:grid-cols-2">
            {ADMIN_CONTENT_SURFACES.map((surface) => (
              <article key={surface.title} className="rounded-2xl border border-slate-200 bg-white/90 p-5">
                <h2 className="text-lg font-semibold text-slate-950">{surface.title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{surface.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {surface.examples.map((example) => (
                    <span
                      key={example}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
            Do not assume a top-level section implies one storage model. `Local Life` and `Community` describe user-facing purpose first, not database structure.
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <Layers3 className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Current Content Models</div>
          </div>
          <div className="admin-card-header-actions">Operational guidance</div>
        </div>
        <div className="admin-card-body">
          <div className="grid gap-4 xl:grid-cols-2">
            {ADMIN_CONTENT_MODELS.map((model) => (
              <article key={model.name} className="rounded-2xl border border-slate-200 bg-white/90 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-950">{model.name}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Live model
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{model.summary}</p>
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Likely homes</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {model.likelyHomes.map((home) => (
                      <li key={home} className="rounded-xl bg-slate-50 px-3 py-2">
                        {home}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm leading-7 text-cyan-950">
                  {model.guidance}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <Map className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Category-To-Model Mapping</div>
          </div>
          <div className="admin-card-header-actions">Examples</div>
        </div>
        <div className="admin-card-body">
          <div className="overflow-x-auto">
            <table className="admin-list-table">
              <thead className="admin-list-head">
                <tr>
                  <th className="admin-list-header-cell">Section</th>
                  <th className="admin-list-header-cell">Subsection</th>
                  <th className="admin-list-header-cell">Primary Model</th>
                  <th className="admin-list-header-cell">Guidance</th>
                </tr>
              </thead>
              <tbody>
                {ADMIN_CATEGORY_MAPPING_EXAMPLES.map((example) => (
                  <tr key={`${example.section}-${example.subsection}`} className="admin-list-row">
                    <td className="admin-list-cell">{example.section}</td>
                    <td className="admin-list-cell">{example.subsection}</td>
                    <td className="admin-list-cell font-semibold text-slate-900">{example.primaryModel}</td>
                    <td className="admin-list-cell">{example.guidance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700">
            Treat these as starting rules for category and future navbar work. A subsection can be primarily one model, exclusively one model, or later become multi-model without changing its user-facing purpose.
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <GitBranch className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Planned, Not Yet Live</div>
          </div>
          <div className="admin-card-header-actions">Do not invent around these yet</div>
        </div>
        <div className="admin-card-body">
          <div className="grid gap-4 xl:grid-cols-2">
            {ADMIN_PLANNED_CONTENT_AREAS.map((area) => (
              <article key={area.name} className="rounded-2xl border border-slate-200 bg-white/90 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-950">{area.name}</h2>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-accent)]">
                    {area.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{area.guidance}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <BookOpenText className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Related Planning Docs</div>
          </div>
          <div className="admin-card-header-actions">Repository context</div>
        </div>
        <div className="admin-card-body">
          <p className="text-sm leading-7 text-slate-600">
            These files remain the deeper planning source of truth for future architecture work. This page translates that planning into concise operational guidance for admins.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ADMIN_CONTENT_REFERENCE_DOCS.map((doc) => (
              <span
                key={doc}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
              >
                {doc}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
