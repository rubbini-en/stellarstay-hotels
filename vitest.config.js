import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      exclude: [
        'node_modules/**',
        'src/generated/**',
        'prisma/**',
        'tests/**',
        '*.config.js',
        '*.config.mjs'
      ],
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
