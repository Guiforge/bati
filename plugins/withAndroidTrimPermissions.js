const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Drop the permissions our dependencies request and the app never uses.
 *
 * A release build once asked for **33** permissions, almost none of them this app's doing: libraries
 * declare permissions in their own manifests and the merger unions them all. Twenty of those went
 * when `expo-notifications` was removed — it had been dragging in Firebase, ShortcutBadger and the
 * Play install referrer for the sake of one local reminder. The list is 11 now, and these three are
 * what still has to be said out loud.
 *
 * That list is what a user sees on the install screen, and what
 * [Exodus Privacy](https://reports.exodus-privacy.eu.org) publishes. A long list reads as an app
 * that wants things, and a camera or a microphone it never opens is exactly the shape of what
 * privacy reports flag.
 *
 * `tools:node="remove"` deletes an entry during manifest merging. The library code stays and still
 * compiles; it simply no longer holds a permission it was never asked to exercise. This is the
 * lighter half of the job — removing the dependency removes the code, but a library that stays
 * for one feature should not also carry permissions for four others.
 *
 * Every entry below is justified by what the app actually calls:
 *
 * - **CAMERA** — `app/settings.tsx` calls `launchImageLibraryAsync`, never `launchCameraAsync`.
 *   Picking an existing photo does not need a camera.
 * - **RECORD_AUDIO** — `expo-audio` is back since the session countdown beeps, but only as a
 *   player: its config plugin is called with `recordAudioAndroid: false` in `app.json`, so it no
 *   longer asks. This marker is the belt to that suspenders — audio came back once already, and
 *   it must never come back with a microphone.
 * - **MODIFY_AUDIO_SETTINGS** — the one permission `expo-audio`'s *library* manifest declares, so
 *   the plugin options cannot switch it off. It gates `AudioManager` mode and routing changes
 *   (speakerphone, earpiece). `src/sounds.ts` does call `setAudioModeAsync`, and expo-audio's
 *   Android handler writes `audioManager.mode` and `setSpeakerphoneOn` on every such call whether
 *   asked to or not — so this marker is what keeps a countdown beep from mutating device-global
 *   audio routing. Stripped, those two writes are refused and ignored; the playback the app
 *   actually wants goes through the media stream and needs nothing.
 * - **SYSTEM_ALERT_WINDOW** — drawing over other apps, from the dev-client tooling. Nothing in a
 *   release build has any business with it.
 *
 * If a feature ever needs one of these — taking an avatar photo with the camera, say — delete it
 * from the list rather than working around it. A permission removed here fails silently at
 * runtime, which is a miserable thing to debug from the symptom.
 */
const REMOVE = [
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS",
  "android.permission.SYSTEM_ALERT_WINDOW",
];

module.exports = function withAndroidTrimPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // The merger only understands tools:node once the namespace is declared on the root element.
    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] = manifest.$["xmlns:tools"] || "http://schemas.android.com/tools";

    const existing = manifest["uses-permission"] || [];
    // Keep anything already present that is not on the list, then add one removal marker each.
    // A marker for a permission no library declares is harmless, so the list needs no maintenance
    // when a dependency stops asking for something.
    manifest["uses-permission"] = [
      ...existing.filter((p) => !REMOVE.includes(p.$?.["android:name"])),
      ...REMOVE.map((name) => ({
        $: { "android:name": name, "tools:node": "remove" },
      })),
    ];

    return cfg;
  });
};
