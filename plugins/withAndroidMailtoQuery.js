const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Declare the `mailto:` scheme in the manifest's `<queries>` block.
 *
 * Android 11+ package visibility makes `Linking.canOpenURL("mailto:…")` resolve against only the
 * schemes an app declares — and Expo's own `Scheme` mod declares `https` alone. On a stock phone
 * whose single mail app is an ordinary user app, the resolver then has nothing visible and the
 * Feedback row answers "No email app found" with a mail client installed. Not reproducible on
 * every device — /e/OS's bundled system mail app is visible without any declaration (verified
 * 2026-08-31 on a Fairphone 6) — which is exactly why this ships preventively: the failure is
 * silent, device-dependent, and lands on phones nobody here holds. `openURL` itself is not
 * visibility-gated; the declaration keeps the guard in `useBugReport` honest instead of deleted.
 *
 * `__tests__/android-manifest.test.ts` asserts the committed manifest carries the query, so a
 * prebuild cannot silently drop it.
 */
module.exports = function withAndroidMailtoQuery(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.queries = manifest.queries ?? [{}];
    const first = manifest.queries[0] ?? {};
    manifest.queries[0] = first;
    first.intent = first.intent ?? [];

    const declared = first.intent.some((intent) =>
      (intent.data ?? []).some((d) => d.$?.["android:scheme"] === "mailto"),
    );
    if (!declared) {
      first.intent.push({
        action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
        data: [{ $: { "android:scheme": "mailto" } }],
      });
    }

    return cfg;
  });
};
