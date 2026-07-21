// biome-ignore lint/suspicious/noSkippedTests: the real Expo SQLite client needs a native runtime
test.skip("db/client can be imported in Jest", () => {
  // This test intentionally skipped: importing the real Expo SQLite client
  // requires a native runtime.
});
