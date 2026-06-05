// Metro config pour monorepo pnpm + NativeWind v4
// Voir: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watcher monorepo — surveille packages/* depuis la racine
config.watchFolders = [workspaceRoot];

// 2. Resolver monorepo — cherche les node_modules en remontant
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Désactiver la recherche hiérarchique pour éviter les doublons React
config.resolver.disableHierarchicalLookup = true;

// 4. Activer package exports (SDK 54 + pnpm isolated linker)
config.resolver.unstable_enablePackageExports = true;

// 5. Transpiler @ecole-saas/shared (paquet workspace TS)
config.resolver.sourceExts = [...(config.resolver.sourceExts ?? []), 'mjs'];

// 6. Polyfill SharedArrayBuffer AVANT le module system.
//    react-native-worklets (tiré via nativewind -> reanimated 4) lit
//    `global.SharedArrayBuffer` dès l'init, avant l'exécution de l'entry.
//    Un `import` dans index.js s'exécute trop tard : le plugin Babel worklets
//    injecte son code d'init en tête de bundle. Les polyfills Metro, eux,
//    tournent avant le module system → garantis en premier.
const baseGetPolyfills = config.serializer.getPolyfills;
config.serializer.getPolyfills = (options) => [
  ...(baseGetPolyfills ? baseGetPolyfills(options) : []),
  path.resolve(projectRoot, 'global-polyfills.js'),
];

module.exports = withNativeWind(config, {
  input: './global.css',
});
