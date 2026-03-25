import { db } from '@/lib/db';

export default async function AdminSitesPage() {
  const communities = await db.community.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      domain: true,
      createdAt: true,
      domains: {
        select: {
          id: true,
          domain: true,
          isPrimary: true,
          status: true,
        },
        orderBy: [
          { isPrimary: 'desc' },
          { domain: 'asc' },
        ],
      },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-3 text-4xl font-bold text-[#46A8CC]">Sites</h1>
        <p className="text-gray-600">
          Current tenant communities and the domains assigned to them.
        </p>
      </div>

      <div className="space-y-6">
        {communities.map((community) => (
          <section
            key={community.id}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{community.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Slug: <span className="font-medium text-slate-700">{community.slug}</span>
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Legacy domain:{' '}
                  <span className="font-medium text-slate-700">
                    {community.domain || 'Not set'}
                  </span>
                </p>
              </div>
              <div className="text-sm text-slate-500">
                Created{' '}
                {community.createdAt.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>

            {community.domains.length === 0 ? (
              <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No tenant-domain records yet for this site.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Domain</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Primary</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {community.domains.map((domain) => (
                      <tr key={domain.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{domain.domain}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {domain.isPrimary ? 'Yes' : 'No'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{domain.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
