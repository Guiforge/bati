// The chore detector of the no-chores test as it stood at 0125bfde, kept word for word. The
// count + allow-list rule that replaced it was weaker (14 real chores passed it), so both now run
// on the same copy and a string fails if EITHER catches it. Do not edit a pattern here: write the
// copy differently. A pattern removed here is caught by village-copy-guard.test.ts.

export const CHORES: Record<string, RegExp> = {
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
export function isChore(lang: string, text: string): boolean {
  return (
    CHORES[lang]?.test(text) === true ||
    (COUNT_UNIT[lang]?.test(text) === true &&
      CATEGORY[lang]?.test(text.replace(APPROX, "")) === true)
  );
}

// Keys whose count is a gauge or a fact, not a chore (none yet; each one needs its reason here).
export const EXEMPT_KEYS = new Set<string>([
  // The bar's own XP left ("nur noch 600 XP"): a gauge, and XP is no unit of effort.
  "bar_xp_left",
  "village.bar_xp_left",
]);
// An achievement's description states a one-off goal ("Complete 10 workouts"), a total over the
// hero's whole history shown on the trophy, never what is left to do today.
export const ACHIEVEMENT_GOAL = /^db\/achievements\.ts: Complete \d+ workouts$/;
