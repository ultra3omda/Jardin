module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // NativeWind v4 — doit être en premier
      'nativewind/babel',
      // Expo Router typed routes
      require.resolve('expo-router/babel'),
    ],
  };
};
