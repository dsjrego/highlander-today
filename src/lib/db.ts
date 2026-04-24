import { Prisma, PrismaClient } from '@prisma/client';

type AppPrismaClient = PrismaClient & {
  contentMetricsDaily: Prisma.ContentMetricsDailyDelegate;
  categoryMetricsDaily: Prisma.CategoryMetricsDailyDelegate;
  homepageSlotMetricsDaily: Prisma.HomepageSlotMetricsDailyDelegate;
};

declare global {
  var prisma: AppPrismaClient | undefined;
}

function hasDelegate(client: AppPrismaClient | undefined, delegateName: keyof AppPrismaClient) {
  return Boolean(client && (client as any)[delegateName]);
}

export function hasAnalyticsRollupDelegates(client: AppPrismaClient | undefined) {
  return (
    hasDelegate(client, 'contentMetricsDaily') &&
    hasDelegate(client, 'categoryMetricsDaily') &&
    hasDelegate(client, 'homepageSlotMetricsDaily')
  );
}

// In development, Next.js preserves `global` across HMR and even restarts.
// After running `prisma generate` with new models the cached client becomes
// stale — it won't have properties like `loginEvent` or `activityLog`.
// We detect this by checking for a known new model and recreate if missing.
function createPrismaClient(): AppPrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  }) as AppPrismaClient;
}

function getClient(): AppPrismaClient {
  if (global.prisma) {
    // Quick staleness check: if the cached client is missing a model we
    // expect to exist, the generated client has been updated but the
    // singleton hasn't. Discard it and create a fresh one.
    if (
      !(global.prisma as any).loginEvent ||
      !(global.prisma as any).organization ||
      !(global.prisma as any).location ||
      !(global.prisma as any).place ||
      !(global.prisma as any).recipe ||
      !(global.prisma as any).analyticsEvent ||
      !(global.prisma as any).contentReaction ||
      !hasAnalyticsRollupDelegates(global.prisma) ||
      !(global.prisma as any).reporterRun ||
      !(global.prisma as any).reporterInterviewRequest ||
      !(global.prisma as any).reporterInterviewSession ||
      !(global.prisma as any).reporterInterviewTurn ||
      !(global.prisma as any).reporterInterviewFact ||
      !(global.prisma as any).reporterInterviewSafetyFlag
    ) {
      console.warn('[db] Stale PrismaClient detected — recreating');
      global.prisma = createPrismaClient();
    }
    return global.prisma;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== 'production') {
    global.prisma = client;
  }

  return client;
}

export const db = getClient();
export default db;
