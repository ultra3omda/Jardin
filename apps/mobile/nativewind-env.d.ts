/// <reference types="nativewind/types" />

/**
 * Ambient declarations for the Klasso mobile app.
 *
 * - NativeWind v4: augments React Native JSX intrinsics so `<View className="...">`
 *   type-checks. Provided by the `nativewind/types` triple-slash reference above.
 *
 * - Expo runtime: declares the public env vars used at runtime via `process.env`
 *   without pulling in `@types/node` (which would bloat the mobile bundle types
 *   and expose Node-only globals that don't exist in React Native).
 */
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    NODE_ENV?: 'development' | 'production' | 'test';
    [key: string]: string | undefined;
  };
};
