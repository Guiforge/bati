import fs from "node:fs";
import path from "node:path";
import { APP_LANGUAGES } from "@/src/i18n/deviceLanguage";

/**
 * The places a language lives that are neither `locales/<language>.json` nor TypeScript.
 *
 * `tsc` points at every table in the code when a language joins `APP_LANGUAGES`, and
 * `i18n-keys.test.ts` holds its locale file. Neither can see a manifest, an XML resource or a
 * store listing, and each of those shipped a hole once: German and Spanish were missing from the
 * system language picker, the widget picker spoke English on every phone, and the iOS permission
 * prompt had two languages out of four. Every test here is driven by `APP_LANGUAGES`, so adding
 * a language turns them red until the surface has it. The steps are in
 * `docs/architecture/adding-a-language.md`.
 */
const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), "utf8");
const exists = (...parts: string[]) => fs.existsSync(path.join(ROOT, ...parts));
const sorted = (values: Iterable<string>) => [...values].sort();
const stringNames = (xml: string) =>
  sorted([...xml.matchAll(/<string name="([^"]+)"/g)].map((m) => m[1] ?? ""));

const LANGUAGES = sorted(APP_LANGUAGES);
const TRANSLATIONS = APP_LANGUAGES.filter((language) => language !== "en");

type Widget = { name: string; label: string; description: string };
type Plugin = string | [string, Record<string, unknown>?];
const expo = (
  JSON.parse(read("app.json")) as {
    expo: {
      ios: { infoPlist: { CFBundleLocalizations: string[] } };
      locales: Record<string, string>;
      plugins: Plugin[];
    };
  }
).expo;

function pluginOptions(name: string): Record<string, unknown> {
  const entry = expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === name);
  return (Array.isArray(entry) ? entry[1] : undefined) ?? {};
}

type NativeCopy = { ios: Record<string, string>; android: Record<string, string> };
const native = (language: string) =>
  JSON.parse(read("locales", "native", `${language}.json`)) as NativeCopy;

describe("app.json declares every app language", () => {
  test("to the system language pickers", () => {
    const supported = pluginOptions("expo-localization").supportedLocales as {
      ios: string[];
      android: string[];
    };
    expect(sorted(supported.android)).toEqual(LANGUAGES);
    expect(sorted(supported.ios)).toEqual(LANGUAGES);
    expect(sorted(expo.ios.infoPlist.CFBundleLocalizations)).toEqual(LANGUAGES);
  });

  test("with a file of native strings each", () => {
    expect(sorted(Object.keys(expo.locales))).toEqual(LANGUAGES);
    for (const language of APP_LANGUAGES) {
      expect(expo.locales[language]).toBe(`./locales/native/${language}.json`);
    }
  });
});

/** The permission prompts of iOS and the Android widget picker: read by the OS, not by `t()`. */
describe("locales/native", () => {
  const english = native("en");

  test.each(TRANSLATIONS)("%s.json has the strings en.json has, none empty", (language) => {
    const copy = native(language);
    expect(sorted(Object.keys(copy.ios))).toEqual(sorted(Object.keys(english.ios)));
    expect(sorted(Object.keys(copy.android))).toEqual(sorted(Object.keys(english.android)));
    const empty = Object.entries({ ...copy.ios, ...copy.android }).filter(([, v]) => !v.trim());
    expect(empty).toEqual([]);
  });

  /**
   * The library needs a label in `app.json` and the plugin replaces it with the string resource,
   * so the English is written twice. This is what keeps the two from drifting.
   */
  test("the widgets in app.json say what en.json says", () => {
    const widgets = pluginOptions("react-native-android-widget").widgets as Widget[];
    const declared = Object.fromEntries(
      widgets.flatMap((widget) => {
        const key = `widget_${widget.name.toLowerCase()}`;
        return [
          [`${key}_label`, widget.label],
          [`${key}_description`, widget.description],
        ];
      }),
    );
    expect(declared).toEqual(english.android);
  });
});

/** The committed prebuild output, which is what F-Droid builds and what CI diffs against. */
describe("the Android widget picker", () => {
  const res = (...parts: string[]) => read("android", "app", "src", "main", "res", ...parts);

  test("reads each widget's label from a string resource", () => {
    const manifest = read("android", "app", "src", "main", "AndroidManifest.xml");
    const labels = [
      ...manifest.matchAll(/<receiver android:name="\.widget\.\w+"[^>]*android:label="([^"]+)"/g),
    ].map((m) => m[1] ?? "");
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.filter((label) => !label.startsWith("@string/widget_"))).toEqual([]);
  });

  test("has no widget string the translations cannot override", () => {
    const locked = res("values", "strings.xml")
      .split("\n")
      .filter((line) => line.includes('name="widget_') && line.includes("translatable"));
    expect(locked).toEqual([]);
  });

  test.each(APP_LANGUAGES)("has every widget string in %s", (language) => {
    expect(stringNames(res(`values-b+${language}`, "strings.xml"))).toEqual(
      sorted(Object.keys(native("en").android)),
    );
  });
});

/**
 * A native module that speaks without JS alive (the outing service brought back by the OS after
 * the process died) carries its own `strings.xml`, in the device's language.
 */
describe("native modules", () => {
  const modules = fs
    .readdirSync(path.join(ROOT, "modules"))
    .filter((name) =>
      exists("modules", name, "android", "src", "main", "res", "values", "strings.xml"),
    );

  test("at least one module is read", () => {
    expect(modules.length).toBeGreaterThan(0);
  });

  test.each(modules.flatMap((name) => TRANSLATIONS.map((language) => [name, language] as const)))(
    "%s has its strings in %s",
    (name, language) => {
      const res = (folder: string) =>
        read("modules", name, "android", "src", "main", "res", folder, "strings.xml");
      expect(exists("modules", name, "android", "src", "main", "res", `values-${language}`)).toBe(
        true,
      );
      expect(stringNames(res(`values-${language}`))).toEqual(stringNames(res("values")));
    },
  );
});

/** F-Droid and Play both read `fastlane/metadata/android/<locale>/`. */
describe("the store listing", () => {
  const listings = fs.readdirSync(path.join(ROOT, "fastlane", "metadata", "android"));

  test.each(APP_LANGUAGES)("is written in %s", (language) => {
    const folder = listings.find((name) => name.split("-")[0] === language);
    expect(folder).toBeDefined();
    // Play's limits. Over one, the whole upload is refused after the binary is already sent.
    const limits = { "title.txt": 30, "short_description.txt": 80, "full_description.txt": 4000 };
    for (const [file, limit] of Object.entries(limits)) {
      const text = read("fastlane", "metadata", "android", folder ?? "", file);
      expect(text.trim()).not.toBe("");
      expect(text.length).toBeLessThanOrEqual(limit);
    }
  });

  // `fastlane/play/android` is laid over the shared listing for Play alone (release.yml, `play`
  // job), so a file there is uploaded without ever passing the test above.
  test("the Play overlay keeps Play's limits, and holds no changelog", () => {
    const overlay = path.join(ROOT, "fastlane", "play", "android");
    const limits: Record<string, number> = {
      "title.txt": 30,
      "short_description.txt": 80,
      "full_description.txt": 4000,
    };
    const files = fs.readdirSync(overlay, { recursive: true, encoding: "utf8" });
    // Release notes are shared: the app shows them after an update, on every distribution.
    expect(files.filter((file) => file.includes("changelogs"))).toEqual([]);
    for (const file of files) {
      const limit = limits[path.basename(file)];
      if (limit === undefined) continue;
      const text = fs.readFileSync(path.join(overlay, file), "utf8");
      expect(text.trim()).not.toBe("");
      expect(text.length).toBeLessThanOrEqual(limit);
    }
    // A locale Play has no base listing for would be a new language published by accident.
    const locales = fs.readdirSync(overlay).filter((name) => name !== "README.md");
    expect(listings).toEqual(expect.arrayContaining(locales));
  });
});
