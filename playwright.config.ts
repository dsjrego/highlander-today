import { defineConfig } from 'playwright/test';
import { requireTestDatabaseUrl } from './tests/helpers/test-database';

const databaseUrl = requireTestDatabaseUrl();
const baseURL = 'http://127.0.0.1:3105';
process.env.DATABASE_URL = databaseUrl;
process.env.NEXTAUTH_SECRET = 'isolated-browser-test-secret';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  use: { baseURL, browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3105',
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      DATABASE_URL: databaseUrl,
      NEXTAUTH_URL: baseURL,
      NEXTAUTH_SECRET: 'isolated-browser-test-secret',
      OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '',
      CRON_SECRET: 'isolated-browser-cron-secret',
    },
  },
});
