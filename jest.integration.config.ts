import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/helpers/integration-env.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs', esModuleInterop: true } }] },
  testTimeout: 30000,
  passWithNoTests: false,
};
export default config;
