import { defineConfig } from 'playwright/test';

const databaseUrl = process.env.HIGHLANDER_TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('Set HIGHLANDER_TEST_DATABASE_URL to the isolated test database.');
const parsed = new URL(databaseUrl);
if (!['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !['127.0.0.1', 'localhost'].includes(parsed.hostname) || parsed.pathname !== '/highlander_today_test') {
  throw new Error('Browser tests require localhost highlander_today_test.');
}
process.env.DATABASE_URL = databaseUrl;
process.env.NEXTAUTH_SECRET = 'isolated-browser-test-secret';

export default defineConfig({
  testDir: '.', testMatch: 'reporter-hero-image.spec.ts',
  outputDir: '../../test-results/hero-images',
  workers: 1, retries: 0, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:3105', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3105',
    cwd: process.cwd(), url: 'http://127.0.0.1:3105/api/health', reuseExistingServer: false, timeout: 60000,
    env: { DATABASE_URL: databaseUrl, NODE_ENV: 'production', NEXTAUTH_SECRET: 'isolated-browser-test-secret',
      NEXTAUTH_URL: 'http://127.0.0.1:3105', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '' },
  },
});
