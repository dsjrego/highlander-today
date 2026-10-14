import { requireTestDatabaseUrl } from './test-database';

process.env.DATABASE_URL = requireTestDatabaseUrl();
process.env.OPENAI_API_KEY = '';
process.env.ANTHROPIC_API_KEY = '';
process.env.NEXTAUTH_SECRET = 'isolated-integration-test-secret';
