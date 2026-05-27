import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { RadioTower } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { AdminPage } from '@/components/admin/AdminPage';
import ReporterMonitoredSourcesClient from './ReporterMonitoredSourcesClient';
import { REPORTER_TENANT_KEYWORDS_SETTING_KEY } from '@/lib/reporter/tenant-keywords';
import { listReporterStoryCandidates } from '@/lib/reporter/story-candidates';
import { getReporterDailyCoverageDesk } from '@/lib/reporter/daily-coverage';

export default async function AdminReporterSourcesPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'reporter:view')) {
    redirect('/');
  }

  const currentCommunity = await getCurrentCommunity({ headers: headers() });

  if (!currentCommunity) {
    redirect('/admin/reporter');
  }

  const [sources, coverageAreas, reporterRuns, tenantKeywordSetting, storyCandidates, dailyCoverageDesk] = await Promise.all([
    db.reporterMonitoredSource.findMany({
      where: {
        communityId: currentCommunity.id,
      },
      orderBy: [{ status: 'asc' }, { label: 'asc' }],
      select: {
        id: true,
        communityId: true,
        label: true,
        sourceType: true,
        sourceFormat: true,
        url: true,
        publisher: true,
        notes: true,
        status: true,
        fetchFrequencyMinutes: true,
        lastFetchedAt: true,
        lastSuccessfulAt: true,
        lastChangedAt: true,
        lastErrorAt: true,
        lastErrorMessage: true,
        lastHttpStatus: true,
        createdAt: true,
        updatedAt: true,
        place: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            type: true,
          },
        },
        _count: {
          select: {
            fetches: true,
            ingestionItems: true,
          },
        },
        fetches: {
          orderBy: [{ startedAt: 'desc' }],
          take: 3,
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            httpStatus: true,
            itemCount: true,
            newItemCount: true,
            changedItemCount: true,
            errorMessage: true,
          },
        },
        ingestionItems: {
          orderBy: [{ publishedAt: 'desc' }, { lastSeenAt: 'desc' }],
          take: 8,
          select: {
            id: true,
            title: true,
            canonicalUrl: true,
            publishedAt: true,
            firstSeenAt: true,
            lastSeenAt: true,
            publisher: true,
            excerpt: true,
          },
        },
      },
    }),
    db.tenantCoverageArea.findMany({
      where: {
        communityId: currentCommunity.id,
        isActive: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { place: { displayName: 'asc' } }],
      select: {
        place: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            type: true,
          },
        },
      },
    }),
    db.reporterRun.findMany({
      where: {
        communityId: currentCommunity.id,
        status: {
          not: 'ARCHIVED',
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        topic: true,
        title: true,
        status: true,
      },
    }),
    db.siteSetting.findUnique({
      where: {
        communityId_key: {
          communityId: currentCommunity.id,
          key: REPORTER_TENANT_KEYWORDS_SETTING_KEY,
        },
      },
      select: {
        value: true,
      },
    }),
    listReporterStoryCandidates({
      communityId: currentCommunity.id,
      limit: 12,
    }),
    getReporterDailyCoverageDesk({
      communityId: currentCommunity.id,
    }),
  ]);

  return (
    <AdminPage
      title="Reporter Sources"
      count={sources.length}
      breadcrumb={
        <Link href="/admin/reporter" className="admin-list-link">
          Reporter
        </Link>
      }
      actions={
        <Link href="/admin/reporter" className="page-header-action">
          Back to Reporter
        </Link>
      }
    >
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-3">
            <div className="admin-card-header-icon" aria-hidden="true">
              <RadioTower className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Source Monitor</div>
          </div>
        </div>
        <div className="admin-card-body space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-[-0.03em] text-slate-950">
              {currentCommunity.name} source registry
            </h1>
            <p className="text-sm text-slate-600">
              Track the recurring public-interest sources this tenant should watch for daily local reporting.
            </p>
          </div>
          <ReporterMonitoredSourcesClient
            sources={sources}
            coveragePlaces={coverageAreas.map(({ place }) => place)}
            reporterRuns={reporterRuns}
            tenantKeywordsText={tenantKeywordSetting?.value || ''}
            storyCandidates={storyCandidates}
            dailyCoverageDesk={dailyCoverageDesk}
          />
        </div>
      </div>
    </AdminPage>
  );
}
