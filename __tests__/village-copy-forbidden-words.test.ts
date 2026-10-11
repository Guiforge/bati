import { TIER_NAMES } from "@/db/village";
import { featureCopy, isReadable, LANGS, type Lang, sourceLiterals } from "./helpers/villageCopy";

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
    `${L}(w[äa]chter|totem|abstammung|chef|m[öo]bel|besant|ringlein|geviert|h[äa]uptling|[äa]lteste|alt(?![\\p{L}])|alte[nmrs]?(?![\\p{L}]))`,
    "iu",
  ),
  es: new RegExp(
    `${L}(guardi[áa]n|t[óo]tem|linaje|mueble|besante|anillete|cuartelado|anciano|antiguo|jef[ea])`,
    "iu",
  ),
};

// "old" and "alt" are the village's age in "Your village is one year old": a fact, not a stage.
const AGE_OF_VILLAGE = /^session\.tonight_anniversary_/;
// "jefe" is Spanish for the boss of an adventure everywhere in the app (glossary.md), so it is
// the monster's word on these keys and nowhere else ("jefa" is its feminine).
const BOSS_KEY = /boss|rematch/;

// The ambience line about the road says "old" of the road, not of an animal's stage. Frozen text
// per language (Spanish needs none: "viejo" is not on its list), like the other allow-lists: an edit to the line re-opens every word on it, and
// only the word of age is exempt, so "guardian" on this key stays red.
const OLD_ROAD_KEY = "village.flavour.15";
const EN_ROAD = "The old road is quiet. It usually is, this time of year.";
const OLD_ROAD: Partial<Record<Lang, string>> = {
  fr: "La vieille route est calme. Elle l'est souvent, en cette saison.",
  en: EN_ROAD,
  de: "Die alte Straße ist ruhig. Um diese Jahreszeit ist sie das meistens.",
};
const AGE_WORD = /^(vieux|vieil|old|alt|alte[nmrs]?)$/;
const roadExemptionUsed = new Set<Lang>();

// Every match counts, not the first: an exempt "jefe" must not hide a "guardián" after it.
function hits(lang: Lang, key: string, value: string): boolean {
  const all = new RegExp(FORBIDDEN[lang].source, "giu");
  return [...value.matchAll(all)].some((match) => {
    const word = match[1]?.toLowerCase() ?? "";
    if (AGE_OF_VILLAGE.test(key) && /^(old|alt|alte[nmrs]?)$/.test(word)) return false;
    if (lang === "es" && /^jef[ea]/.test(word) && BOSS_KEY.test(key)) return false;
    if (key === OLD_ROAD_KEY && value === OLD_ROAD[lang] && AGE_WORD.test(word)) {
      roadExemptionUsed.add(lang);
      return false;
    }
    return true;
  });
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
  expect(FORBIDDEN.de.test("Der Häuptling")).toBe(true);
  expect(FORBIDDEN.es.test("La jefa")).toBe(true);
});

it("reads every match, not the first", () => {
  expect(hits("es", "village.boss_x", "Vence al jefe")).toBe(false);
  expect(hits("es", "village.boss_x", "Vence al jefe, guardián del linaje")).toBe(true);
  expect(hits("es", "village.x", "Vence a la jefa")).toBe(true);
  expect(hits("en", "session.tonight_anniversary_1", "One year old, an elder village")).toBe(true);
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

// Copy written in a .ts or .tsx file bypasses the locales. These are the files of the feature that
// build or hold a sentence; their string literals (comments stripped) get the same scan, in
// every language, with no key to excuse "jefe", "old" or "alt".
describe("the feature's .ts and .tsx files", () => {
  // Identifiers that are strings, not sentences: a key path or a code needs a space or a capital
  // to be read as copy.
  const literals = sourceLiterals();

  it("reads some literals", () => {
    expect(literals.length).toBeGreaterThan(100);
  });

  it("holds no forbidden word", () => {
    const bad = literals.filter(
      ({ text }) => isReadable(text) && LANGS.some((lang) => hits(lang, "", text)),
    );
    expect(bad.map((b) => `${b.file}: ${b.text}`)).toEqual([]);
  });
});

// Runs last in the file: the scans above have filled roadExemptionUsed.
it("has no dead road exemption", () => {
  expect(LANGS.filter((l) => OLD_ROAD[l] && !roadExemptionUsed.has(l))).toEqual([]);
});

it("keeps every other forbidden word red on the road line", () => {
  expect(hits("en", OLD_ROAD_KEY, `${EN_ROAD} A guardian.`)).toBe(true);
  expect(hits("en", OLD_ROAD_KEY, EN_ROAD)).toBe(false);
});
