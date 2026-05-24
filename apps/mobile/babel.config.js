module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      // NativeWind v4 — utilise un preset, pas un plugin
      'nativewind/babel',
    ],
    // Note: expo-router/babel is deprecated in SDK 50+ (now included in babel-preset-expo)
  };
};
