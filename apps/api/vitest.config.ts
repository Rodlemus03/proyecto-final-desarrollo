import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    env: {
      DB_PATH: ':memory:',
      JWT_SECRET: 'test-secret-123',
      SECURITY_LOG_PATH: '',
    },
  },
});
