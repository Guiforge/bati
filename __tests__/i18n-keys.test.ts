import { BOSS_ASSETS } from "@/constants/assetMap";
import { buildingCodes, equipmentCodes, movementPatterns, muscleCodes } from "@/db/schema";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import { APP_LANGUAGES } from "@/src/i18n/deviceLanguage";

const LOCALE_FILES = { en, fr, de, es };

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectLeafKeys(
  obj: JsonObject,
  prefix = "",
  out: Map<string, string> = new Map(),
): Map<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    const keyPath = prefix ? `${prefix}.${k}` : k;

    if (typeof v === "string") {
      out.set(keyPath, v);
      continue;
    }

    if (isObject(v)) {
      collectLeafKeys(v, keyPath, out);
      continue;
    }

    // Arrays are real translation content since the villager pools moved in here — each line is
    // its own leaf at `…rest.0`, `…rest.1`. Descending rather than stringifying is what makes the
    // parity test below also assert that a pool has the *same number of lines* in both languages:
    // the anti-repetition ring pairs `en[i]` with `fr[i]`, so an array that grew on one side only
    // means one index quietly says two different things.
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        const itemPath = `${keyPath}.${i}`;
        if (isObject(item)) collectLeafKeys(item, itemPath, out);
        else out.set(itemPath, String(item));
      });
      continue;
    }

    // Numbers, booleans, null: not expected. Treat as a leaf so they surface.
    out.set(keyPath, String(v));
  }

  return out;
}

/** Every array in a locale file, with its key path. */
function collectArrays(value: JsonValue, keyPath = ""): [string, JsonValue[]][] {
  if (Array.isArray(value)) {
    const nested = value.flatMap((item, i) => collectArrays(item, `${keyPath}.${i}`));
    return [[keyPath, value], ...nested];
  }
  if (!isObject(value)) return [];
  return Object.entries(value).flatMap(([k, v]) =>
    collectArrays(v, keyPath ? `${keyPath}.${k}` : k),
  );
}

describe("i18n locale parity", () => {
  test("every shipped language has a locale file, and no file ships without its language", () => {
    expect(Object.keys(LOCALE_FILES).sort()).toEqual([...APP_LANGUAGES].sort());
  });

  /**
   * `_many` is the one key a locale may have that English does not. Spanish and French ask
   * `Intl.PluralRules` for a "many" form on round millions, English never does, and i18next prints
   * the raw key when the form it asked for is missing (see the plural test below).
   */
  const withoutMany = (keys: Iterable<string>) => [...keys].filter((k) => !k.endsWith("_many"));

  test.each(APP_LANGUAGES.filter((l) => l !== "en"))(
    "%s.json has the same keys as en.json",
    (language) => {
      const enKeys = collectLeafKeys(en as unknown as JsonObject);
      const keys = collectLeafKeys(LOCALE_FILES[language] as unknown as JsonObject);

      expect(
        withoutMany(enKeys.keys())
          .filter((k) => !keys.has(k))
          .sort(),
      ).toEqual([]);
      expect(
        withoutMany(keys.keys())
          .filter((k) => !enKeys.has(k))
          .sort(),
      ).toEqual([]);
    },
  );

  /**
   * Every `{{placeholder}}` a string is given has to be in its translation. A translation that
   * drops `{{count}}` still renders, and reads "Complete workouts" where English says "Complete 10".
   */
  test.each(APP_LANGUAGES.filter((l) => l !== "en"))(
    "%s.json keeps every placeholder",
    (language) => {
      const placeholders = (text: string) =>
        [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();
      const enKeys = collectLeafKeys(en as unknown as JsonObject);
      const keys = collectLeafKeys(LOCALE_FILES[language] as unknown as JsonObject);

      const drifted = [...enKeys.entries()]
        .filter(
          ([k, v]) =>
            keys.has(k) && placeholders(v).join() !== placeholders(keys.get(k) ?? "").join(),
        )
        .map(([k]) => k);

      expect(drifted).toEqual([]);
    },
  );

  test("no key uses the i18next v3 plural suffix", () => {
    // `_plural` is JSON v3; this repo runs i18next v4 semantics, which wants `_one`/`_other`.
    // A `_plural` key is simply never resolved, so the singular renders for every count and the
    // English reads "2 more time". Both offenders shipped green — nothing else can see this.
    const stale = Object.values(LOCALE_FILES)
      .flatMap((file) => [...collectLeafKeys(file as unknown as JsonObject).keys()])
      .filter((k) => k.endsWith("_plural"))
      .sort();

    expect(stale).toEqual([]);
  });

  /**
   * A language whose plural rules have a "many" form needs a `_many` beside every `_other`.
   * Found adding Spanish: `Intl.PluralRules("es").select(1000000)` is "many", i18next looks for
   * `key_many`, and without it the screen prints the key's name. French had the same hole, never
   * reached because nothing counts to a million yet.
   */
  test.each(APP_LANGUAGES)(
    "%s.json has a many form wherever its plural rules ask for one",
    (language) => {
      const categories = new Intl.PluralRules(language).resolvedOptions().pluralCategories;
      const keys = collectLeafKeys(LOCALE_FILES[language] as unknown as JsonObject);
      const missing = categories.includes("many")
        ? [...keys.keys()]
            .filter((k) => k.endsWith("_other"))
            .map((k) => k.replace(/_other$/, "_many"))
            .filter((k) => !keys.has(k))
        : [];

      expect(missing).toEqual([]);
    },
  );

  test.each(APP_LANGUAGES)("%s.json has no empty strings", (language) => {
    const empty = [...collectLeafKeys(LOCALE_FILES[language] as unknown as JsonObject).entries()]
      .filter(([, v]) => v.trim() === "")
      .map(([k]) => k)
      .sort();

    expect(empty).toEqual([]);
  });

  /**
   * A pool is drawn from by index, so an empty one hands `undefined` to the screen. The tables in
   * the code said so with a tuple type (`[string, ...string[]]`); a JSON array cannot, and the
   * parity test above reads four empty arrays as four files that agree.
   */
  test.each(APP_LANGUAGES)("%s.json has no empty pool", (language) => {
    const empty = collectArrays(LOCALE_FILES[language] as unknown as JsonObject)
      .filter(([, pool]) => pool.length === 0)
      .map(([keyPath]) => keyPath);

    expect(empty).toEqual([]);
  });

  /**
   * The blocks the code reads by a code (`src/i18n/copy.ts`). A code with no entry is a compile
   * error there; an entry with no code is copy that someone translates four times and nobody
   * reads, and only this sees it.
   */
  test.each([
    ["muscles", en.muscles, muscleCodes],
    ["equipment", en.equipment, equipmentCodes],
    ["patterns", en.patterns, movementPatterns],
    ["village.buildings", en.village.buildings, buildingCodes],
    ["bosses", en.bosses, Object.keys(BOSS_ASSETS)],
  ] as const)("%s holds an entry for each code and no other", (_name, block, codes) => {
    expect(Object.keys(block).sort()).toEqual([...codes].sort());
  });
});

/**
 * Every key a `t("…")` call names in the source exists in English, and so, by the parity test
 * above, in every language.
 *
 * Parity compares the files with each other, so a key missing from all four passes it. When the
 * call carries a `defaultValue` the screen still reads fine in English, and every other language
 * gets the English: `session.share` was the victory screen's share label in English under French,
 * German and Spanish, read out by TalkBack, with `session.level_up`, `session.level_label` and the
 * share message itself in the same state. Only literal keys can be checked; a key built from a
 * template is `screen-keys.test.ts`'s job.
 */
describe("keys named in the source", () => {
  const { readdirSync, readFileSync } = require("node:fs") as typeof import("node:fs");
  const { join } = require("node:path") as typeof import("node:path");

  const sources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return sources(path);
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    });

  test("every literal t() key has an English string", () => {
    const enKeys = collectLeafKeys(en as unknown as JsonObject);
    const exists = (key: string) =>
      ["", "_one", "_other"].some((suffix) => enKeys.has(`${key}${suffix}`));

    const missing = ["app", "components", "constants", "db", "hooks", "src", "stores"]
      .flatMap(sources)
      .flatMap((file) =>
        [...readFileSync(file, "utf8").matchAll(/\bt\(\s*"(\w+(?:\.\w+)+)"/g)]
          .map((m) => m[1] ?? "")
          .filter((key) => !exists(key))
          .map((key) => `${file}: ${key}`),
      );

    expect(missing).toEqual([]);
  });

  /**
   * A literal key always resolves, by the test above, so a default beside it is never shown: it is
   * a second copy of the English that nobody reads and nothing keeps true. 360 of them were
   * removed on 2026-10-11, thirty already saying something else than `en.json` ("Oops!" for
   * "Something went wrong"), two written in French. A key built from a template may keep its
   * default: there it is what the screen shows when the key does not exist.
   */
  test("no literal t() key carries a default text", () => {
    const POSITIONAL = /\bt\(\s*"\w+(?:\.\w+)+",\s*["`]/g;
    const OPTION = /\bt\(\s*"\w+(?:\.\w+)+",\s*\{[^{}]*\bdefaultValue\b/g;

    const carrying = ["app", "components", "constants", "db", "hooks", "src", "stores"]
      .flatMap(sources)
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return [...source.matchAll(POSITIONAL), ...source.matchAll(OPTION)].map(
          (m) => `${file}: ${m[0].replace(/\s+/g, " ").slice(0, 60)}`,
        );
      });

    expect(carrying).toEqual([]);
  });
});

/**
 * The count-aware keys, resolved through the real i18next rather than by reading the JSON.
 *
 * "1 exercices" shipped on every expedition card in both languages: `quests.exercises` was a
 * plain `{{count}} exercices`, and no seeded quest before the expeditions had one round or one
 * exercise, so nothing ever rendered the singular. i18next only pluralises a key that has the
 * `_one` / `_other` forms, and only when `Intl.PluralRules` is there to choose between them —
 * which is exactly what this asserts, on the same runtime that ships.
 */
describe("plural forms", () => {
  const { i18n } = require("@/i18n") as typeof import("@/i18n");

  test.each([
    ["en", 1, "quests.rounds", "1 round"],
    ["en", 3, "quests.rounds", "3 rounds"],
    ["en", 1, "quests.exercises", "1 exercise"],
    ["en", 3, "quests.exercises", "3 exercises"],
    ["fr", 1, "quests.rounds", "1 tour"],
    ["fr", 3, "quests.rounds", "3 tours"],
    ["fr", 1, "quests.exercises", "1 exercice"],
    ["fr", 3, "quests.exercises", "3 exercices"],
    // The journal has its own count, and it had the same bug: a session detail of a one-round
    // outing read "1 manches" under a heading that says what the session was.
    ["en", 1, "journal.rounds_completed", "1 round"],
    ["en", 2, "journal.rounds_completed", "2 rounds"],
    ["fr", 1, "journal.rounds_completed", "1 tour"],
    ["fr", 2, "journal.rounds_completed", "2 tours"],
    ["de", 1, "quests.rounds", "1 Runde"],
    ["de", 3, "quests.rounds", "3 Runden"],
    ["es", 1, "quests.exercises", "1 ejercicio"],
    ["es", 3, "quests.exercises", "3 ejercicios"],
    // The form English never has: a round million, in Spanish.
    ["es", 1000000, "quests.exercises", "1000000 ejercicios"],
  ])("%s renders %d as %s", async (language, count, key, expected) => {
    await i18n.changeLanguage(language);
    expect(i18n.t(key, { count })).toBe(expected);
  });
});

/**
 * A duration a translation was writing the unit for, now handed to it already written.
 *
 * `quests.rest` was `Rest {{count}}s` in English and `Repos {{count}}s` in French, where German
 * and Spanish had the space their language wants and `SECONDS_SUFFIX` agrees with. So the quest
 * screen was the one place in the app writing "45s" to a French reader, and a 120 s rest read
 * "120s" where a hold of the same length reads "2:00" everywhere else. The unit belongs to
 * `formatTargetValue`, which is what these expectations are: the chip in four languages, at a
 * rest under a minute and at one over it.
 */
describe("a rest takes its unit from the formatter", () => {
  const { i18n } = require("@/i18n") as typeof import("@/i18n");
  const { formatTargetValue } = require("@/db/targets") as typeof import("@/db/targets");

  test.each([
    ["en", 45, "Rest 45s"],
    ["fr", 45, "Repos 45 s"],
    ["de", 45, "Pause 45 s"],
    ["es", 45, "Descanso 45 s"],
    ["en", 120, "Rest 2:00"],
    ["fr", 120, "Repos 2:00"],
  ] as const)("%s writes a %d s rest as %s", async (language, seconds, expected) => {
    await i18n.changeLanguage(language);
    const duration = formatTargetValue({ type: "time", value: seconds }, language);
    expect(i18n.t("quests.rest", { duration })).toBe(expected);
  });
});
