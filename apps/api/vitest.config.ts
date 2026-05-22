import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    setupFiles: [],
    // V1.5 — multiple e2e specs share the same Postgres test DB. Running
    // them in parallel races on shared tables (e.g. one file's afterAll
    // cascade-delete trips another file's mid-flight transaction).
    // Force sequential file execution. Slower (~1.5×) but correct.
    fileParallelism: false,
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
