module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      // NativeWind v4 — utilise un preset, pas un plugin
      'nativewind/babel',
    ],
    plugins: [
      // react-native-worklets/plugin is required by react-native-reanimated 4
      // (pulled in transitively via nativewind + react-native-css-interop). It
      // must be the LAST plugin in the list per the upstream README — otherwise
      // worklet directives are not transformed and runtime fails with
      // "Property 'SharedArrayBuffer' doesn't exist".
      'react-native-worklets/plugin',
    ],
    // Note: expo-router/babel is deprecated in SDK 50+ (now included in babel-preset-expo)
  };
};
