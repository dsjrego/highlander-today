import {
  afterAll as jestAfterAll,
  afterEach as jestAfterEach,
  beforeAll as jestBeforeAll,
  beforeEach as jestBeforeEach,
  describe as jestDescribe,
  expect as jestExpect,
  it as jestIt,
  jest as jestObject,
  test as jestTest,
} from '@jest/globals';

declare global {
  const describe: typeof jestDescribe;
  const it: typeof jestIt;
  const test: typeof jestTest;
  const expect: typeof jestExpect;
  const jest: typeof jestObject;
  const beforeEach: typeof jestBeforeEach;
  const afterEach: typeof jestAfterEach;
  const beforeAll: typeof jestBeforeAll;
  const afterAll: typeof jestAfterAll;
}

export {};
