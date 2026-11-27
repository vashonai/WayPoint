import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Points DATABASE_URL / VALKEY_URL at the TEST_* values before anything loads env.
    setupFiles: ['./test/setup-env.ts'],
    // Rebuilds the test database from the migrations once per run.
    globalSetup: ['./test/global-setup.ts'],
    // One shared database: files must not interleave their resets.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
