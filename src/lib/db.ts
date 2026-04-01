import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// In development, Next.js preserves `global` across HMR and even restarts.
// After running `prisma generate` with new models the cached client becomes
// stale — it won't have properties like `loginEvent` or `activityLog`.
// We detect this by checking for a known new model and recreate if missing.
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
}

function getClient(): PrismaClient {
  if (global.prisma) {
    // Quick staleness check: if the cached client is missing a model we
    // expect to exist, the generated client has been updated but the
    // singleton hasn't. Discard it and create a fresh one.
    if (!(global.prisma as any).loginEvent || !(global.prisma as any).organization || !(global.prisma as any).location) {
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
