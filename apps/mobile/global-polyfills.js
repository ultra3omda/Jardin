// Runtime polyfill — MUST run before the module system (wired via Metro's
// serializer.getPolyfills in metro.config.js), because several modules read
// these globals at import time, before AppRegistry.registerComponent.
//
// On Expo SDK 54 / RN 0.81 iOS (Hermes), the runtime exposes neither
// `SharedArrayBuffer` nor the ES2024 resizable/growable ArrayBuffer accessor
// descriptors. Two consumers crash without them (white screen, before the app
// registers):
//
//   1. react-native-worklets' serializer reads `global.SharedArrayBuffer`
//      during init →
//        [runtime not ready]: ReferenceError: Property 'SharedArrayBuffer' doesn't exist
//
//   2. webidl-conversions@8 (via whatwg-url-without-unicode, a dependency of
//      `expo` core) reads, at import:
//        Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,       "resizable").get
//        Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, "growable").get
//      Since `SharedArrayBuffer === ArrayBuffer` here (step 1) and Hermes lacks
//      the resizable/growable descriptors, getOwnPropertyDescriptor returns
//      `undefined` and `.get` throws →
//        [runtime not ready]: TypeError: Cannot read property 'get' of undefined
//        Invariant Violation: "main" has not been registered
//
// Fix: provide the SharedArrayBuffer constructor and stub the missing
// `resizable`/`growable` accessor getters (always false — RN's buffers are
// fixed-size). `SharedArrayBuffer === ArrayBuffer`, so a single set of
// descriptors on ArrayBuffer.prototype satisfies both reads.

if (typeof globalThis.SharedArrayBuffer === 'undefined') {
  globalThis.SharedArrayBuffer = globalThis.ArrayBuffer;
}

// Define an accessor getter only if the runtime doesn't already expose it, so
// we never clobber a real (engine-provided) descriptor.
function definePolyfillGetter(proto, name, getter) {
  if (proto && !Object.getOwnPropertyDescriptor(proto, name)) {
    Object.defineProperty(proto, name, { configurable: true, get: getter });
  }
}

definePolyfillGetter(ArrayBuffer.prototype, 'resizable', function () {
  return false;
});
definePolyfillGetter(ArrayBuffer.prototype, 'growable', function () {
  return false;
});

// webidl-conversions@8 also calls `String.prototype.toWellFormed()` (ES2024)
// when coercing USVString values (URL parsing), which Hermes lacks →
//   [runtime not ready]: TypeError: exports.DOMString(...).toWellFormed is not a function
// Polyfill it: return a copy with every lone UTF-16 surrogate replaced by the
// Unicode replacement character (U+FFFD), per the spec.
if (typeof String.prototype.toWellFormed !== 'function') {
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(String.prototype, 'toWellFormed', {
    configurable: true,
    writable: true,
    value: function toWellFormed() {
      const str = String(this);
      let result = '';
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xd800 && code <= 0xdbff) {
          // High surrogate — valid only when followed by a low surrogate.
          const next = str.charCodeAt(i + 1);
          if (next >= 0xdc00 && next <= 0xdfff) {
            result += str[i] + str[i + 1];
            i++;
          } else {
            result += '�';
          }
        } else if (code >= 0xdc00 && code <= 0xdfff) {
          // Lone low surrogate.
          result += '�';
        } else {
          result += str[i];
        }
      }
      return result;
    },
  });
}
