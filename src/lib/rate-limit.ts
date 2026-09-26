type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

declare global {
  var __highlanderRateLimitStore: Map<string, RateLimitState> | undefined;
}

const MAX_RATE_LIMIT_KEYS = 10_000;
let operationsSinceSweep = 0;

function getStore() {
  if (!global.__highlanderRateLimitStore) {
    global.__highlanderRateLimitStore = new Map<string, RateLimitState>();
  }

  return global.__highlanderRateLimitStore;
}

export function consumeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const store = getStore();
  operationsSinceSweep += 1;

  if (operationsSinceSweep >= 100 || store.size >= MAX_RATE_LIMIT_KEYS) {
    operationsSinceSweep = 0;
    for (const [storedKey, state] of store) {
      if (state.resetAt <= now) {
        store.delete(storedKey);
      }
    }

    while (store.size >= MAX_RATE_LIMIT_KEYS) {
      const oldestKey = store.keys().next().value as string | undefined;
      if (!oldestKey) break;
      store.delete(oldestKey);
    }
  }
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function clearRateLimitStore() {
  getStore().clear();
}
