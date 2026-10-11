import * as fs from "node:fs";
import * as path from "node:path";
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
const COUNT = String.raw`(?:\d+|\{\{[^}]*\}\}|\$\{[^}]*\}|(?:${WORDS.join("|")}))`;
const B = String.raw`(?<![\p{L}\p{N}-])`;
const E = String.raw`(?![\p{L}])`;
// Reps and the like: what a milestone must never count (see "estimation").
const REPS = "reps?|wdh\\.?|repetitions?|répétitions?|wiederholung\\w*|repeticion\\w*|repetición";
const MOVES =
  "push-?ups?|pull-?ups?|sit-?ups?|squats?|lunges?|burpees?|planks?|crunch(?:es)?|dips|jumping jacks?|mountain climbers?|glute bridges?|wall sits?|deadlifts?|calf raises?|leg raises?|step-?ups?|pompes?|tractions?|fentes?|gainages?|Liegestütz\\w*|Klimmzüg\\w*|Kniebeug\\w*|flexion\\w*|sentadilla\\w*|dominada\\w*|zancada\\w*|abdominal\\w*|plancha\\w*";
const OUTINGS =
  "deeds|deed(?! driver)|bosses|boss|routes?|rematch(?:es)?|hauts? faits?|exploits?|revanches?|taten|hazañas?|rutas?|sessions?|workouts?|trainings?|outings?|sets?|séances?|sorties?|séries?|entraînements?|einheit\\w*|sitzung\\w*|ausflug|ausflüg\\w*|touren?|sätze|sesion\\w*|sesión|salidas?|series|entrenamientos?";
const ART = "one|une?|ein|eine|einen|una|uno";
const rx = (c: string, u: string) =>
  new RegExp(`${B}${c}\\s+(?:[\\p{L}'’-]+\\s+){0,2}(?:${u})${E}`, "iu");
const EFFORT = new RegExp(
  `${rx(COUNT, `${REPS}|${MOVES}|${OUTINGS}`).source}|${rx(`(?:${ART})`, `${REPS}|${MOVES}`).source}`,
  "iu",
);
const HAS_REPS = new RegExp(`${B}(?:${REPS}|${MOVES})${E}`, "iu");

// Why a count is allowed. Four reasons, no other:
//  - "fait": it says what the hero HAS ALREADY done (records, totals, "5 de tes 8 séances", the
//    history behind a building);
//  - "estimation": the spec's milestone, "rank 2 in about 3 sessions", never a quantity of reps;
//  - "échelle": the figure at the end of a rep bar, validated on the mockup in slice 7. A scale
//    mark, not a sentence. Only village.bar_end_reps_*;
//  - "règle": how a hold converts to reps, an explanation. Only village.rep_unit.
type Why = "fait" | "estimation" | "échelle" | "règle";
const REASONS: readonly Why[] = ["fait", "estimation", "échelle", "règle"];
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
  // What the hero HAS DONE: totals, records, "5 of your 8 sessions", the oath's metric, and the
  // reps, bosses, routes and sessions behind a building (detail sheet, bar caption).
  "oath.metric_sessions": {
    why: "fait",
    fr: "{{count, number}} séances accomplies",
    en: "{{count, number}} sessions logged",
    de: "{{count, number}} absolvierte Einheiten",
    es: "{{count, number}} sesiones completadas",
  },
  "oath.metric_weekly_sessions": {
    why: "fait",
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
    why: "fait",
    fr: "{{count}} boss",
    en: "{{count}} boss",
    de: "{{count}} Boss",
  },
  "village.unit_bosses_other": {
    why: "fait",
    fr: "{{count}} boss",
    en: "{{count}} bosses",
  },
  "village.unit_bosses_many": {
    why: "fait",
    fr: "{{count}} boss",
  },
  "village.unit_rematches_one": {
    why: "fait",
    fr: "{{count}} revanche",
    en: "{{count}} rematch",
    de: "{{count}} Revanche",
  },
  "village.unit_rematches_other": {
    why: "fait",
    fr: "{{count}} revanches",
    en: "{{count}} rematches",
  },
  "village.unit_rematches_many": {
    why: "fait",
    fr: "{{count}} revanches",
  },
  "village.unit_routes_one": {
    why: "fait",
    fr: "{{count}} route",
    en: "{{count}} route",
    de: "{{count}} Route",
    es: "{{count}} ruta",
  },
  "village.unit_routes_other": {
    why: "fait",
    fr: "{{count}} routes",
    en: "{{count}} routes",
    es: "{{count}} rutas",
  },
  "village.unit_routes_many": {
    why: "fait",
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
  "db/achievements.ts:Completa 10 entrenamientos": { why: "fait" },
  "db/achievements.ts:Completa 100 entrenamientos": { why: "fait" },
  "db/achievements.ts:Completa 25 entrenamientos": { why: "fait" },
  "db/achievements.ts:Completa 250 entrenamientos": { why: "fait" },
  "db/achievements.ts:Completa 50 entrenamientos": { why: "fait" },
  "db/achievements.ts:Completa 500 entrenamientos": { why: "fait" },
  "db/achievements.ts:Complete 10 workouts": { why: "fait" },
  "db/achievements.ts:Complete 100 workouts": { why: "fait" },
  "db/achievements.ts:Complete 25 workouts": { why: "fait" },
  "db/achievements.ts:Complete 250 workouts": { why: "fait" },
  "db/achievements.ts:Complete 50 workouts": { why: "fait" },
  "db/achievements.ts:Complete 500 workouts": { why: "fait" },
  "db/achievements.ts:Schließ 10 Trainings ab": { why: "fait" },
  "db/achievements.ts:Schließ 100 Trainings ab": { why: "fait" },
  "db/achievements.ts:Schließ 25 Trainings ab": { why: "fait" },
  "db/achievements.ts:Schließ 250 Trainings ab": { why: "fait" },
  "db/achievements.ts:Schließ 50 Trainings ab": { why: "fait" },
  "db/achievements.ts:Schließ 500 Trainings ab": { why: "fait" },
  "db/achievements.ts:Termine 10 entraînements": { why: "fait" },
  "db/achievements.ts:Termine 100 entraînements": { why: "fait" },
  "db/achievements.ts:Termine 25 entraînements": { why: "fait" },
  "db/achievements.ts:Termine 250 entraînements": { why: "fait" },
  "db/achievements.ts:Termine 50 entraînements": { why: "fait" },
  "db/achievements.ts:Termine 500 entraînements": { why: "fait" },
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
  ];
  for (const line of LINES) expect([line, countHit(line)]).toEqual([line, true]);
  for (const ok of ["Plus que {{xp}} XP", "Rang 2", "12 km", "3 jours", "2 semaines", "niveau 4"])
    expect([ok, countHit(ok)]).toEqual([ok, false]);
});

const used = new Set<string>();
function check(id: string, text: string, verdicts: string[], lang?: Lang) {
  if (!countHit(text)) return;
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
    expect(Object.keys(village).filter((k) => !scanned.has(`village.${k}`))).toEqual([]);
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
  it("gives every entry a valid reason, échelle and règle only to their own key", () => {
    for (const [id, { why }] of Object.entries(ALLOWED_COUNTS)) {
      expect([id, REASONS.includes(why)]).toEqual([id, true]);
      if (why === "échelle") expect(id).toMatch(/^village\.bar_end_reps_/);
      if (why === "règle") expect(id).toBe("village.rep_unit");
    }
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
