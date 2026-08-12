/**
 * Test data fixtures for GlyphLog E2E tests.
 *
 * ⚠️ Do NOT store real credentials here.
 * Use environment variables (process.env.TEST_EMAIL) for sensitive data.
 */
export const testUsers = {
  testAccount: {
    email: process.env.TEST_EMAIL || 'test@example.com',
    password: process.env.TEST_PASSWORD || 'test-password',
  },
};

/** Sample entry for smoke testing */
export const sampleEntry = {
  title: 'E2E Test Entry',
  type: 'anime' as const,
  status: 'watching' as const,
};
