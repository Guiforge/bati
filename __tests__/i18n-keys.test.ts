import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

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

describe("i18n locale parity", () => {
  test("en.json and fr.json have identical keys", () => {
    const enKeys = collectLeafKeys(en as unknown as JsonObject);
    const frKeys = collectLeafKeys(fr as unknown as JsonObject);

    const missingInFr = [...enKeys.keys()].filter((k) => !frKeys.has(k)).sort();
    const missingInEn = [...frKeys.keys()].filter((k) => !enKeys.has(k)).sort();

    expect(missingInFr).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  test("no key uses the i18next v3 plural suffix", () => {
    // `_plural` is JSON v3; this repo runs i18next v4 semantics, which wants `_one`/`_other`.
    // A `_plural` key is simply never resolved, so the singular renders for every count and the
    // English reads "2 more time". Both offenders shipped green — nothing else can see this.
    const stale = [
      ...collectLeafKeys(en as unknown as JsonObject).keys(),
      ...collectLeafKeys(fr as unknown as JsonObject).keys(),
    ]
      .filter((k) => k.endsWith("_plural"))
      .sort();

    expect(stale).toEqual([]);
  });

  test("no empty strings in translations", () => {
    const enKeys = collectLeafKeys(en as unknown as JsonObject);
    const frKeys = collectLeafKeys(fr as unknown as JsonObject);

    const emptyEn = [...enKeys.entries()]
      .filter(([, v]) => typeof v === "string" && v.trim() === "")
      .map(([k]) => k)
      .sort();

    const emptyFr = [...frKeys.entries()]
      .filter(([, v]) => typeof v === "string" && v.trim() === "")
      .map(([k]) => k)
      .sort();

    expect(emptyEn).toEqual([]);
    expect(emptyFr).toEqual([]);
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
    ["fr", 1, "quests.rounds", "1 manche"],
    ["fr", 3, "quests.rounds", "3 manches"],
    ["fr", 1, "quests.exercises", "1 exercice"],
    ["fr", 3, "quests.exercises", "3 exercices"],
  ])("%s renders %d as %s", async (language, count, key, expected) => {
    await i18n.changeLanguage(language);
    expect(i18n.t(key, { count })).toBe(expected);
  });
});
