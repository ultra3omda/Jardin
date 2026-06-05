// Custom entry point. The polyfill import MUST come first — before
// expo-router/entry pulls in react-native-worklets / reanimated 4 (transitively
// via nativewind), whose native init reads global.SharedArrayBuffer.
import './global-polyfills';
import 'expo-router/entry';
