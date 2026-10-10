import * as fs from "node:fs";
import * as path from "node:path";
import { TIER_NAMES } from "@/db/village";
import { featureCopy, LANGS, type Lang } from "./helpers/villageCopy";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

// The heraldic and genealogical vocabulary the design refused, in the four languages, plus the
// word for a stage ("ancien" is already an avatar). A match is a whole word or the start of one
// (plurals, feminines), never the end of a longer word: "chef" must not catch "Küchenchef".
// Write the string correctly, never widen the exemptions.
const L = String.raw`(?<![\p{L}\p{N}])`;
const FORBIDDEN: Record<Lang, RegExp> = {
  fr: new RegExp(
    `${L}(gardien|totem|lign[ée]e|chef|meuble|besant|annelet|[ée]cartel[ée]|ancien|vieux|vieil)`,
    "iu",
  ),
  en: new RegExp(
    `${L}(guardian|totem|lineage|chief|furniture|bezant|annulet|quartered|elder|ancient|old(?![\\p{L}]))`,
    "iu",
  ),
  de: new RegExp(
    `${L}(w[äa]chter|totem|abstammung|chef|m[öo]bel|besant|ringlein|geviert|[äa]lteste|alt(?![\\p{L}])|alte[nmrs]?(?![\\p{L}]))`,
    "iu",
  ),
  es: new RegExp(
    `${L}(guardi[áa]n|t[óo]tem|linaje|mueble|besante|anillete|cuartelado|anciano|antiguo|jefe)`,
    "iu",
  ),
};

// "old" and "alt" are the village's age in "Your village is one year old": a fact, not a stage.
const AGE_OF_VILLAGE = /^session\.tonight_anniversary_/;
// "jefe" is Spanish for the boss of an adventure everywhere in the app (glossary.md), so it is
// the monster's word on these keys and nowhere else.
const BOSS_KEY = /boss|rematch/;

function hits(lang: Lang, key: string, value: string): boolean {
  const match = FORBIDDEN[lang].exec(value);
  if (!match) return false;
  const word = match[1]?.toLowerCase() ?? "";
  if (AGE_OF_VILLAGE.test(key) && /^(old|alt|alte[nmrs]?)$/.test(word)) return false;
  if (lang === "es" && word === "jefe" && BOSS_KEY.test(key)) return false;
  return true;
}

it("sees what it is written for", () => {
  expect(FORBIDDEN.fr.test("Le gardien du village")).toBe(true);
  expect(FORBIDDEN.fr.test("Un ancien ours")).toBe(true);
  expect(FORBIDDEN.en.test("An old bear")).toBe(true);
  expect(FORBIDDEN.en.test("An elder bear")).toBe(true);
  expect(FORBIDDEN.de.test("Ein alter Bär")).toBe(true);
  expect(FORBIDDEN.de.test("Der Wächter")).toBe(true);
  expect(FORBIDDEN.es.test("Un oso anciano")).toBe(true);
  expect(FORBIDDEN.es.test("Un oso antiguo")).toBe(true);
});

it("does not catch a longer word that ends the same way", () => {
  expect(FORBIDDEN.de.test("Küchenchef")).toBe(false);
  expect(FORBIDDEN.de.test("Er hat alternativ trainiert")).toBe(false);
  expect(FORBIDDEN.en.test("bold, cold and gold")).toBe(false);
  expect(FORBIDDEN.fr.test("un chevalier")).toBe(false);
  expect(FORBIDDEN.es.test("el jefe de la aldea")).toBe(true);
});

describe.each(LANGS)("%s copy of the Village, the crest, the feasts and tonight", (lang) => {
  const copy = featureCopy(lang);

  it("reads the whole feature", () => {
    const keys = copy.map(([k]) => k);
    for (const k of [
      "village.crest_pick_title",
      "village.crest_line_one",
      "session.feast_reveal_body",
      "session.feast_tier_next",
      "session.tonight_title",
      "session.tonight_join",
      "village.milestone_sessions_other",
      "tabs.village",
      "settings.crest_animal",
    ])
      expect(keys).toContain(k);
    expect(copy.length).toBeGreaterThan(250);
  });

  it("uses no forbidden word", () => {
    expect(copy.filter(([k, v]) => hits(lang, k, v)).map(([k, v]) => `${k}: ${v}`)).toEqual([]);
  });

  it("names the tiers without one", () => {
    const names = Object.values(TIER_NAMES).map((n) => n[lang]);
    expect(names.length).toBe(12);
    expect(names.filter((n) => hits(lang, "tier", n))).toEqual([]);
  });
});

// Copy written in a .ts file bypasses the locales. These are the files of the feature that
// build or hold a sentence; their string literals (comments stripped) get the same scan, in
// every language, except the two ambiguous short words.
describe("the feature's .ts files", () => {
  const ROOT = path.resolve(__dirname, "..");
  const FILES = [
    "components/village/crestText.ts",
    "components/village/crestLine.ts",
    "components/village/milestoneLine.ts",
    "components/village/barScale.ts",
    "components/village/rows.ts",
    "components/session/bigFeastText.ts",
    "components/session/recordText.ts",
    "components/session/feasts.ts",
    "db/village.ts",
    "db/crestRules.ts",
    "db/milestone.ts",
  ];
  const TOKEN =
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\[\s\S])*`/g;
  // Identifiers that are strings, not sentences: a key path or a code needs a space or a capital
  // to be read as copy.
  const literals = FILES.flatMap((f) =>
    [...fs.readFileSync(path.join(ROOT, f), "utf8").matchAll(TOKEN)]
      .map((m) => m[0])
      .filter((tok) => !tok.startsWith("/"))
      .map((tok) => ({ file: f, text: tok.slice(1, -1) })),
  );

  it("reads some literals", () => {
    expect(literals.length).toBeGreaterThan(50);
  });

  it("holds no forbidden word", () => {
    const bad = literals.filter(({ text }) =>
      LANGS.some((lang) => lang !== "es" && /\s|^[A-Z]/.test(text) && FORBIDDEN[lang].test(text)),
    );
    expect(bad.map((b) => `${b.file}: ${b.text}`)).toEqual([]);
  });
});
