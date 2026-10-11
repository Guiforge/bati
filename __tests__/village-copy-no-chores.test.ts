import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  ACHIEVEMENT_GOAL,
  CHORES,
  EXEMPT_KEYS,
  isChore as oldIsChore,
} from "./helpers/oldChoreDetector";
import { featureCopy, isReadable, type Lang, sourceLiterals } from "./helpers/villageCopy";

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
// "3x10" (sets by reps) is one count.
const COUNT = String.raw`(?:\d+(?:\s?[x×]\s?\d+)?|\{\{[^}]*\}\}|\$\{[^}]*\}|(?:${WORDS.join("|")}))`;
const B = String.raw`(?<![\p{L}\p{N}-])`;
const E = String.raw`(?![\p{L}])`;
// Reps and the like: what a milestone must never count (see "estimation").
const REPS =
  "reps?|wdh\\.?|repetitions?|répétitions?|wiederholung\\w*|repeticion\\w*|repetición|rép\\.?";
const MOVES =
  "push-?ups?|pull-?ups?|sit-?ups?|squats?|lunges?|burpees?|planks?|crunch(?:es)?|dips?|jumping jacks?|mountain climbers?|glute bridges?|wall sits?|deadlifts?|calf raises?|leg raises?|step-?ups?|pompes?|tractions?|fentes?|gainages?|Liegestütz\\w*|Klimmzüg\\w*|Kniebeug\\w*|flexion\\w*|sentadilla\\w*|dominada\\w*|zancada\\w*|abdominal\\w*|plancha\\w*|\\p{L}*ausfallschritt\\p{L}*|hampelm\\p{L}*|bergsteiger|kniehebelauf|[\\p{L}-]*kniebeug\\p{L}*|[\\p{L}-]*liegestütz\\p{L}*|[\\p{L}-]*klimmzug\\p{L}*|fondos|high knees|chin-?ups?|flutter kicks?|russian twists?|dead bugs?|bear crawls?|muscle-?ups?|toes to bar|dragon flags?|windshield wipers|saltos? de tijera|montées de genoux|rodillas arriba|relevés? de jambes|sauts?|[\\p{L}-]*crunch\\p{L}*|[\\p{L}-]*rudern|[\\p{L}-]*heben|seitstütz|sternsprung|scheibenwischer|bärengang|eisschnellläufer|wandsitzen|flexi[óo]n(?:es)?|escaladores|giros? rusos?|elevaci[óo]n(?:es)?|patadas|remos?|rowings?|ponts? fessiers?|puentes?|battements|essuie-glaces|limpiaparabrisas|star jumps?|skater hops?|supermans?|soulevés? de terre|pesos? muertos?|extensions? des mollets|saltos?|inverted rows?|table rows?";
const OUTINGS =
  "deeds|deed(?! driver)|bosses|boss|routes?|rematch(?:es)?|hauts? faits?|exploits?|revanches?|taten|hazañas?|rutas?|sessions?|workouts?|trainings?|outings?|sets?|séances?|sorties?|séries?|entraînements?|\\p{L}*einheit\\p{L}*|sitzung\\w*|ausflug|ausflüg\\w*|touren?|sätze|sesion\\w*|sesión|salidas?|series|entrenamientos?|exercices?|exercises?|übung\\p{L}*|ejercicios?|quêtes?|quests?|misi[óo]n(?:es)?|séries?|serien?|series?|rounds?|runden?|rondas?|tours? de piste|laps?";
// The exercise placeholder is a movement ("{{count}} × {{exercise}}"), so it is a unit of effort.
const MOVER = "\\{\\{\\s*exercise\\s*\\}\\}";
// Sessions and outings, the units a bare article ("one more session") counts beside as well.
const SESSIONS =
  "sessions?|workouts?|outings?|séances?|sorties?|\\p{L}*einheit\\p{L}*|sesion\\w*|sesión|salidas?";
const ROUNDS = "rounds?|tours? de piste|runden?|rondas?|laps?";
const ART = "one|une?|ein|eine|einen|una|uno";
const rx = (c: string, u: string) =>
  new RegExp(`${B}${c}\\s+(?:[\\p{L}'’×-]+\\s+){0,2}(?:${u})${E}`, "iu");
const UNITS = `${REPS}|${MOVES}|${OUTINGS}|${MOVER}`;
// The unit first, then up to 4 words (a full stop is not one), an optional colon, the count:
// "Séances restantes : {{count}}", "Objectif : {{exercise}} × {{count}}".
const INVERSE = new RegExp(
  `${B}(?:${UNITS})${E}\\s*(?:[\\p{L}'’×-]+(?:\\s+|(?=:))){0,4}:?\\s*${COUNT}(?![\\p{L}])`,
  "iu",
);
const COUNTED = new RegExp(`${rx(COUNT, UNITS).source}|${INVERSE.source}`, "iu");
const ARTICLED = rx(`(?:${ART})`, `${REPS}|${MOVES}|${SESSIONS}|${ROUNDS}`);
const EFFORT = new RegExp(`${COUNTED.source}|${ARTICLED.source}`, "iu");
const HAS_REPS = new RegExp(`${B}(?:${REPS}|${MOVES})${E}`, "iu");

// Why a count is allowed. Seven reasons, no other, and the five reserved ones belong to their keys:
//  - "fait": it says what the hero HAS ALREADY done (records, totals, "5 de tes 8 séances", the
//    history behind a building);
//  - "estimation": the spec's milestone, "rank 2 in about 3 sessions", never a quantity of reps;
//  - "serment": the goal the hero SET HIMSELF, "30 × Pull-ups in a row" (useOathText.ts and the
//    swear screen pass `count: target`). Shown on the home strip while the oath is held, on the
//    oath screen, and in "Ce soir" only once it is fulfilled. Only oath.metric_*;
//  - "succès": an achievement's one-off goal ("Complete 10 workouts") on its trophy, a total over
//    the hero's whole history. Only the literals of db/achievements.ts;
//  - "échelle": the figure at the end of a bar (rows.ts, barScale.ts), a scale mark, not a
//    sentence. Only village.bar_end_reps_* and village.unit_*;
//  - "règle": a rule the village states, an explanation (how a hold converts to reps, "each level
//    comes from a recorded session"). Only village.rep_unit and village.foot;
//  - "déblocage": the condition that unlocks a detail ("Built by your first {{style}} exercise"),
//    a fact about the past, not a quantity to reach. Only village.detail_unlock_*.
type Why = "fait" | "estimation" | "serment" | "succès" | "échelle" | "règle" | "déblocage";
const REASONS: readonly Why[] = [
  "fait",
  "estimation",
  "serment",
  "succès",
  "échelle",
  "règle",
  "déblocage",
];
// The keys a reserved reason is for, both ways: an entry with the reason must match, and a key
// that matches must carry the reason (so "fait" cannot be used to dodge the scoping).
const RESERVED: Partial<Record<Why, RegExp>> = {
  serment: /^oath\.metric_/,
  succès: /^db\/achievements\.ts:/,
  échelle: /^village\.(bar_end_reps_|unit_)/,
  règle: /^village\.(rep_unit|foot|feeds_style)$/,
  déblocage: /^village\.detail_unlock_/,
};
// A locale key is allowed with the EXACT text of each language it is read in (plural variants are
// keys of their own), so editing an allowed copy fails until someone re-reads it and updates the
// entry. A "file:literal" entry is its own text.
type Allowed = { why: Why } & Partial<Record<Lang, string>>;
const ALLOWED_COUNTS: Record<string, Allowed> = {
  // The spec's milestone: "rank 2 in about 3 sessions or outings", never reps.
  "village.milestone_sessions_one": {
    why: "estimation",
    fr: "Rang {{level}} dans environ {{count}} séance de {{what}}.",
    en: "Rank {{level}} in about {{count}} {{what}} session.",
    de: "Rang {{level}} in etwa {{count}} Einheit mit Schwerpunkt {{what}}.",
    es: "Grado {{level}} en {{count}} sesión de {{what}}, más o menos.",
  },
  "village.milestone_sessions_other": {
    why: "estimation",
    fr: "Rang {{level}} dans environ {{count}} séances de {{what}}.",
    en: "Rank {{level}} in about {{count}} {{what}} sessions.",
    de: "Rang {{level}} in etwa {{count}} Einheiten mit Schwerpunkt {{what}}.",
    es: "Grado {{level}} en unas {{count}} sesiones de {{what}}.",
  },
  "village.milestone_sessions_many": {
    why: "estimation",
    fr: "Rang {{level}} dans environ {{count}} séances de {{what}}.",
    es: "Grado {{level}} en unas {{count}} sesiones de {{what}}.",
  },
  "village.milestone_sessions_vowel_one": {
    why: "estimation",
    fr: "Rang {{level}} dans environ {{count}} séance d'{{what}}.",
    en: "Rank {{level}} in about {{count}} {{what}} session.",
    de: "Rang {{level}} in etwa {{count}} Einheit mit Schwerpunkt {{what}}.",
    es: "Grado {{level}} en {{count}} sesión de {{what}}, más o menos.",
  },
  "village.milestone_sessions_vowel_other": {
    why: "estimation",
    fr: "Rang {{level}} dans environ {{count}} séances d'{{what}}.",
    en: "Rank {{level}} in about {{count}} {{what}} sessions.",
    de: "Rang {{level}} in etwa {{count}} Einheiten mit Schwerpunkt {{what}}.",
    es: "Grado {{level}} en unas {{count}} sesiones de {{what}}.",
  },
  "village.milestone_sessions_vowel_many": {
    why: "estimation",
    fr: "Rang {{level}} dans environ {{count}} séances d'{{what}}.",
    es: "Grado {{level}} en unas {{count}} sesiones de {{what}}.",
  },
  "village.milestone_outings_one": {
    why: "estimation",
    fr: "Rang {{level}} dans environ {{count}} sortie.",
    en: "Rank {{level}} in about {{count}} outing.",
    es: "Grado {{level}} en {{count}} salida, más o menos.",
  },
  "village.milestone_outings_other": {
    why: "estimation",
    fr: "Rang {{level}} dans environ {{count}} sorties.",
    en: "Rank {{level}} in about {{count}} outings.",
    de: "Rang {{level}} in etwa {{count}} Touren.",
    es: "Grado {{level}} en unas {{count}} salidas.",
  },
  "village.milestone_outings_many": {
    why: "estimation",
    fr: "Rang {{level}} dans environ {{count}} sorties.",
    es: "Grado {{level}} en unas {{count}} salidas.",
  },
  "village.milestone_named_sessions_one": {
    why: "estimation",
    fr: "{{building}}, rang {{level}} dans environ {{count}} séance de {{what}}.",
    en: "{{building}}, rank {{level}} in about {{count}} {{what}} session.",
    de: "{{building}}, Rang {{level}} in etwa {{count}} Einheit mit Schwerpunkt {{what}}.",
    es: "{{building}}, grado {{level}} en {{count}} sesión de {{what}}, más o menos.",
  },
  "village.milestone_named_sessions_other": {
    why: "estimation",
    fr: "{{building}}, rang {{level}} dans environ {{count}} séances de {{what}}.",
    en: "{{building}}, rank {{level}} in about {{count}} {{what}} sessions.",
    de: "{{building}}, Rang {{level}} in etwa {{count}} Einheiten mit Schwerpunkt {{what}}.",
    es: "{{building}}, grado {{level}} en unas {{count}} sesiones de {{what}}.",
  },
  "village.milestone_named_sessions_many": {
    why: "estimation",
    fr: "{{building}}, rang {{level}} dans environ {{count}} séances de {{what}}.",
    es: "{{building}}, grado {{level}} en unas {{count}} sesiones de {{what}}.",
  },
  "village.milestone_named_sessions_vowel_one": {
    why: "estimation",
    fr: "{{building}}, rang {{level}} dans environ {{count}} séance d'{{what}}.",
    en: "{{building}}, rank {{level}} in about {{count}} {{what}} session.",
    de: "{{building}}, Rang {{level}} in etwa {{count}} Einheit mit Schwerpunkt {{what}}.",
    es: "{{building}}, grado {{level}} en {{count}} sesión de {{what}}, más o menos.",
  },
  "village.milestone_named_sessions_vowel_other": {
    why: "estimation",
    fr: "{{building}}, rang {{level}} dans environ {{count}} séances d'{{what}}.",
    en: "{{building}}, rank {{level}} in about {{count}} {{what}} sessions.",
    de: "{{building}}, Rang {{level}} in etwa {{count}} Einheiten mit Schwerpunkt {{what}}.",
    es: "{{building}}, grado {{level}} en unas {{count}} sesiones de {{what}}.",
  },
  "village.milestone_named_sessions_vowel_many": {
    why: "estimation",
    fr: "{{building}}, rang {{level}} dans environ {{count}} séances d'{{what}}.",
    es: "{{building}}, grado {{level}} en unas {{count}} sesiones de {{what}}.",
  },
  "village.milestone_named_outings_one": {
    why: "estimation",
    fr: "{{building}}, rang {{level}} dans environ {{count}} sortie.",
    en: "{{building}}, rank {{level}} in about {{count}} outing.",
    es: "{{building}}, grado {{level}} en {{count}} salida, más o menos.",
  },
  "village.milestone_named_outings_other": {
    why: "estimation",
    fr: "{{building}}, rang {{level}} dans environ {{count}} sorties.",
    en: "{{building}}, rank {{level}} in about {{count}} outings.",
    de: "{{building}}, Rang {{level}} in etwa {{count}} Touren.",
    es: "{{building}}, grado {{level}} en unas {{count}} salidas.",
  },
  "village.milestone_named_outings_many": {
    why: "estimation",
    fr: "{{building}}, rang {{level}} dans environ {{count}} sorties.",
    es: "{{building}}, grado {{level}} en unas {{count}} salidas.",
  },
  // What the hero HAS DONE: totals, records, "5 of your 8 sessions", and the
  // reps, bosses, routes and sessions behind a building (detail sheet, bar caption).
  "oath.metric_exercise_pr": {
    why: "serment",
    fr: "{{count, number}} × {{exercise}} d'affilée",
    en: "{{count, number}} × {{exercise}} in a row",
    de: "{{count, number}} × {{exercise}} am Stück",
    es: "{{count, number}} × {{exercise}} seguidas",
  },
  "oath.metric_exercise_volume": {
    why: "serment",
    fr: "{{count, number}} × {{exercise}} au total",
    en: "{{count, number}} × {{exercise}} in total",
    de: "{{count, number}} × {{exercise}} insgesamt",
    es: "{{count, number}} × {{exercise}} en total",
  },
  "oath.metric_sessions": {
    why: "serment",
    fr: "{{count, number}} séances accomplies",
    en: "{{count, number}} sessions logged",
    de: "{{count, number}} absolvierte Einheiten",
    es: "{{count, number}} sesiones completadas",
  },
  "oath.metric_weekly_sessions": {
    why: "serment",
    fr: "{{weekly, number}} séances par semaine, pendant {{count, number}} semaines",
    en: "{{weekly, number}} sessions a week, for {{count, number}} weeks",
    de: "{{weekly, number}} Einheiten pro Woche, {{count, number}} Wochen lang",
    es: "{{weekly, number}} sesiones por semana, durante {{count, number}} semanas",
  },
  "session.standing_lifetime_2": {
    why: "fait",
    fr: "2e meilleure sur {{count}} séances",
    en: "2nd best in {{count}} sessions",
    de: "Zweitbeste von {{count}} Einheiten",
    es: "2.ª mejor de {{count}} sesiones",
  },
  "session.standing_lifetime_3": {
    why: "fait",
    fr: "3e meilleure sur {{count}} séances",
    en: "3rd best in {{count}} sessions",
    de: "Drittbeste von {{count}} Einheiten",
    es: "3.ª mejor de {{count}} sesiones",
  },
  "session.standing_recent_1": {
    why: "fait",
    fr: "Ta meilleure sur {{count}} séances",
    en: "Your best in {{count}} sessions",
    de: "Deine beste von {{count}} Einheiten",
    es: "Tu mejor de {{count}} sesiones",
  },
  "session.tonight_join_body_bear": {
    why: "fait",
    fr: "{{n}} de tes {{total}} séances sont de la force : l'ours veille aussi.",
    en: "{{n}} of your {{total}} sessions are strength: the bear watches too.",
    de: "{{n}} deiner {{total}} Einheiten sind Krafttraining: Der Bär wacht mit.",
    es: "{{n}} de tus {{total}} sesiones son de fuerza: el oso también vela.",
  },
  // The legendary feast says the session that crossed 500, done tonight. Only Spanish's "número 500" reads as a count.
  "session.feast_legendary_body_bear": {
    why: "fait",
    es: "Tu sesión número {{n}} de fuerza, esta noche.",
  },
  "session.feast_legendary_body_ermine": {
    why: "fait",
    es: "Tu sesión número {{n}} de calistenia, esta noche.",
  },
  "session.feast_legendary_body_salmon": {
    why: "fait",
    es: "Tu sesión número {{n}} de yoga, esta noche.",
  },
  "session.feast_legendary_body_stag": {
    why: "fait",
    es: "Tu sesión número {{n}} de resistencia, esta noche.",
  },
  "session.feast_legendary_body_horse": {
    why: "fait",
    es: "Tu salida número {{n}} en bici, esta noche.",
  },
  "session.feast_legendary_body_any": {
    why: "fait",
    es: "Tu sesión número {{n}}, esta noche.",
  },
  "session.tonight_stage_body_bear": {
    why: "fait",
    fr: "{{n}} séances de force.",
    en: "{{n}} strength sessions.",
    de: "{{n}} Einheiten Krafttraining.",
    es: "{{n}} sesiones de fuerza.",
  },
  "session.tonight_join_body_ermine": {
    why: "fait",
    fr: "{{n}} de tes {{total}} séances sont de la callisthénie : l'hermine veille aussi.",
    en: "{{n}} of your {{total}} sessions are calisthenics: the ermine watches too.",
    de: "{{n}} deiner {{total}} Einheiten sind Calisthenics: Das Hermelin wacht mit.",
    es: "{{n}} de tus {{total}} sesiones son de calistenia: el armiño también vela.",
  },
  "session.tonight_stage_body_ermine": {
    why: "fait",
    fr: "{{n}} séances de callisthénie.",
    en: "{{n}} calisthenics sessions.",
    de: "{{n}} Einheiten Calisthenics.",
    es: "{{n}} sesiones de calistenia.",
  },
  "session.tonight_join_body_salmon": {
    why: "fait",
    fr: "{{n}} de tes {{total}} séances sont du yoga : le saumon veille aussi.",
    en: "{{n}} of your {{total}} sessions are yoga: the salmon watches too.",
    de: "{{n}} deiner {{total}} Einheiten sind Yoga: Der Lachs wacht mit.",
    es: "{{n}} de tus {{total}} sesiones son de yoga: el salmón también vela.",
  },
  "session.tonight_stage_body_salmon": {
    why: "fait",
    fr: "{{n}} séances de yoga.",
    en: "{{n}} yoga sessions.",
    de: "{{n}} Einheiten Yoga.",
    es: "{{n}} sesiones de yoga.",
  },
  "session.tonight_join_body_stag": {
    why: "fait",
    fr: "{{n}} de tes {{total}} séances sont de l'endurance : le cerf veille aussi.",
    en: "{{n}} of your {{total}} sessions are endurance: the stag watches too.",
    de: "{{n}} deiner {{total}} Einheiten sind Ausdauertraining: Der Hirsch wacht mit.",
    es: "{{n}} de tus {{total}} sesiones son de resistencia: el ciervo también vela.",
  },
  "session.tonight_stage_body_stag": {
    why: "fait",
    fr: "{{n}} séances d'endurance.",
    en: "{{n}} endurance sessions.",
    de: "{{n}} Einheiten Ausdauertraining.",
    es: "{{n}} sesiones de resistencia.",
  },
  "session.tonight_join_body_horse": {
    why: "fait",
    fr: "{{n}} de tes {{total}} séances sont des sorties à vélo : le cheval veille aussi.",
    en: "{{n}} of your {{total}} sessions are bike rides: the horse watches too.",
    de: "{{n}} deiner {{total}} Einheiten sind Radtouren: Das Pferd wacht mit.",
    es: "{{n}} de tus {{total}} sesiones son salidas en bici: el caballo también vela.",
  },
  "session.tonight_stage_body_horse": {
    why: "fait",
    fr: "{{n}} sorties à vélo.",
    es: "{{n}} salidas en bici.",
  },
  "session.tonight_stage_body_any": {
    why: "fait",
    fr: "{{n}} séances.",
    en: "{{n}} sessions.",
    de: "{{n}} Einheiten.",
    es: "{{n}} sesiones.",
  },
  "session.feast_reveal_body": {
    why: "fait",
    fr: "{{n}} de tes 8 séances étaient {{part}}.",
    en: "{{n}} of your 8 sessions were {{part}}.",
    de: "{{n}} deiner 8 Einheiten waren {{part}}.",
    es: "{{n}} de tus 8 sesiones fueron {{part}}.",
  },
  "session.feast_reveal_boar": {
    why: "fait",
    fr: "Tes 8 séances se partagent : {{list}}.",
    en: "Your 8 sessions split: {{list}}.",
    de: "Deine 8 Einheiten verteilen sich: {{list}}.",
    es: "Tus 8 sesiones se reparten: {{list}}.",
  },
  "session.feast_tier_level_one": {
    why: "fait",
    fr: "Niveau {{level}}, après {{count}} séance.",
    en: "Level {{level}}, after {{count}} session.",
    de: "Level {{level}}, nach {{count}} Einheit.",
    es: "Nivel {{level}}, tras {{count}} sesión.",
  },
  "session.feast_tier_level_other": {
    why: "fait",
    fr: "Niveau {{level}}, après {{count}} séances.",
    en: "Level {{level}}, after {{count}} sessions.",
    de: "Level {{level}}, nach {{count}} Einheiten.",
    es: "Nivel {{level}}, tras {{count}} sesiones.",
  },
  "session.feast_tier_level_many": {
    why: "fait",
    fr: "Niveau {{level}}, après {{count}} séances.",
    es: "Nivel {{level}}, tras {{count}} sesiones.",
  },
  "common.daily_xp_bonus": {
    why: "fait",
    fr: "dont +{{count}} pour la quête du jour",
    de: "davon +{{count}} für die Quest des Tages",
    es: "incluye +{{count}} por la misión del día",
  },
  "session.pr_most_xp": {
    why: "fait",
    fr: "Le plus d'XP en une séance",
    en: "Most XP in one session",
    es: "Más XP en una sesión",
  },
  "village.detail_unlock_style": {
    why: "déblocage",
    fr: "Se bâtit à ton premier exercice de {{style}}",
    en: "Built by your first {{style}} exercise",
    es: "Se construye con tu primer ejercicio de {{style}}",
  },
  // How a building rises: an explanation, the placeholder is a style name, no quantity.
  "village.feeds_style": {
    why: "règle",
    fr: "Monte avec tes reps de {{what}}",
    en: "Rises with every rep of {{what}}",
    es: "Sube con cada repetición de {{what}}",
  },
  // A fact about the outing just ended; {{duration}} is how long it lasted.
  "session.summary_too_short_body_outing": {
    why: "fait",
    fr: "Ta sortie a duré {{duration}}. Garde-la et elle compte pour ta flamme et ton serment, ou jette-la, et il ne s'est rien passé.",
    en: "Your outing lasted {{duration}}. Keep it and it counts toward your flame and your oath, or discard it and nothing happened.",
    es: "Tu salida ha durado {{duration}}. Guárdala y cuenta para tu llama y tu juramento, o descártala y aquí no ha pasado nada.",
  },
  "village.foot": {
    why: "règle",
    fr: "Rien ne se gère ici. Chaque niveau vient d'une séance enregistrée.",
    es: "Aquí no se gestiona nada. Cada nivel sale de una sesión registrada.",
  },
  "village.crest_why_bars": {
    why: "fait",
    fr: "Tes 8 premières séances",
    en: "Your first 8 sessions",
    de: "Deine ersten 8 Einheiten",
    es: "Tus primeras 8 sesiones",
  },
  "village.crest_why_chosen": {
    why: "fait",
    fr: "Choisi par toi. Tes séances, elles, donnent {{animal}} : {{n}} séances {{part}} sur 8.",
    en: "Your choice. Your sessions would give {{animal}}: {{n}} of the first 8 were {{part}}.",
    de: "Von dir gewählt. Deine Einheiten sehen anders aus: {{n}} von 8 waren {{part}}, das wäre {{animal}}.",
  },
  "village.crest_why_chosen_mixed": {
    why: "fait",
    de: "Von dir gewählt. Deine Einheiten dagegen verteilen sich: {{list}}.",
  },
  // A rung the hero has passed: the name of the movement, a fact.
  "progression.new_rung_from": {
    why: "fait",
    es: "Ejercicio superado: {{name}}",
  },
  "village.crest_why_boar": {
    why: "fait",
    fr: "Tes 8 premières séances se partagent : {{list}}.",
    en: "Your first 8 sessions split: {{list}}.",
    de: "Deine ersten 8 Einheiten verteilen sich: {{list}}.",
    es: "Tus primeras 8 sesiones se reparten: {{list}}.",
  },
  "village.crest_pick_auto_sub": {
    why: "fait",
    fr: "{{practice}}, {{n}} séances sur 8",
    en: "{{practice}}, {{n}} of 8 sessions",
    de: "{{practice}}, {{n}} von 8 Einheiten",
    es: "{{practice}}, {{n}} de 8 sesiones",
  },
  "village.detail_muscle_driver": {
    why: "fait",
    fr: "Muscle visé : {{muscle}}, {{volume}} reps",
    en: "{{volume}} reps of {{muscle}} training",
    de: "{{volume}} Wdh. {{muscle}}",
    es: "{{volume}} reps de {{muscle}}",
  },
  "village.detail_style_driver": {
    why: "fait",
    fr: "{{volume}} reps de {{style}}",
    en: "{{volume}} reps of {{style}}",
    de: "{{volume}} Wdh. {{style}}",
    es: "{{volume}} reps de {{style}}",
  },
  "village.detail_recent_units": {
    why: "fait",
    fr: "{{volume}} reps",
    en: "{{volume}} reps",
    de: "{{volume}} Wdh.",
    es: "{{volume}} reps",
  },
  "village.detail_bosses_driver_one": {
    why: "fait",
    fr: "{{count}} boss vaincu",
    en: "{{count}} boss beaten",
    de: "{{count}} Boss besiegt",
  },
  "village.detail_bosses_driver_other": {
    why: "fait",
    fr: "{{count}} boss vaincus",
    en: "{{count}} bosses beaten",
  },
  "village.detail_bosses_driver_many": {
    why: "fait",
    fr: "{{count}} boss vaincus",
  },
  "village.detail_rematches_driver_one": {
    why: "fait",
    fr: "{{count}} revanche gagnée",
    en: "{{count}} rematch won",
    de: "{{count}} Revanche gewonnen",
  },
  "village.detail_rematches_driver_other": {
    why: "fait",
    fr: "{{count}} revanches gagnées",
    en: "{{count}} rematches won",
  },
  "village.detail_rematches_driver_many": {
    why: "fait",
    fr: "{{count}} revanches gagnées",
  },
  "village.detail_routes_driver_one": {
    why: "fait",
    fr: "{{count}} route terminée",
    en: "{{count}} route finished",
    de: "{{count}} Route abgeschlossen",
    es: "{{count}} ruta terminada",
  },
  "village.detail_routes_driver_other": {
    why: "fait",
    fr: "{{count}} routes terminées",
    en: "{{count}} routes finished",
    es: "{{count}} rutas terminadas",
  },
  "village.detail_routes_driver_many": {
    why: "fait",
    fr: "{{count}} routes terminées",
    es: "{{count}} rutas terminadas",
  },
  "village.unit_bosses_one": {
    why: "échelle",
    fr: "{{count}} boss",
    en: "{{count}} boss",
    de: "{{count}} Boss",
  },
  "village.unit_bosses_other": {
    why: "échelle",
    fr: "{{count}} boss",
    en: "{{count}} bosses",
  },
  "village.unit_bosses_many": {
    why: "échelle",
    fr: "{{count}} boss",
  },
  "village.unit_rematches_one": {
    why: "échelle",
    fr: "{{count}} revanche",
    en: "{{count}} rematch",
    de: "{{count}} Revanche",
  },
  "village.unit_rematches_other": {
    why: "échelle",
    fr: "{{count}} revanches",
    en: "{{count}} rematches",
  },
  "village.unit_rematches_many": {
    why: "échelle",
    fr: "{{count}} revanches",
  },
  "village.unit_routes_one": {
    why: "échelle",
    fr: "{{count}} route",
    en: "{{count}} route",
    de: "{{count}} Route",
    es: "{{count}} ruta",
  },
  "village.unit_routes_other": {
    why: "échelle",
    fr: "{{count}} routes",
    en: "{{count}} routes",
    es: "{{count}} rutas",
  },
  "village.unit_routes_many": {
    why: "échelle",
    fr: "{{count}} routes",
    es: "{{count}} rutas",
  },
  "village.bar_reps_done_one": {
    why: "fait",
    fr: "{{n}} rep faite",
    en: "{{n}} rep done",
    de: "{{n}} Wdh. geschafft",
    es: "{{n}} rep hecha",
  },
  "village.bar_reps_done_other": {
    why: "fait",
    fr: "{{n}} reps faites",
    en: "{{n}} reps done",
    de: "{{n}} Wdh. geschafft",
    es: "{{n}} reps hechas",
  },
  "village.bar_reps_done_many": {
    why: "fait",
    fr: "{{n}} reps faites",
    es: "{{n}} reps hechas",
  },
  // Achievements: a one-off goal shown on the trophy, a total over the hero's whole history.
  "db/achievements.ts:Completa 10 entrenamientos": { why: "succès" },
  "db/achievements.ts:Completa 100 entrenamientos": { why: "succès" },
  "db/achievements.ts:Completa 25 entrenamientos": { why: "succès" },
  "db/achievements.ts:Completa 250 entrenamientos": { why: "succès" },
  "db/achievements.ts:Completa 50 entrenamientos": { why: "succès" },
  "db/achievements.ts:Completa 500 entrenamientos": { why: "succès" },
  "db/achievements.ts:Complete 10 workouts": { why: "succès" },
  "db/achievements.ts:Complete 100 workouts": { why: "succès" },
  "db/achievements.ts:Complete 25 workouts": { why: "succès" },
  "db/achievements.ts:Complete 250 workouts": { why: "succès" },
  "db/achievements.ts:Complete 50 workouts": { why: "succès" },
  "db/achievements.ts:Complete 500 workouts": { why: "succès" },
  "db/achievements.ts:Schließ 10 Trainings ab": { why: "succès" },
  "db/achievements.ts:Schließ 100 Trainings ab": { why: "succès" },
  "db/achievements.ts:Schließ 25 Trainings ab": { why: "succès" },
  "db/achievements.ts:Schließ 250 Trainings ab": { why: "succès" },
  "db/achievements.ts:Schließ 50 Trainings ab": { why: "succès" },
  "db/achievements.ts:Schließ 500 Trainings ab": { why: "succès" },
  "db/achievements.ts:Termine 10 entraînements": { why: "succès" },
  "db/achievements.ts:Termine 100 entraînements": { why: "succès" },
  "db/achievements.ts:Termine 25 entraînements": { why: "succès" },
  "db/achievements.ts:Termine 250 entraînements": { why: "succès" },
  "db/achievements.ts:Termine 50 entraînements": { why: "succès" },
  "db/achievements.ts:Termine 500 entraînements": { why: "succès" },
  "db/achievements.ts:Completa 3 misiones distintas": { why: "succès" },
  "db/achievements.ts:Completa 5 misiones distintas": { why: "succès" },
  "db/achievements.ts:Complete 3 different quests": { why: "succès" },
  "db/achievements.ts:Complete 5 different quests": { why: "succès" },
  "db/achievements.ts:Finish one outing": { why: "succès" },
  "db/achievements.ts:Pasa una hora en movimiento en una sola salida": { why: "succès" },
  "db/achievements.ts:Passe une heure en mouvement sur une seule sortie": { why: "succès" },
  "db/achievements.ts:Schließ 3 verschiedene Quests ab": { why: "succès" },
  "db/achievements.ts:Schließ 5 verschiedene Quests ab": { why: "succès" },
  "db/achievements.ts:Spend an hour moving in one outing": { why: "succès" },
  "db/achievements.ts:Termina una salida": { why: "succès" },
  "db/achievements.ts:Termine 3 quêtes différentes": { why: "succès" },
  "db/achievements.ts:Termine 5 quêtes différentes": { why: "succès" },
  "db/achievements.ts:Termine une sortie": { why: "succès" },
  "db/achievements.ts:Termine un entraînement de 30+ minutes": { why: "succès" },
  "db/achievements.ts:Schließ ein Training von mindestens 30 Minuten ab": { why: "succès" },
  "db/achievements.ts:Completa un entrenamiento de 30 minutos o más": { why: "succès" },
  "db/achievements.ts:Termine un entraînement de 60+ minutes": { why: "succès" },
  "db/achievements.ts:Schließ ein Training von mindestens 60 Minuten ab": { why: "succès" },
  "db/achievements.ts:Completa un entrenamiento de 60 minutos o más": { why: "succès" },
  "db/achievements.ts:Schließ ein Training vor 7 Uhr ab": { why: "succès" },
  "db/achievements.ts:Completa un entrenamiento antes de las 7:00": { why: "succès" },
  "db/achievements.ts:Complete a workout after 10pm": { why: "succès" },
  "db/achievements.ts:Termine un entraînement après 22h": { why: "succès" },
  "db/achievements.ts:Schließ ein Training nach 22 Uhr ab": { why: "succès" },
  "db/achievements.ts:Completa un entrenamiento después de las 22:00": { why: "succès" },
  // The figure at the end of a rep bar: a scale mark, no sentence.
  "village.bar_end_reps_one": {
    why: "échelle",
    fr: "{{n}} rep",
    en: "{{n}} rep",
    de: "{{n}} Wdh.",
    es: "{{n}} rep",
  },
  "village.bar_end_reps_other": {
    why: "échelle",
    fr: "{{n}} reps",
    en: "{{n}} reps",
    de: "{{n}} Wdh.",
    es: "{{n}} reps",
  },
  "village.bar_end_reps_many": {
    why: "échelle",
    fr: "{{n}} reps",
    es: "{{n}} reps",
  },
  // How a hold converts to reps: an explanation, no count to reach.
  "village.rep_unit": {
    why: "règle",
    fr: "Une tenue vaut une rep toutes les {{seconds}} secondes.",
    en: "A hold counts one rep every {{seconds}} seconds.",
    de: "Beim Halten zählt alle {{seconds}} Sekunden eine Wiederholung.",
    es: "Al mantener una postura, cada {{seconds}} segundos cuentan como una repetición.",
  },
};

const countHit = (text: string) => EFFORT.test(text);

// A bare article is no count when it is a pronoun or the line only names a place ("Trouver une
// sortie" is a button, "The one from your sessions" is the crest). Exempt by key, with the reason;
// a real number next to a unit in the same string is never covered.
// Like ALLOWED_COUNTS, the text of every language where the article rule fires is frozen, so a
// copy edited by one character, or a new sentence on the same key, fails until it is re-read.
type ArticleExempt = { why: string } & Partial<Record<Lang, string>>;
const ARTICLE_EXEMPT: Record<string, ArticleExempt> = {
  "village.cta_outing": {
    why: "the button that opens the outings list, it asks for nothing",
    fr: "Trouver une sortie",
    es: "Buscar una salida",
  },
  "village.family_unbuilt_feeds": {
    why: "says what a family is fed by when nothing is built, no quantity",
    fr: "une séance suffit à en bâtir un",
    en: "one session builds one",
    de: "eine Einheit baut eines",
    es: "una sesión construye uno",
  },
  "village.crest_pick_auto": {
    why: "'one' is a pronoun for the crest the sessions give, no quantity",
    en: "The one from your sessions ({{animal}})",
  },
};
const articleUsed = new Set<string>();

// The second check: a chore said WITHOUT a count ("Deeds still to do"). Only the markers the old
// CHORES patterns used, so the count rule can stay the one rule; not a wider list.
const CHORE_MARKER =
  /à faire|à accomplir|il te reste|encore des|\bto do\b|\bstill to\b|\bleft to\b|zu erledigen|noch zu\b|por hacer|te quedan/i;
// Copy that holds a marker and is no chore, by key, with the reason.
const MARKER_EXEMPT: Record<string, string> = {};
const markerUsed = new Set<string>();
// The old detector's EXEMPT_KEYS spare the bar's XP gauge from all of it, but only with this exact
// text per language: any other sentence on that key (92e77c0a caught "il manque des séances") is
// read by the old detector like the rest. No plural variants exist. A dead entry fails.
const XP_GAUGE: Record<Lang, string> = {
  fr: "plus que {{xp}} XP",
  en: "{{xp}} XP to go",
  de: "nur noch {{xp}} XP",
  es: "solo faltan {{xp}} XP",
};
const xpGaugeUsed = new Set<Lang>();
// The old phrasing detector (helpers/oldChoreDetector.ts) runs on the same copy: a string fails if
// it or the count rule catches it. Its exemptions are its own, bounded as they were.
function checkOld(id: string, text: string, verdicts: string[], lang?: Lang) {
  if (lang && EXEMPT_KEYS.has(id) && XP_GAUGE[lang] === text) {
    xpGaugeUsed.add(lang);
    return;
  }
  if (!lang && ACHIEVEMENT_GOAL.test(id.replace(":", ": "))) return;
  if (Object.keys(CHORES).some((l) => (!lang || l === lang) && oldIsChore(l, text)))
    verdicts.push(`old|${id}|${text}`);
}
function checkMarker(id: string, text: string, verdicts: string[]) {
  if (!CHORE_MARKER.test(text)) return;
  if (id in MARKER_EXEMPT) markerUsed.add(id);
  else verdicts.push(`marker|${id}|${text}`);
}

// The old self-test table, word for word.
const OLD_LINES: Record<string, string[]> = {
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
    "Plus que {{count}} séances pour le rang 2",
    "Fais encore 20 pompes",
    "Il te reste 5 reps",
    "Encore 5 reps",
    "Nur noch {{n}} Einheiten bis Rang 2",
    "5 Wdh. noch zu machen",
    "Solo {{count}} sesiones más para el grado 2",
    "Te quedan 5 reps",
    "3 deeds still open",
    "2 sessions to go",
    "une rep suffit",
    "Séances restantes : {{count}}",
    "Objectif : {{exercise}} × {{count}}",
    "3x10 pompes demain",
  ];
  // The old table, word for word: what the phrasing detector was written for.
  for (const [lang, lines] of Object.entries(OLD_LINES))
    for (const line of lines)
      expect([lang, line, oldIsChore(lang, line)]).toEqual([lang, line, true]);
  for (const line of ["Deeds still to do", "encore des séances à faire", "Noch zu erledigen"])
    expect([line, CHORE_MARKER.test(line)]).toEqual([line, true]);
  for (const line of LINES) expect([line, countHit(line)]).toEqual([line, true]);
  for (const ok of ["Plus que {{xp}} XP", "Rang 2", "12 km", "3 jours", "2 semaines", "niveau 4"])
    expect([ok, countHit(ok)]).toEqual([ok, false]);
});

// The guard against a weaker detector. Every probe below is a chore the phrasing detector (or the
// count rule) is known to catch, and `by` names who must keep catching it. Each probe goes through
// check() itself, the whole check, and must come back with a verdict; a probe marked "old" must
// get it from the old detector (an `old|` verdict), so removing a pattern from the old detector
// fails here even while the count rule would have caught the line. The last block of probes has one
// line per top-level alternative of CHORES and of the old detector's MARKER words, each caught by
// that alternative alone: removing any one reddens this test (a handful are subsumed by a
// neighbour and cannot be probed, see the source pin below for CHORES).
type Probe = { lang: Lang; text: string; by: "old" | "count" };
const PROBES: Probe[] = [
  ...Object.entries(OLD_LINES).flatMap(([lang, lines]) =>
    lines.map((text) => ({ lang: lang as Lang, text, by: "old" as const })),
  ),
  { lang: "en", text: "One more session for rank 2", by: "old" },
  { lang: "en", text: "Another session for rank 2", by: "old" },
  { lang: "en", text: "Sessions left before rank 2", by: "old" },
  { lang: "en", text: "Sessions left: {{count}}", by: "old" },
  { lang: "en", text: "Deeds still open", by: "old" },
  { lang: "en", text: "Reps to go", by: "old" },
  { lang: "en", text: "before level 2", by: "old" },
  { lang: "en", text: "to level 2", by: "old" },
  { lang: "en", text: "for level 2", by: "old" },
  { lang: "fr", text: "Il reste des séances", by: "old" },
  { lang: "fr", text: "Il manque des séances", by: "old" },
  { lang: "fr", text: "avant le niveau 2", by: "old" },
  { lang: "de", text: "Es fehlen Einheiten für Rang 2", by: "old" },
  { lang: "de", text: "bis Stufe 2", by: "old" },
  { lang: "de", text: "für Stufe 2", by: "old" },
  { lang: "de", text: "Noch 3 Wochen bis Rang 2", by: "old" },
  { lang: "es", text: "Quedan sesiones para el grado 2", by: "old" },
  { lang: "es", text: "Basta una sesión", by: "old" },
  { lang: "es", text: "Faltan {{count}} para el grado 2", by: "old" },
  { lang: "es", text: "Todavía {{count}} para el grado 2", by: "old" },
  { lang: "es", text: "hasta el nivel 2", by: "old" },
  { lang: "es", text: "para el nivel 2", by: "old" },
  // One probe per alternative of the old detector (CHORES, then MARKER words with a count).
  { lang: "en", text: "Another route", by: "old" },
  { lang: "en", text: "One rep builds it", by: "old" },
  { lang: "en", text: "Still to build", by: "old" },
  { lang: "en", text: "Things to do", by: "old" },
  { lang: "en", text: "Doors still open", by: "old" },
  { lang: "en", text: "Deeds still waiting", by: "old" },
  { lang: "en", text: "Only 5 reps", by: "old" },
  { lang: "en", text: "Just 5 reps", by: "old" },
  { lang: "en", text: "5 reps more", by: "old" },
  { lang: "en", text: "Another 5 reps", by: "old" },
  { lang: "en", text: "Until 5 reps", by: "old" },
  { lang: "en", text: "Left 5 reps", by: "old" },
  { lang: "en", text: "To go: 5 reps", by: "old" },
  { lang: "en", text: "Remaining 5 reps", by: "old" },
  { lang: "en", text: "Still 5 reps", by: "old" },
  { lang: "en", text: "Missing 5 reps", by: "old" },
  { lang: "en", text: "Do 5 reps", by: "old" },
  { lang: "en", text: "Complete 5 reps", by: "old" },
  { lang: "en", text: "Finish 5 reps", by: "old" },
  { lang: "fr", text: "Avant le rang 2", by: "old" },
  { lang: "fr", text: "Pour le niveau 2", by: "old" },
  { lang: "fr", text: "Une rep suffit", by: "old" },
  { lang: "fr", text: "Il te reste du chemin", by: "old" },
  { lang: "fr", text: "Des choses à faire", by: "old" },
  { lang: "fr", text: "Encore {{n}}", by: "old" },
  { lang: "fr", text: "Plus que 5 reps", by: "old" },
  { lang: "fr", text: "5 reps encore", by: "old" },
  { lang: "fr", text: "Reste 5 reps", by: "old" },
  { lang: "fr", text: "Manque 5 reps", by: "old" },
  { lang: "fr", text: "Avant 5 reps", by: "old" },
  { lang: "fr", text: "Jusqu'au 5 reps", by: "old" },
  { lang: "fr", text: "Pour atteindre 5 reps", by: "old" },
  { lang: "fr", text: "Fais 5 reps", by: "old" },
  { lang: "fr", text: "Refais 5 reps", by: "old" },
  { lang: "de", text: "Bis zu Stufe 2", by: "old" },
  { lang: "de", text: "Eine Wiederholung reicht", by: "old" },
  { lang: "de", text: "Noch zu bauen", by: "old" },
  { lang: "de", text: "Alles zu erledigen", by: "old" },
  { lang: "de", text: "Noch {{n}} Wochen", by: "old" },
  { lang: "de", text: "5 Wdh. noch", by: "old" },
  { lang: "de", text: "Nur 5 Wdh.", by: "old" },
  { lang: "de", text: "Bis 5 Wdh.", by: "old" },
  { lang: "de", text: "Fehlt 5 Wdh.", by: "old" },
  { lang: "de", text: "Mehr 5 Wdh.", by: "old" },
  { lang: "de", text: "Übrig 5 Wdh.", by: "old" },
  { lang: "de", text: "Mach 5 Wdh.", by: "old" },
  { lang: "de", text: "Schaffe 5 Wdh.", by: "old" },
  { lang: "es", text: "Cosas por hacer", by: "old" },
  { lang: "es", text: "Más 5 reps", by: "old" },
  { lang: "es", text: "Falta 5 reps", by: "old" },
  { lang: "es", text: "5 reps para el", by: "old" },
  { lang: "es", text: "Hasta 5 reps", by: "old" },
  { lang: "es", text: "Solo 5 reps", by: "old" },
  { lang: "es", text: "Sólo 5 reps", by: "old" },
  { lang: "es", text: "Haz 5 reps", by: "old" },
  { lang: "es", text: "Hazlo 5 reps", by: "old" },
  { lang: "fr", text: "Encore une séance pour le rang 2", by: "count" },
  { lang: "fr", text: "3 exercices", by: "count" },
  { lang: "fr", text: "2 quêtes", by: "count" },
  { lang: "fr", text: "3 séries", by: "count" },
  { lang: "fr", text: "2 tours de piste", by: "count" },
  { lang: "en", text: "3 exercises", by: "count" },
  { lang: "en", text: "2 quests", by: "count" },
  { lang: "en", text: "3 sets", by: "count" },
  { lang: "en", text: "2 rounds", by: "count" },
  { lang: "en", text: "4 laps", by: "count" },
  { lang: "de", text: "5 Trainingseinheiten", by: "count" },
  { lang: "de", text: "3 Übungen", by: "count" },
  { lang: "de", text: "2 Quests", by: "count" },
  { lang: "de", text: "3 Serien", by: "count" },
  { lang: "de", text: "2 Runden", by: "count" },
  { lang: "de", text: "10 Ausfallschritte", by: "count" },
  { lang: "de", text: "20 Hampelmänner", by: "count" },
  { lang: "de", text: "5 Pike-Liegestütze", by: "count" },
  { lang: "de", text: "15 Fahrrad-Crunches", by: "count" },
  { lang: "es", text: "3 ejercicios", by: "count" },
  { lang: "es", text: "2 misiones", by: "count" },
  { lang: "es", text: "3 series", by: "count" },
  { lang: "es", text: "2 rondas", by: "count" },
  { lang: "es", text: "10 flexiones en pica", by: "count" },
  { lang: "en", text: "One more session", by: "count" },
  { lang: "de", text: "Noch eine Einheit", by: "count" },
  { lang: "en", text: "One more round", by: "count" },
  { lang: "fr", text: "Encore un tour de piste", by: "count" },
  { lang: "de", text: "Noch eine Runde mehr", by: "count" },
  { lang: "es", text: "Una ronda más", by: "count" },
  { lang: "en", text: "120 reps to rank 2", by: "count" },
  { lang: "fr", text: "120 reps pour le rang 2", by: "count" },
  { lang: "de", text: "120 Wiederholungen für Rang 2", by: "count" },
  { lang: "en", text: "Rank 2 needs 120 reps", by: "count" },
  { lang: "fr", text: "Reps pour le rang {{level}} : {{count}}", by: "count" },
  { lang: "fr", text: "Séances restantes : {{count}}", by: "count" },
  { lang: "fr", text: "Prochain rang : {{count}} rép.", by: "count" },
  { lang: "en", text: "Reps needed: {{count}}", by: "count" },
  { lang: "en", text: "Sessions to rank {{level}}: {{count}}", by: "count" },
  { lang: "de", text: "Wiederholungen bis Rang {{level}}: {{count}}", by: "count" },
  { lang: "de", text: "Verbleibende Einheiten: {{count}}", by: "count" },
  { lang: "es", text: "Repeticiones para el grado {{level}}: {{count}}", by: "count" },
  { lang: "es", text: "Sesiones restantes: {{count}}", by: "count" },
  { lang: "fr", text: "Objectif : {{exercise}} × {{count}}", by: "count" },
  { lang: "en", text: "Goal: {{exercise}} × {{count}}", by: "count" },
  { lang: "de", text: "Ziel: {{exercise}} × {{count}}", by: "count" },
  { lang: "es", text: "Objetivo: {{exercise}} × {{count}}", by: "count" },
  { lang: "fr", text: "3x10 pompes demain", by: "count" },
  { lang: "en", text: "3x10 push-ups", by: "count" },
  { lang: "de", text: "3x10 Liegestütze", by: "count" },
  { lang: "es", text: "3x10 flexiones", by: "count" },
];

// The sizes at the time of writing: a floor, raised when a probe is added, never lowered.
const PROBE_COUNT = 150;
const OLD_LINE_COUNT = 21;
const probeVerdicts = (lang: Lang, text: string) => {
  const verdicts: string[] = [];
  check("probe", text, verdicts, lang);
  return verdicts;
};

it("never lets the check get weaker than the detector it replaced", () => {
  const verdicts = PROBES.flatMap(({ lang, text, by }) => {
    const got = probeVerdicts(lang, text);
    // "count" must come from the count rule itself (`${lang}|probe|…`), not from old| or marker|.
    const caught = got.some((v) => v.startsWith(by === "old" ? "old|" : `${lang}|probe|`));
    return caught ? [] : [`${by}|${lang}|${text}`];
  });
  expect(verdicts).toEqual([]);
});

// The guard cannot be emptied or short-circuited: sizes only go up, and a line that ONLY the old
// detector catches must come out of check() rejected, with the old detector named.
it("keeps its probes, and check() really runs the old detector", () => {
  expect(PROBES.length).toBeGreaterThanOrEqual(PROBE_COUNT);
  expect(Object.values(OLD_LINES).flat().length).toBeGreaterThanOrEqual(OLD_LINE_COUNT);
  const onlyOld = PROBES.filter(
    (p) => p.by === "old" && !countHit(p.text) && !CHORE_MARKER.test(p.text),
  );
  expect(onlyOld.length).toBeGreaterThan(0);
  for (const { lang, text } of onlyOld)
    expect([text, probeVerdicts(lang, text).map((v) => v.split("|")[0])]).toEqual([text, ["old"]]);
});

// Some alternatives of CHORES are subsumed by a neighbour ("encore {{count}}" by "encore {{n}}",
// "noch N <unit>" by "noch N <anything>", "te quedan" by "quedan"), so no line can tell their
// removal. The patterns are copied word for word and never edited: pin them.
it("keeps the CHORES patterns of 0125bfde word for word", () => {
  const pin = Object.fromEntries(
    Object.entries(CHORES).map(([l, r]) => [
      l,
      createHash("sha256").update(`${r.source}/${r.flags}`).digest("hex").slice(0, 16),
    ]),
  );
  expect(pin).toEqual({
    en: "9080eb60636fe472",
    fr: "2f7753e70b6dab20",
    de: "35cd92848f737c46",
    es: "c21193b957b09e39",
  });
});

const used = new Set<string>();
function check(id: string, text: string, verdicts: string[], lang?: Lang) {
  checkMarker(id, text, verdicts);
  checkOld(id, text, verdicts, lang);
  if (!countHit(text)) return;
  const exempt = ARTICLE_EXEMPT[id];
  if (exempt && !COUNTED.test(text)) {
    articleUsed.add(`${id}|${lang}`);
    if (exempt[lang as Lang] !== text) verdicts.push(`article text changed ${lang}|${id}: ${text}`);
    return;
  }
  const entry = ALLOWED_COUNTS[id];
  if (!entry) {
    verdicts.push(`${lang ?? "src"}|${id}|${text}`);
    return;
  }
  used.add(lang ? `${id}|${lang}` : id);
  if (lang && entry[lang] !== text) verdicts.push(`changed ${lang}|${id}: ${text}`);
  if (entry.why === "estimation" && HAS_REPS.test(text))
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
    for (const [k, v] of featureCopy(lang)) check(k, v, verdicts, lang);
    expect(verdicts).toEqual([]);
  });

  // featureCopy takes every village.* key, so the scan above covers the whole Village section.
  it("scans every key of the Village section", () => {
    const scanned = new Set(featureCopy(lang).map(([k]) => k));
    // a nested table (tiers, buildings, flavour) is scanned through its leaves
    const isScanned = (k: string) =>
      scanned.has(`village.${k}`) || [...scanned].some((s) => s.startsWith(`village.${k}.`));
    expect(Object.keys(village).filter((k) => !isScanned(k))).toEqual([]);
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
  it("gives every entry a valid reason, the reserved ones only to their own keys", () => {
    for (const [id, { why }] of Object.entries(ALLOWED_COUNTS)) {
      expect([id, REASONS.includes(why)]).toEqual([id, true]);
      for (const [reserved, keys] of Object.entries(RESERVED))
        expect([id, reserved, why === reserved]).toEqual([id, reserved, keys?.test(id)]);
    }
  });

  it("has no dead article exemption", () => {
    const dead = Object.entries(ARTICLE_EXEMPT).flatMap(([id, e]) => {
      const wanted = LANG_LIST.filter((l) => e[l] !== undefined).map((l) => `${id}|${l}`);
      return [...(wanted.length ? [] : [id]), ...wanted.filter((w) => !articleUsed.has(w))];
    });
    expect(dead).toEqual([]);
  });

  it("has no dead XP gauge exemption", () => {
    expect(LANG_LIST.filter((l) => !xpGaugeUsed.has(l))).toEqual([]);
  });

  it("has no dead marker exemption", () => {
    expect(Object.keys(MARKER_EXEMPT).filter((id) => !markerUsed.has(id))).toEqual([]);
  });

  // Runs last in the file: the scans above have filled `used`.
  it("has no dead entry", () => {
    const dead = Object.entries(ALLOWED_COUNTS).flatMap(([id, e]) => {
      const langs = LANG_LIST.filter((l) => e[l] !== undefined);
      const wanted = langs.length ? langs.map((l) => `${id}|${l}`) : [id];
      return wanted.filter((w) => !used.has(w));
    });
    expect(dead).toEqual([]);
  });
});
