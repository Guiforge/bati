import * as fs from "node:fs";
import * as path from "node:path";
import { featureCopy, isReadable, sourceLiterals } from "./helpers/villageCopy";

// The Village and the victory say what is DONE and WHEN a building next rises, in sessions or
// outings. A number of reps or sessions the hero still has to do is a chore, and the first
// version of the bar said "Il manque 600 XP, soit environ 4 séances" and "40 reps to level 2".
// A bar's own XP left ("plus que 600 XP") is a gauge, not a chore, so XP is not in the lists.
// Like the other copy rules: write the string correctly, never loosen the pattern.

const LOCALES = path.resolve(__dirname, "..", "locales");

const CHORES: Record<string, RegExp> = {
  en: /(reps?|sessions?|bosses|boss|routes?|rematch(es)?|leagues?) (to level|to go|left)|(more|another) (reps?|sessions?|bosses|boss|routes?|rematch(es)?)|before level|to level|for level|one rep builds|(left|remain(s|ing)?|still) to\b|to do\b|still open|deeds still/i,
  fr: /il manque|encore \{\{count\}\}|avant le niveau|avant le rang|pour le niveau|une rep suffit|il reste|à faire|il te reste|encore (\{\{\w+\}\}|\d+)/i,
  de: /noch (\{\{\w+\}\}|\d+) (wiederholung|einheit|boss|route|revanche|wegstunde)|fehlen|bis zu stufe|bis stufe|für stufe|wiederholung reicht|noch (\{\{\w+\}\}|\d+) (?!level)|noch zu|zu erledigen/i,
  es: /faltan \{\{count\}\}|todavía \{\{count\}\}|hasta el nivel|para el nivel|basta una|\bquedan?\b|por hacer|te quedan/i,
};

// The patterns above name phrasings. This one names the category: a count (a number or a
// placeholder) of a unit of effort, with a word that says it is missing or a goal to reach.
// XP is a gauge and is not a unit of effort, so "plus que 600 XP" is not in it.
const COUNT = String.raw`(?:\d+|\{\{\w+\}\}|\$\{[^}]*\})`;
const B = String.raw`(?<![\p{L}\p{N}])`;
const MOVES =
  "push-?ups?|pull-?ups?|sit-?ups?|squats?|lunges?|burpees?|planks?|crunch(?:es)?|dips|pompes?|tractions?|fentes?|gainages?|Liegestütz\\w*|Klimmzüg\\w*|Kniebeug\\w*|flexion\\w*|sentadilla\\w*|dominada\\w*|zancada\\w*|abdominal\\w*|plancha\\w*";
const UNIT: Record<string, string> = {
  en: `reps?|repetitions?|sessions?|workouts?|outings?|sets?|${MOVES}`,
  fr: `reps?|répétitions?|séances?|sorties?|séries?|entraînements?|${MOVES}`,
  de: `wdh\\.?|wiederholung\\w*|einheit\\w*|sitzung\\w*|ausflüg\\w*|touren?|sätze|workouts?|${MOVES}`,
  es: `reps?|repeticion\\w*|sesion\\w*|sesión|salidas?|series|entrenamientos?|${MOVES}`,
};
const MARKER: Record<string, string> = {
  en: "only|just|more|another|until|left|to go|remaining|still|missing|do|complete|finish",
  fr: "plus que|encore|il reste|il te reste|reste|manque|avant|jusqu['’]\\w+|pour atteindre|fais|refais",
  de: "noch|nur|bis|fehl\\w*|mehr|übrig|mach|schaff\\w*",
  es: "más|faltan?|quedan?|queda|para el|hasta|solo|sólo|haz|hazlo",
};
const CATEGORY: Record<string, RegExp> = Object.fromEntries(
  Object.keys(UNIT).map((l) => [l, new RegExp(`${B}(?:${MARKER[l]})(?![\\p{L}])`, "iu")]),
);
const COUNT_UNIT: Record<string, RegExp> = Object.fromEntries(
  Object.keys(UNIT).map((l) => [
    l,
    new RegExp(`${B}${COUNT}\\s+(?:[\\p{L}-]+\\s+){0,1}(?:${UNIT[l]})(?![\\p{L}])`, "iu"),
  ]),
);
// "más o menos" is "roughly" (the milestone's "en 1 sesión, más o menos"), not "more".
const APPROX = /más o menos/gi;
function isChore(lang: string, text: string): boolean {
  return (
    CHORES[lang]?.test(text) === true ||
    (COUNT_UNIT[lang]?.test(text) === true &&
      CATEGORY[lang]?.test(text.replace(APPROX, "")) === true)
  );
}

// Keys whose count is a gauge or a fact, not a chore (none yet; each one needs its reason here).
const EXEMPT_KEYS = new Set<string>([
  // The bar's own XP left ("nur noch 600 XP"): a gauge, and XP is no unit of effort.
  "bar_xp_left",
  "village.bar_xp_left",
]);
// An achievement's description states a one-off goal ("Complete 10 workouts"), a total over the
// hero's whole history shown on the trophy, never what is left to do today.
const ACHIEVEMENT_GOAL = /^db\/achievements\.ts: Complete \d+ workouts$/;

// The milestone is sessions or outings, so no word for a rep, in any language.
// A building has a rank; "level" is the hero's and the village's.
const LEVEL_WORD: Record<string, RegExp> = {
  en: /\blevel/i,
  fr: /\bniveau/i,
  de: /\blevel/i,
  es: /\bnivel/i,
};
const BUILDING_KEYS = [
  "reward_title",
  "next_prereq",
  "build_prereq",
  "detail_prereq_driver",
  "detail_prereq_locked",
  "kept_level",
  "building_rank",
];

const REP: Record<string, RegExp> = {
  en: /\brep/i,
  fr: /\brep/i,
  de: /wiederholung|\brep/i,
  es: /repetici|\brep/i,
};

it("catches the chores it is written for, in every language", () => {
  const LINES: Record<string, string[]> = {
    en: [
      "Only {{count}} sessions until rank 2",
      "Do 20 more push-ups tomorrow.",
      "3 deeds still open",
      "Deeds still to do",
      "2 sessions to go",
      "5 reps to do",
      "5 reps left to do",
    ],
    fr: [
      "Plus que {{count}} séances pour le rang 2",
      "Fais encore 20 pompes",
      "5 reps à faire",
      "Il te reste 5 reps",
      "Encore 5 reps",
      "encore {{n}} reps",
    ],
    de: [
      "Nur noch {{n}} Einheiten bis Rang 2",
      "Mach noch 20 Liegestütze",
      "5 Wdh. noch zu machen",
      "5 Wiederholungen zu erledigen",
    ],
    es: [
      "Solo {{count}} sesiones más para el grado 2",
      "Haz 20 flexiones más",
      "5 reps por hacer",
      "Te quedan 5 reps",
    ],
  };
  for (const [lang, lines] of Object.entries(LINES))
    for (const line of lines) expect([lang, line, isChore(lang, line)]).toEqual([lang, line, true]);
});

// A building's rank is "grado" in Spanish: "rango" already names the village's tier.
it("says grado for a building in Spanish, rango only for the village", () => {
  const es = JSON.parse(fs.readFileSync(path.join(LOCALES, "es.json"), "utf8")).village as Record<
    string,
    string
  >;
  for (const k of [...BUILDING_KEYS, ...Object.keys(es).filter((x) => x.startsWith("milestone_"))])
    expect(es[k]).not.toMatch(/rango/i);
  expect(es.building_rank).toMatch(/grado/);
  expect(es.tier_badge).toMatch(/rango/);
  const session = JSON.parse(fs.readFileSync(path.join(LOCALES, "es.json"), "utf8"))
    .session as Record<string, string>;
  expect(session.tonight_growth).toMatch(/grado/);
  expect(session.tonight_growth).not.toMatch(/rango/i);
});

describe.each(Object.keys(CHORES))("%s copy of the Village", (lang) => {
  const village = JSON.parse(fs.readFileSync(path.join(LOCALES, `${lang}.json`), "utf8"))
    .village as Record<string, string>;

  it("never asks for a number of reps or sessions to do", () => {
    const hits = Object.entries(village).filter(
      ([k, value]) => isChore(lang, value) && !EXEMPT_KEYS.has(k),
    );
    expect(hits).toEqual([]);
  });

  // The feasts and "Ce soir" say what was done tonight, so they ask for nothing either.
  it("asks for no chore anywhere in the feature, in the feasts and tonight as well", () => {
    const hits = featureCopy(lang as "fr" | "en" | "de" | "es").filter(
      ([k, value]) => isChore(lang, value) && !EXEMPT_KEYS.has(k),
    );
    expect(hits).toEqual([]);
  });

  it("keeps the milestone in sessions or outings", () => {
    const milestone = Object.keys(village).filter((k) => k.startsWith("milestone_"));
    expect(milestone.length).toBeGreaterThan(0);
    for (const k of milestone) expect(village[k]).not.toMatch(REP[lang] ?? /\brep/i);
  });

  it("says rank, never level, where it speaks of a building", () => {
    for (const k of BUILDING_KEYS) {
      expect(village[k]).toBeDefined();
      expect(village[k]?.replace(/\{\{\w+\}\}/g, "")).not.toMatch(LEVEL_WORD[lang] ?? /level/i);
    }
  });
});

// Copy written in a .ts or .tsx file is read by no locale scan: the level titles, the
// achievements, the muscle labels and everything the village's components compose are shown
// beside the village, so a chore there is the same defect. The files are the shared list.
describe("the copy written in the feature's source files", () => {
  const literals = sourceLiterals()
    .filter((l) => !l.file.endsWith(".tsx") || isReadable(l.text))
    .map((l) => `${l.file}: ${l.text}`);

  it("asks for no chore", () => {
    expect(literals.length).toBeGreaterThan(100);
    const hits = literals.filter(
      (l) => !ACHIEVEMENT_GOAL.test(l) && Object.keys(CHORES).some((lang) => isChore(lang, l)),
    );
    expect(hits).toEqual([]);
  });
});
