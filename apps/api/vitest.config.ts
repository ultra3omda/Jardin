import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/dto/**',
        'src/**/index.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      // V1.5 — email templates are .tsx that use the new JSX runtime
      // (matches `"jsx": "react-jsx"` in tsconfig.json). Without this,
      // SWC defaults to classic runtime and emits React.createElement
      // calls without a React import — vitest blows up with
      // "ReferenceError: React is not defined".
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: true,
          dynamicImport: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
          react: { runtime: 'automatic' },
        },
      },
    }),
  ],
});
