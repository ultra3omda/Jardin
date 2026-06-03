/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  // SDK 54 + pnpm isolated linker: RN/Expo packages live under .pnpm/<hash>/
  // node_modules. Two disjoint patterns avoid backtracking on the outer
  // node_modules/ segment.
  transformIgnorePatterns: [
    // Top-level node_modules/<pkg> that are NOT RN/Expo packages → ignore
    'node_modules/(?!\\.pnpm)(?!(?:jest-)?react-native|@react-native|expo|@expo|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|@klasso|@ecole-saas|zustand|nativewind|react-native-css-interop)',
    // pnpm-nested node_modules/.pnpm/<hash>/node_modules/<pkg> that are NOT RN/Expo → ignore
    'node_modules/\\.pnpm/[^/]+/node_modules/(?!(?:jest-)?react-native|@react-native|expo|@expo|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|@klasso|@ecole-saas|zustand|nativewind|react-native-css-interop)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testEnvironment: 'node',
};
