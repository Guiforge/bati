// biome-ignore lint/suspicious/noSkippedTests: the real Expo SQLite client needs a native runtime
// biome-ignore lint/suspicious/useExpect: skipped, it stands for the test jest cannot run
it.skip("db/client can be imported in Jest", () => {
  // This test intentionally skipped: importing the real Expo SQLite client
  // requires a native runtime.
});
