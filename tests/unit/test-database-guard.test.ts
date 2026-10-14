import { requireTestDatabaseUrl } from '../helpers/test-database';

describe('isolated test database guard', () => {
  it('accepts only an explicitly configured local test database', () => {
    const url = 'postgresql://test:test@127.0.0.1:55433/highlander_today_test';
    expect(requireTestDatabaseUrl(url)).toBe(url);
  });

  it.each([
    'postgresql://test:test@production.neon.tech/highlander_today_test',
    'postgresql://test:test@127.0.0.1:5433/highlander_today',
    'https://127.0.0.1/highlander_today_test',
    'not-a-url',
  ])('rejects an unsafe destination without exposing the connection', (url) => {
    expect(() => requireTestDatabaseUrl(url)).toThrow();
    try { requireTestDatabaseUrl(url); } catch (error) {
      expect(String(error)).not.toContain(url);
    }
  });

  it('does not fall back to DATABASE_URL when the dedicated test setting is missing', () => {
    const previous = process.env.HIGHLANDER_TEST_DATABASE_URL;
    delete process.env.HIGHLANDER_TEST_DATABASE_URL;
    try { expect(() => requireTestDatabaseUrl()).toThrow('Set HIGHLANDER_TEST_DATABASE_URL'); }
    finally {
      if (previous === undefined) delete process.env.HIGHLANDER_TEST_DATABASE_URL;
      else process.env.HIGHLANDER_TEST_DATABASE_URL = previous;
    }
  });
});
