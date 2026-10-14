/** Integration/browser suites must never inherit the development or production database. */
export function requireTestDatabaseUrl(value = process.env.HIGHLANDER_TEST_DATABASE_URL) {
  if (!value) throw new Error('Set HIGHLANDER_TEST_DATABASE_URL to an isolated localhost highlander_today_test database.');
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error('Invalid test database URL; credentials were not printed.'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) ||
      !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
      parsed.pathname !== '/highlander_today_test') {
    throw new Error('Tests require localhost database highlander_today_test. Development and production destinations are refused.');
  }
  return value;
}
