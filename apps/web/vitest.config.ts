import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    include: [
      'lib/**/*.test.ts',
      'lib/**/*.test.tsx',
      'app/**/*.test.ts',
      'app/**/*.test.tsx',
      'components/**/*.test.ts',
      'components/**/*.test.tsx',
    ],
    // V0.7: jsdom enables React Testing Library for component tests. Node-only
    // tests (lib/*) still work under jsdom — jsdom provides window+document but
    // does not interfere with pure-logic assertions.
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['lib/**/*.ts', 'app/**/*.ts', 'app/**/*.tsx', 'components/**/*.tsx'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        'lib/**/__tests__/**',
        'components/**/__tests__/**',
      ],
      // CLAUDE.md mandates 70% min — matches apps/api/vitest.config.ts
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
