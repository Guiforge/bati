import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import appJson from "../app.json";

// The permission list is the app's public record: it is what the install screen shows, what
// Exodus Privacy publishes, and what an F-Droid reviewer reads back to you. It is also the
// thing nobody looks at, because no dependency announces the permissions it drags in — they
// arrive through manifest merging and only surface months later in somebody else's report.
//
// `expo-audio` shipped MODIFY_AUDIO_SETTINGS, FOREGROUND_SERVICE,
// FOREGROUND_SERVICE_MEDIA_PLAYBACK and an AudioControlsService for a Sound Effects setting
// whose sound map was entirely `null` — dead code holding live permissions, found by a
// reviewer in MR fdroid/fdroiddata!45076, finding 5.
//
// This is a ratchet, not a target: a new permission fails the suite until someone writes down
// why the app needs it. Adding a line here is cheap and deliberate; noticing one you never
// added is what this exists for.
//
// Know its blind spot before you trust it. The scan below reads *npm package* manifests. A
// Gradle AAR declares permissions too, and nothing here can see those: WAKE_LOCK and
// FOREGROUND_SERVICE below ship in every APK and were justified only after someone read a built
// manifest by hand. RECEIVE_BOOT_COMPLETED is in `blockedPermissions` for the same reason and
// from the same library, which no package manifest declares either — evidence this hole had
// already been patched once, invisibly. `fdroid/expected-permissions.txt` and the release
// workflow's gate are what actually assert the shipped list; this file is the fast pre-check.

const ROOT = path.resolve(__dirname, "..");
const NODE_MODULES = path.join(ROOT, "node_modules");
const LOCAL_MODULES = path.join(ROOT, "modules");
const TRIM_PLUGIN = path.join(ROOT, "plugins", "withAndroidTrimPermissions.js");

/**
 * The plugin's own removal list, read out of its source rather than imported: `require`ing it
 * pulls in `expo/config-plugins`, which is ESM that jest will not parse. Same text-scan trade
 * the scanignore test makes on the recipe yml — the list still has exactly one home.
 *
 * ponytail: regex over the source, fine while REMOVE is a flat array of literals. If the plugin
 * ever computes that list, export it and mock `expo/config-plugins` instead.
 */
function strippedByPlugin(): Set<string> {
  const source = fs.readFileSync(TRIM_PLUGIN, "utf8");
  const [, removeList] = /const REMOVE = \[([\s\S]*?)\];/.exec(source) ?? [];
  if (!removeList) throw new Error("withAndroidTrimPermissions no longer declares a REMOVE array");
  return new Set(removeList.match(/android\.permission\.[A-Z_]+/g) ?? []);
}

/**
 * Every permission the app is content to ship, with what earns it. A dependency that declares
 * anything else must either be justified here, blocked in `app.json`, or removed by the
 * `withAndroidTrimPermissions` plugin.
 */
const ALLOWED: Record<string, string> = {
  "android.permission.VIBRATE": "expo-haptics — every button in the app buzzes.",
  "android.permission.READ_EXTERNAL_STORAGE":
    "expo-image-picker, capped at maxSdkVersion 32 — picking an avatar photo, picking a photo " +
    "for a hero-authored exercise, and reading a backup file the hero chose.",
  "android.permission.WRITE_EXTERNAL_STORAGE":
    "same pair, capped at maxSdkVersion 32 — writing the backup the hero asked to export.",
  // These two arrive from androidx.work:work-runtime, which react-native-android-widget pulls in
  // and actively uses: RNWidgetJsCommunication enqueues the widget's redraw as a WorkManager
  // worker. They reach the APK through the Gradle graph, not through any npm package manifest,
  // so the scan below has never seen them — see the note at the top of this file.
  "android.permission.WAKE_LOCK":
    "two consumers now. androidx.work via react-native-android-widget — WorkManager holds a " +
    "wake lock for the duration of the worker that redraws the home-screen widget. And " +
    "modules/bati-location, which holds a PARTIAL_WAKE_LOCK for the length of an outdoor " +
    "session: Doze during a long pause is what otherwise puts a hole in the trace.",
  "android.permission.FOREGROUND_SERVICE":
    "the same worker: RNWidgetJsCommunication calls setExpedited, and below API 31 WorkManager " +
    "runs expedited work as a foreground service. Stripping it would break widget updates on " +
    "older devices, silently. Also modules/bati-location, whose tracking service is a " +
    "foreground service so Android does not stop it when the screen goes off.",

  // modules/bati-location — Google-free GPS. These four arrive from a manifest this repo owns
  // rather than from a dependency, which is the case the scan below could not see until it
  // learned to read `modules/` too. BatiLocationService spends all four, and it is spent for
  // real: `stores/expedition.ts` calls start(), and the session screen starts an expedition
  // through `stores/session.ts`. See docs/designs/gps-without-google.md.
  "android.permission.ACCESS_FINE_LOCATION":
    "modules/bati-location — the whole feature. Precise location from LocationManager's " +
    "GPS_PROVIDER at 1 Hz; coarse location cannot measure a run. Also declared by " +
    "@maplibre/maplibre-react-native, for the show-me-on-the-map button the recap does not use: " +
    "a second asker for a permission we already wanted, which is the quiet case this file exists " +
    "to make loud. Nothing to strip — but if bati-location ever goes, this line goes with it and " +
    "MapLibre's copy has to be removed rather than inherited.",
  "android.permission.ACCESS_COARSE_LOCATION":
    "modules/bati-location — not used, but declared: from API 31 Android refuses a FINE-only " +
    "runtime request, the pair has to be asked for together, and a permission requested at " +
    "runtime must be in the manifest. The hero granting coarse only is turned away by the app. " +
    "@maplibre/maplibre-react-native declares it too, for the same unused button.",
  "android.permission.FOREGROUND_SERVICE_LOCATION":
    "modules/bati-location — the typed half of FOREGROUND_SERVICE since API 34. A service of " +
    "type `location` is also the one type Android 15 exempts from its foreground-service " +
    "duration cap, which is what lets a session outlast a long climb.",
  "android.permission.INTERNET":
    "@maplibre/maplibre-react-native, for the recap map's tiles — the app's first network " +
    "request, and the end of a line that had been true since it shipped. What kept the promise " +
    "before was this permission's absence; what keeps it now is " +
    ".biome/plugins/noJsNetwork.grit, which refuses fetch, XMLHttpRequest, WebSocket, " +
    "EventSource and sendBeacon anywhere in the app. MapLibre fetches natively, from the one " +
    "host named in the privacy policy, and no JavaScript here opens a socket at all. " +
    "expo-file-system and expo-image also declare it and still never use it.",
  "android.permission.ACCESS_NETWORK_STATE":
    "@maplibre/maplibre-react-native, and it took a device to find out. MapLibre registers a " +
    "connectivity BroadcastReceiver the moment a map view mounts and calls " +
    "ConnectivityManager.getActiveNetworkInfo() from it, unconditionally, to decide whether to " +
    "keep asking for tiles. Without the grant that call throws SecurityException on a background " +
    "thread and the process dies: the recap screen closed the app every time, on a release " +
    "build, with a green suite and a green release gate behind it. Nothing here asks what kind " +
    "of network it is on; MapLibre asks so it can stop asking. It is a normal permission, not a " +
    "dangerous one - it reports whether there is connectivity and of what type, never who or " +
    "where - and the app already holds INTERNET for the same tiles, so it widens nothing the " +
    "privacy policy has not already accounted for. ACCESS_WIFI_STATE stays blocked: that one " +
    "can name the network, and a network name is a location by another route.",
  "android.permission.POST_NOTIFICATIONS":
    "modules/bati-location — since API 33 the foreground-service notification is invisible " +
    "without it. The service still runs, but the one thing telling the hero their phone is " +
    "tracking them would be silently absent, which is the opposite of what that notification " +
    "is for.",
};

const USES_PERMISSION = /<uses-permission[^>]*android:name="([^"]+)"/g;

function packageDirs(): string[] {
  const dirs: string[] = [];
  for (const entry of fs.readdirSync(NODE_MODULES)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(NODE_MODULES, entry);
    if (entry.startsWith("@")) {
      for (const scoped of fs.readdirSync(full)) dirs.push(path.join(full, scoped));
    } else {
      dirs.push(full);
    }
  }
  return dirs;
}

/**
 * Local Expo modules under `modules/`. Their manifests are merged exactly like a dependency's,
 * and they are the one kind this file used to miss entirely: not in node_modules, not an AAR,
 * so neither the scan nor the note about AARs above covered them. A permission we write
 * ourselves deserves the same sentence as one a library drags in — more, arguably, since
 * nobody else will ever ask us to justify it.
 */
function localModuleDirs(): string[] {
  if (!fs.existsSync(LOCAL_MODULES)) return [];
  return fs
    .readdirSync(LOCAL_MODULES)
    .filter((entry) => !entry.startsWith("."))
    .map((entry) => path.join(LOCAL_MODULES, entry));
}

/** Every permission the manifest merger is asked for, mapped to who asked. */
function declaredPermissions(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const pkgDir of [...packageDirs(), ...localModuleDirs()]) {
    const manifest = path.join(pkgDir, "android", "src", "main", "AndroidManifest.xml");
    if (!fs.existsSync(manifest)) continue;
    const xml = fs.readFileSync(manifest, "utf8");
    for (const [, name] of xml.matchAll(USES_PERMISSION)) {
      assert(name);
      const askers = found.get(name) ?? [];
      askers.push(path.relative(ROOT, pkgDir));
      found.set(name, askers);
    }
  }
  return found;
}

describe("Android permissions", () => {
  const blocked = new Set<string>(appJson.expo.android.blockedPermissions);
  const removed = strippedByPlugin();

  test("no dependency slips in a permission nobody signed off on", () => {
    const declared = declaredPermissions();
    // A scan that finds nothing would pass forever; VIBRATE is expo-haptics and is not going away.
    expect(declared.has("android.permission.VIBRATE")).toBe(true);
    // And the same canary for the half of the scan that reads modules/: a local module's
    // manifest was invisible here until 2026-08-31, so prove the eye is open, not just the list.
    expect(declared.get("android.permission.ACCESS_FINE_LOCATION")).toContain(
      path.join("modules", "bati-location"),
    );

    const unaccounted = [...declared]
      .filter(([name]) => !(name in ALLOWED) && !blocked.has(name) && !removed.has(name))
      .map(([name, askers]) => `  ${name}  ← ${[...new Set(askers)].join(", ")}`);

    if (unaccounted.length > 0) {
      throw new Error(
        "New permissions arrived through a dependency. Justify each in ALLOWED, block it in " +
          "app.json, or add it to withAndroidTrimPermissions:\n" +
          unaccounted.join("\n"),
      );
    }
  });

  test("nothing is both allowed and stripped", () => {
    // Two lists disagreeing means the manifest says one thing and this file says another —
    // and the stripped permission fails silently at runtime, which is miserable to debug.
    for (const name of Object.keys(ALLOWED)) {
      expect(blocked.has(name) || removed.has(name)).toBe(false);
    }
  });

  test("expo-audio is configured for beeps, not for a media player", () => {
    // The scan above reads dependency manifests, and expo-audio's declares exactly one line
    // (MODIFY_AUDIO_SETTINGS). Everything that got it thrown out in 1.8.1 — RECORD_AUDIO,
    // FOREGROUND_SERVICE, FOREGROUND_SERVICE_MEDIA_PLAYBACK, an AudioControlsService and
    // androidx.media3 — is written by its *config plugin*, from defaults that a bare
    // `"expo-audio"` string accepts wholesale. No scan of node_modules can see that, so this is
    // the only thing standing between a tidied-up plugins array and MR fdroid/fdroiddata!45076
    // finding 5, a second time.
    const entry = (appJson.expo.plugins as unknown[]).find(
      (p): p is [string, Record<string, unknown>] => Array.isArray(p) && p[0] === "expo-audio",
    );
    expect(entry).toBeDefined();
    expect(entry?.[1]).toMatchObject({
      enableBackgroundPlayback: false,
      enableBackgroundRecording: false,
      microphonePermission: false,
      recordAudioAndroid: false,
    });
  });

  test("everything justified here is also on the list the release gate reads", () => {
    // Two lists, and only one of them describes the built APK. This file explains *why* each
    // permission is acceptable; fdroid/expected-permissions.txt is what the release workflow
    // diffs against `aapt2 dump permissions`. A permission justified here but missing there
    // would fail the release build; one listed there and not here has a gate but no reason.
    const expected = fs
      .readFileSync(path.join(ROOT, "fdroid", "expected-permissions.txt"), "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    for (const name of Object.keys(ALLOWED)) {
      expect(expected).toContain(name);
    }
    // And back the other way, which is the half that was missing: a line added to the gate's
    // list shipped a permission the install screen shows and this file never explained.
    // DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION is the one exemption, and the file says why —
    // the Android build generates it from the applicationId, no dependency asks for it.
    for (const name of expected) {
      if (name === `${appJson.expo.android.package}.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`) {
        continue;
      }
      expect(Object.keys(ALLOWED)).toContain(name);
    }
    // Sorted, so a hand-edit lands where the gate's `sort -u` will put it and the diff a failing
    // release prints reads as one added line rather than a reshuffle.
    expect(expected).toEqual([...expected].sort());
  });

  test("the network the app can reach is one host, and a lint rule is what says so", () => {
    // This test used to assert that INTERNET was blocked, and that single line was the whole
    // enforcement behind "nothing leaves your phone". The recap map needs tiles, so the line is
    // gone. What replaced it has to be asserted here, or the promise degrades into a claim the
    // moment someone writes a convenient fetch().
    expect(blocked.has("android.permission.INTERNET")).toBe(false);
    const biome = JSON.parse(fs.readFileSync(path.join(ROOT, "biome.json"), "utf8")) as {
      plugins: string[];
    };
    expect(biome.plugins).toContain("./.biome/plugins/noJsNetwork.grit");
    // The plugin has to name every way JavaScript can open a socket, not just the famous one.
    const plugin = fs.readFileSync(
      path.join(ROOT, ".biome", "plugins", "noJsNetwork.grit"),
      "utf8",
    );
    for (const api of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "sendBeacon"]) {
      expect(plugin).toContain(api);
    }
    // The map turned out to need it, so this is the decision that comment asked for, taken on
    // 2026-08-31 against a crash on a real device: MapLibre's connectivity receiver calls
    // getActiveNetworkInfo() on mount and the process dies without the grant. The justification
    // is in ALLOWED above. What must not follow it is the wifi half.
    expect(blocked.has("android.permission.ACCESS_NETWORK_STATE")).toBe(false);
    // ACCESS_WIFI_STATE joined them on 2026-08-31, from MapLibre — and not from the npm package
    // this file can read. `org.maplibre.gl:android-sdk-opengl` declares it in the AAR, which is
    // the blind spot named at the top: the scan below was green, the release gate's aapt2 diff
    // was not. If this suite ever passes while a build fails on permissions, that is where to
    // look first.
    expect(blocked.has("android.permission.ACCESS_WIFI_STATE")).toBe(true);
  });
});
