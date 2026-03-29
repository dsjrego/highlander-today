import fs from 'fs';
import path from 'path';

type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  checks: string[];
};

type Options = {
  envFile: string;
  mode: 'development' | 'production';
};

function parseArgs(argv: string[]): Options {
  let envFile = '.env';
  let mode: Options['mode'] = 'production';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--env-file') {
      envFile = argv[i + 1] || envFile;
      i += 1;
      continue;
    }

    if (arg === '--mode') {
      const candidate = argv[i + 1];
      if (candidate === 'development' || candidate === 'production') {
        mode = candidate;
      }
      i += 1;
    }
  }

  return {
    envFile,
    mode,
  };
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseEnvFile(filePath: string): Record<string, string> {
  const contents = fs.readFileSync(filePath, 'utf8');
  const env: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1);
    env[key] = stripWrappingQuotes(value);
  }

  return env;
}

function readEnv(envFile: string): { values: Record<string, string>; source: string } {
  const resolvedPath = path.resolve(envFile);

  if (fs.existsSync(resolvedPath)) {
    return {
      values: parseEnvFile(resolvedPath),
      source: resolvedPath,
    };
  }

  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') {
      values[key] = value;
    }
  }

  return {
    values,
    source: 'process.env',
  };
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();

  return (
    normalized.includes('your-') ||
    normalized.includes('<set-in-.env>') ||
    normalized.includes('replace-with') ||
    normalized.includes('example.com') ||
    normalized === 'changeme123!'
  );
}

function validate(options: Options, env: Record<string, string>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: string[] = [];

  const requiredKeys = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ] as const;

  for (const key of requiredKeys) {
    const value = env[key]?.trim();

    if (!value) {
      errors.push(`Missing required variable: ${key}`);
      continue;
    }

    if (isPlaceholder(value)) {
      errors.push(`${key} still looks like a placeholder value`);
      continue;
    }

    checks.push(`${key} is present`);
  }

  const nextAuthUrl = env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl) {
    if (options.mode === 'production') {
      if (nextAuthUrl !== 'https://highlander.today') {
        errors.push(
          `NEXTAUTH_URL must be exactly https://highlander.today for production; found ${nextAuthUrl}`,
        );
      } else {
        checks.push('NEXTAUTH_URL matches the production domain');
      }
    } else if (nextAuthUrl !== 'http://localhost:3000') {
      warnings.push(
        `Development mode usually expects NEXTAUTH_URL=http://localhost:3000; found ${nextAuthUrl}`,
      );
    }
  }

  if (env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) {
    warnings.push('GOOGLE_CLIENT_ID does not match the usual Google OAuth client ID format');
  }

  if (env.NEXTAUTH_SECRET && env.NEXTAUTH_SECRET.length < 32) {
    warnings.push('NEXTAUTH_SECRET is shorter than 32 characters');
  }

  if (!env.MAXMIND_ACCOUNT_ID || !env.MAXMIND_LICENSE_KEY) {
    warnings.push('MaxMind geolocation variables are missing; login enrichment will not work');
  } else {
    checks.push('MaxMind geolocation variables are present');
  }

  const facebookKeys = ['FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'] as const;
  const missingFacebookKeys = facebookKeys.filter((key) => !env[key]?.trim());
  if (missingFacebookKeys.length === 0) {
    checks.push('Facebook OAuth variables are present');
  } else {
    warnings.push(
      'Facebook OAuth variables are missing; this is expected while Facebook login is disabled for launch',
    );
  }

  const r2Keys = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL',
  ] as const;

  const missingR2Keys = r2Keys.filter((key) => !env[key]?.trim());
  if (missingR2Keys.length > 0) {
    warnings.push(`R2 variables missing: ${missingR2Keys.join(', ')}`);
  } else {
    checks.push('R2 upload variables are present');
  }

  const emailKeys = ['BREVO_API_KEY', 'EMAIL_FROM', 'EMAIL_FROM_NAME'] as const;
  const missingEmailKeys = emailKeys.filter((key) => !env[key]?.trim());
  if (missingEmailKeys.length > 0) {
    warnings.push(
      `Outbound email variables missing: ${missingEmailKeys.join(', ')}; invitation and transactional email sending will be disabled`,
    );
  } else {
    checks.push('Outbound email variables are present');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    checks,
  };
}

function printResult(result: ValidationResult, source: string, options: Options): void {
  console.log(`Deployment env check`);
  console.log(`  Source: ${source}`);
  console.log(`  Mode: ${options.mode}`);

  for (const check of result.checks) {
    console.log(`  OK: ${check}`);
  }

  for (const warning of result.warnings) {
    console.log(`  WARN: ${warning}`);
  }

  for (const error of result.errors) {
    console.log(`  ERROR: ${error}`);
  }

  if (!result.ok) {
    process.exitCode = 1;
    return;
  }

  console.log('  Result: deployment auth/env checks passed');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const loaded = readEnv(options.envFile);
  const result = validate(options, loaded.values);

  printResult(result, loaded.source, options);
}

main();
