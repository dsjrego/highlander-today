import { beforeEach, describe, expect, it } from '@jest/globals';
import { clearRateLimitStore, consumeRateLimit } from '@/lib/rate-limit';

describe('rate limit utility', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it('allows requests until the configured limit is reached', () => {
    expect(consumeRateLimit('test-key', 2, 1000).allowed).toBe(true);
    expect(consumeRateLimit('test-key', 2, 1000).allowed).toBe(true);
    expect(consumeRateLimit('test-key', 2, 1000).allowed).toBe(false);
  });

  it('tracks keys independently', () => {
    consumeRateLimit('alpha', 1, 1000);

    expect(consumeRateLimit('beta', 1, 1000).allowed).toBe(true);
    expect(consumeRateLimit('alpha', 1, 1000).allowed).toBe(false);
  });
});
