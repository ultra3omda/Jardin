// Runtime polyfill — MUST be imported before any react-native-worklets /
// react-native-reanimated code (which is pulled in transitively via nativewind
// -> react-native-css-interop -> reanimated 4).
//
// On some Expo SDK 54 / RN 0.81 iOS runtimes, `SharedArrayBuffer` is not exposed
// on the global object. react-native-worklets' native serializer accesses
// `global.SharedArrayBuffer` during initialization, which throws at startup:
//   [runtime not ready]: ReferenceError: Property 'SharedArrayBuffer' doesn't exist
//   Invariant Violation: "main" has not been registered
// aborting the bundle before AppRegistry.registerComponent runs (black screen).
//
// Providing the constructor lets worklets initialize. ArrayBuffer is a safe
// stand-in for the serializer's existence check.
if (typeof globalThis.SharedArrayBuffer === 'undefined') {
  globalThis.SharedArrayBuffer = globalThis.ArrayBuffer;
}
