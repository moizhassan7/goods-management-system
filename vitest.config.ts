import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      AUTH_SECRET: 'test-secret-at-least-16-chars',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/goods?schema=public',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
