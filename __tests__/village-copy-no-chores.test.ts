import * as fs from "node:fs";
import * as path from "node:path";

// The Village and the victory say what is DONE and WHEN a building next rises, in sessions or
// outings. A number of reps or sessions the hero still has to do is a chore, and the first
// version of the bar said "Il manque 600 XP, soit environ 4 séances" and "40 reps to level 2".
// A bar's own XP left ("plus que 600 XP") is a gauge, not a chore, so XP is not in the lists.
// Like the other copy rules: write the string correctly, never loosen the pattern.

const LOCALES = path.resolve(__dirname, "..", "locales");

const CHORES: Record<string, RegExp> = {
  en: /(reps?|sessions?|bosses|boss|routes?|rematch(es)?|leagues?) (to level|to go|left)|(more|another) (reps?|sessions?|bosses|boss|routes?|rematch(es)?)|before level|to level|for level|one rep builds/i,
  fr: /il manque|encore \{\{count\}\}|avant le niveau|avant le rang|pour le niveau|une rep suffit/i,
  de: /noch \{\{count\}\} (wiederholung|einheit|boss|route|revanche|wegstunde)|fehlen|bis zu stufe|bis stufe|für stufe|wiederholung reicht/i,
  es: /faltan \{\{count\}\}|todavía \{\{count\}\}|hasta el nivel|para el nivel|basta una/i,
};

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
    for (const k of milestone) expect(village[k]).not.toMatch(/\brep/i);
  });
});
