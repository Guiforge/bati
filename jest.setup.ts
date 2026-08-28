// Expo installs its WinterCG globals (`fetch`, `URL`, `TextDecoder`, …) as lazy getters that
// `require()` the implementation on first touch — see expo/src/winter/installGlobal.ts. jest 30
// added `throwIfBetweenTests`, which rejects any `require` that happens outside the test scope,
// and on Node 24 something reads `fetch` inside exactly that window: the suite dies with
// "You are trying to `require` a file outside of the scope of the test code" before a single
// test runs. Node 26 doesn't hit it, which is why this only ever failed in CI.
//
// Touching each global here — inside the test scope, before the suite is imported — makes the
// getter resolve now and replace itself with a plain value, so nothing requires anything later.
for (const name of [
  "fetch",
  "URL",
  "URLSearchParams",
  "TextDecoder",
  "TextDecoderStream",
  "TextEncoderStream",
  "DOMException",
  "structuredClone",
  "__ExpoImportMetaRegistry",
]) {
  (globalThis as unknown as Record<string, unknown>)[name];
}

// expo-audio reaches for the native ExpoAudio module at import time, so *any* suite that renders
// a session view dies on it — the module is three files up the import chain from RestView and
// nothing in a jest environment provides it. One mock here rather than one per test file: the
// views under test have no opinion about audio, and a per-file mock is a per-file chance to
// forget. `__tests__/sounds.test.ts` declares its own, which wins for that file.
jest.mock("expo-audio", () => ({
  createAudioPlayer: () => ({
    seekTo: () => Promise.resolve(),
    play: () => {},
  }),
  setAudioModeAsync: () => Promise.resolve(),
}));
