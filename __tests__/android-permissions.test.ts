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

const ROOT = path.resolve(__dirname, "..");
const NODE_MODULES = path.join(ROOT, "node_modules");
const TRIM_PLUGIN = path.join(ROOT, "plugins", "withAndroidTrimPermissions.js");

/**
 * The plugin's own removal list, read out of its source rather than imported: `require`ing it
 * pulls in `@expo/config-plugins`, which is ESM that jest will not parse. Same text-scan trade
 * the scanignore test makes on the recipe yml — the list still has exactly one home.
 *
 * ponytail: regex over the source, fine while REMOVE is a flat array of literals. If the plugin
 * ever computes that list, export it and mock `@expo/config-plugins` instead.
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
    "expo-image-picker, capped at maxSdkVersion 32 — picking an avatar photo, and reading a " +
    "backup file the hero chose.",
  "android.permission.WRITE_EXTERNAL_STORAGE":
    "same pair, capped at maxSdkVersion 32 — writing the backup the hero asked to export.",
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

/** Every permission node_modules asks the manifest merger for, mapped to who asked. */
function declaredPermissions(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const pkgDir of packageDirs()) {
    const manifest = path.join(pkgDir, "android", "src", "main", "AndroidManifest.xml");
    if (!fs.existsSync(manifest)) continue;
    const xml = fs.readFileSync(manifest, "utf8");
    for (const [, name] of xml.matchAll(USES_PERMISSION)) {
      assert(name);
      const askers = found.get(name) ?? [];
      askers.push(path.relative(NODE_MODULES, pkgDir));
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

  test("the app still ships no way to reach the network", () => {
    // The whole "nothing leaves your phone" claim in the store description rests on this one
    // line. expo-file-system and expo-image both declare INTERNET; blockedPermissions is what
    // keeps it out of the built manifest.
    expect(blocked.has("android.permission.INTERNET")).toBe(true);
    expect(blocked.has("android.permission.ACCESS_NETWORK_STATE")).toBe(true);
  });
});
