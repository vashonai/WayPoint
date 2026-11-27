import { testUrls } from './test-env';

// Runs in every test file before any module reads env, so getDb(),
// createValkey() and createAuth() all see the test stack.
const { databaseUrl, valkeyUrl } = testUrls();
process.env.DATABASE_URL = databaseUrl;
process.env.DATABASE_URL_UNPOOLED = databaseUrl;
process.env.VALKEY_URL = valkeyUrl;
process.env.AUTH_SECRET ||= 'test-secret-test-secret-test-secret-0123';
process.env.AUTH_URL ||= 'http://localhost:3000';
