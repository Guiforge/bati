import * as fs from "node:fs";
import * as path from "node:path";
import { featureCopy, isReadable, sourceLiterals } from "./helpers/villageCopy";

// The Village and the victory say what is DONE and, at most, WHEN a building next rises. A
// number of reps, sessions or outings the hero still has to do is a chore. Phrasings of a chore
// are endless (every audit found a new one), so the rule is the other way round: a COUNT next to
// a unit of EFFORT fails wherever it is, and the only way out is ALLOWED_COUNTS below, where each
// entry names why it is no chore. XP, level, rank, leagues, km, days and weeks are no unit of effort.
// Never loosen the pattern: write the string differently.

const LOCALES = path.resolve(__dirname, "..", "locales");
const LANG_LIST = ["fr", "en", "de", "es"] as const;

// "one", "un", "ein"... are articles as much as numbers: they only count next to a rep (ART below).
const WORDS = [
  "two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty",
  "deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize dix-sept dix-huit dix-neuf vingt",
  "zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn neunzehn zwanzig",
  "dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis diecisiete dieciocho diecinueve veinte",
]
  .join(" ")
  .split(" ");
// A digit run, a {{x}} / {{x, number}} placeholder, a ${...} or a number spelled 1 to 20.
const COUNT = String.raw`(?:\d+|\{\{[^}]*\}\}|\$\{[^}]*\}|(?:${WORDS.join("|")}))`;
const B = String.raw`(?<![\p{L}\p{N}-])`;
const E = String.raw`(?![\p{L}])`;
// Reps and the like: what a milestone must never count (see "estimation").
const REPS = "reps?|wdh\\.?|repetitions?|répétitions?|wiederholung\\w*|repeticion\\w*|repetición";
const MOVES =
  "push-?ups?|pull-?ups?|sit-?ups?|squats?|lunges?|burpees?|planks?|crunch(?:es)?|dips|jumping jacks?|mountain climbers?|glute bridges?|wall sits?|deadlifts?|calf raises?|leg raises?|step-?ups?|pompes?|tractions?|fentes?|gainages?|Liegestütz\\w*|Klimmzüg\\w*|Kniebeug\\w*|flexion\\w*|sentadilla\\w*|dominada\\w*|zancada\\w*|abdominal\\w*|plancha\\w*";
const OUTINGS =
  "sessions?|workouts?|trainings?|outings?|sets?|séances?|sorties?|séries?|entraînements?|einheit\\w*|sitzung\\w*|ausflug|ausflüg\\w*|touren?|sätze|sesion\\w*|sesión|salidas?|series|entrenamientos?";
const ART = "one|une?|ein|eine|einen|una|uno";
const rx = (c: string, u: string) =>
  new RegExp(`${B}${c}\\s+(?:[\\p{L}'’-]+\\s+){0,2}(?:${u})${E}`, "iu");
const EFFORT = new RegExp(
  `${rx(COUNT, `${REPS}|${MOVES}|${OUTINGS}`).source}|${rx(`(?:${ART})`, `${REPS}|${MOVES}`).source}`,
  "iu",
);
const HAS_REPS = new RegExp(`${B}(?:${REPS}|${MOVES})${E}`, "iu");

type Why = "fait" | "estimation";
// Where the count is allowed, and why. "fait": it says what the hero HAS ALREADY done (records,
// totals, "5 de tes 8 séances", a building's history). "estimation": the spec's milestone, "rank 2
// in about 3 sessions", never a quantity of reps. A key allows every language and every plural;
// "file:literal" allows one source literal.
const ALLOWED_COUNTS: Record<string, Why> = {
  // The spec's milestone: "rank 2 in about 3 sessions or outings", never a quantity of reps.
  "village.milestone_sessions_one": "estimation",
  "village.milestone_sessions_other": "estimation",
  "village.milestone_sessions_many": "estimation",
  "village.milestone_sessions_vowel_one": "estimation",
  "village.milestone_sessions_vowel_other": "estimation",
  "village.milestone_sessions_vowel_many": "estimation",
  "village.milestone_outings_one": "estimation",
  "village.milestone_outings_other": "estimation",
  "village.milestone_outings_many": "estimation",
  "village.milestone_named_sessions_one": "estimation",
  "village.milestone_named_sessions_other": "estimation",
  "village.milestone_named_sessions_many": "estimation",
  "village.milestone_named_sessions_vowel_one": "estimation",
  "village.milestone_named_sessions_vowel_other": "estimation",
  "village.milestone_named_sessions_vowel_many": "estimation",
  "village.milestone_named_outings_one": "estimation",
  "village.milestone_named_outings_other": "estimation",
  "village.milestone_named_outings_many": "estimation",
  // What the hero HAS DONE: totals, records, "5 of your 8 sessions", the oath's metric, the
  // reps and sessions behind a building (detail sheet, bar caption) and the bar's scale ends. The
  // right end of a rep bar is the next rung's figure, kept as a scale mark and never as "N to go".
  "oath.metric_sessions": "fait",
  "oath.metric_weekly_sessions": "fait",
  "session.standing_lifetime_2": "fait",
  "session.standing_lifetime_3": "fait",
  "session.standing_recent_1": "fait",
  "session.tonight_join_body_bear": "fait",
  "session.tonight_stage_body_bear": "fait",
  "session.tonight_join_body_ermine": "fait",
  "session.tonight_stage_body_ermine": "fait",
  "session.tonight_join_body_salmon": "fait",
  "session.tonight_stage_body_salmon": "fait",
  "session.tonight_join_body_stag": "fait",
  "session.tonight_stage_body_stag": "fait",
  "session.tonight_join_body_horse": "fait",
  "session.tonight_stage_body_horse": "fait",
  "session.tonight_stage_body_any": "fait",
  "session.feast_reveal_body": "fait",
  "session.feast_reveal_boar": "fait",
  "session.feast_tier_level_one": "fait",
  "session.feast_tier_level_other": "fait",
  "session.feast_tier_level_many": "fait",
  "village.crest_why_bars": "fait",
  "village.crest_why_chosen": "fait",
  "village.crest_why_boar": "fait",
  "village.crest_pick_auto_sub": "fait",
  "village.detail_muscle_driver": "fait",
  "village.detail_style_driver": "fait",
  "village.detail_recent_units": "fait",
  "village.rep_unit": "fait",
  "village.bar_reps_done_one": "fait",
  "village.bar_reps_done_other": "fait",
  "village.bar_reps_done_many": "fait",
  "village.bar_end_reps_one": "fait",
  "village.bar_end_reps_other": "fait",
  "village.bar_end_reps_many": "fait",
};
// An achievement states a one-off goal ("Complete 10 workouts") shown on the trophy: a total over the
// hero's whole history, never what is left to do today. Counts as "fait".
const ACHIEVEMENT_GOAL = /^db\/achievements\.ts:[^\d]*\d+ \p{L}+( ab)?$/u;

const countHit = (text: string) => EFFORT.test(text);
function allowedFor(id: string): { key: string; why: Why } | undefined {
  if (ACHIEVEMENT_GOAL.test(id)) return { key: "achievements", why: "fait" };
  const why = ALLOWED_COUNTS[id];
  return why && { key: id, why };
}

it("catches a count of effort, whatever the sentence", () => {
  const LINES = [
    "120 reps to rank 2",
    "120 reps pour le rang 2",
    "120 Wiederholungen für Rang 2",
    "120 repeticiones para subir al grado 2",
    "Rank 2 needs 120 reps",
    "Il faut 3 séances pour le rang 2",
    "Only {{count, number}} sessions until rank 2",
    "trois séances de plus",
    "Do 20 more push-ups",
    "20 Liegestütze fehlen noch",
    `${"$"}{n} reps to rank 2`,
    "{{count}} flexiones",
  ];
  for (const line of LINES) expect([line, countHit(line)]).toEqual([line, true]);
  for (const ok of ["Plus que {{xp}} XP", "Rang 2", "12 km", "3 jours", "2 semaines", "niveau 4"])
    expect([ok, countHit(ok)]).toEqual([ok, false]);
});

const used = new Set<string>();
function check(id: string, text: string, verdicts: string[]) {
  if (!countHit(text)) return;
  const hit = allowedFor(id);
  if (hit) used.add(hit.key);
  else verdicts.push(`${id}: ${text}`);
  if (hit?.why === "estimation" && HAS_REPS.test(text))
    verdicts.push(`estimation with reps, ${id}: ${text}`);
}

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

describe.each(LANG_LIST)("%s copy of the feature", (lang) => {
  const village = JSON.parse(fs.readFileSync(path.join(LOCALES, `${lang}.json`), "utf8"))
    .village as Record<string, string>;

  it("states no count of effort outside the allow-list", () => {
    const verdicts: string[] = [];
    for (const [k, v] of featureCopy(lang)) check(k, v, verdicts);
    expect(verdicts).toEqual([]);
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
// beside the village, so a count there is the same defect. The files are the shared list.
describe("the copy written in the feature's source files", () => {
  const literals = sourceLiterals()
    .filter((l) => !l.file.endsWith(".tsx") || isReadable(l.text))
    .map((l) => `${l.file}:${l.text}`);

  it("states no count of effort outside the allow-list", () => {
    expect(literals.length).toBeGreaterThan(100);
    const verdicts: string[] = [];
    for (const l of literals) check(l, l, verdicts);
    expect(verdicts).toEqual([]);
  });
});

describe("the allow-list", () => {
  it("gives every entry one of the two valid reasons", () => {
    for (const [id, why] of Object.entries(ALLOWED_COUNTS))
      expect([id, ["fait", "estimation"].includes(why)]).toEqual([id, true]);
  });

  // Runs last in the file: the scans above have filled `used`.
  it("has no dead entry", () => {
    expect([...Object.keys(ALLOWED_COUNTS), "achievements"].filter((id) => !used.has(id))).toEqual(
      [],
    );
  });
});
