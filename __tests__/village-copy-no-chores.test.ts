import * as fs from "node:fs";
import * as path from "node:path";

// The Village and the victory say what is DONE and WHEN a building next rises, in sessions or
// outings. A number of reps or sessions the hero still has to do is a chore, and the first
// version of the bar said "Il manque 600 XP, soit environ 4 séances" and "40 reps to level 2".
// A bar's own XP left ("plus que 600 XP") is a gauge, not a chore, so XP is not in the lists.
// Like the other copy rules: write the string correctly, never loosen the pattern.

const LOCALES = path.resolve(__dirname, "..", "locales");

const CHORES: Record<string, RegExp> = {
  en: /(reps?|sessions?|bosses|boss|routes?|rematch(es)?|leagues?) (to level|to go|left)|(more|another) (reps?|sessions?|bosses|boss|routes?|rematch(es)?)|before level|to level|for level|one rep builds|(left|remain(s|ing)?|still) to\b|still open|deeds still/i,
  fr: /il manque|encore \{\{count\}\}|avant le niveau|avant le rang|pour le niveau|une rep suffit|il reste/i,
  de: /noch \{\{count\}\} (wiederholung|einheit|boss|route|revanche|wegstunde)|fehlen|bis zu stufe|bis stufe|für stufe|wiederholung reicht|noch \{\{count\}\} (?!level)/i,
  es: /faltan \{\{count\}\}|todavía \{\{count\}\}|hasta el nivel|para el nivel|basta una|\bquedan?\b/i,
};

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

it("catches the chores it is written for, in English", () => {
  for (const line of ["3 deeds still open", "Deeds still to do", "2 sessions to go"]) {
    expect(CHORES.en?.test(line)).toBe(true);
  }
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
});

describe.each(Object.keys(CHORES))("%s copy of the Village", (lang) => {
  const village = JSON.parse(fs.readFileSync(path.join(LOCALES, `${lang}.json`), "utf8"))
    .village as Record<string, string>;

  it("never asks for a number of reps or sessions to do", () => {
    const hits = Object.entries(village).filter(([, value]) => CHORES[lang]?.test(value));
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
