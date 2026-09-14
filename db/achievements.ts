import { eq } from "drizzle-orm";
import { db, schema, transactionOrFallback } from "./client";
import { getSessionAggregates } from "./completed";
import { countClimbedPaths } from "./exercises";
import type { Locomotion } from "./schema";
import { getStreakInfo } from "./streaks";
import { getTotalXp } from "./userLevel";

const { userPreferences } = schema;

// Achievement type codes
export const achievementCodes = [
  // Session milestones
  "first_workout",
  "sessions_10",
  "sessions_25",
  "sessions_50",
  "sessions_100",
  "sessions_250",
  "sessions_500",
  // Streak milestones
  "streak_3",
  "streak_7",
  "streak_14",
  "streak_30",
  "streak_60",
  "streak_100",
  // XP milestones
  "xp_100",
  "xp_500",
  "xp_1000",
  "xp_5000",
  "xp_10000",
  // Session duration
  "long_session_30min",
  "long_session_60min",
  // Early bird / Night owl
  "early_bird", // Workout before 7am
  "night_owl", // Workout after 10pm
  // Variety
  "variety_3_quests", // Complete 3 different quests
  "variety_5_quests", // Complete 5 different quests
  // Skill. Thirty-four achievements counted sessions, flames, XP, hours and quest variety — the
  // most worked-on progression system in the app was the only one its reward system ignored.
  "path_climbed", // Own every rung of one path on the variation ladder
  // Ground. Every other badge here says "workout", and 0049 stopped a walk from claiming any of
  // them — which leaves a hero who mostly goes outside with a shelf that never fills. These two
  // are the ones a walk can take, and the only ones it can.
  "first_outing", // Go outside once
  "hour_outside", // An hour of moving in one outing
] as const;

export type AchievementCode = (typeof achievementCodes)[number];

export interface AchievementDefinition {
  code: AchievementCode;
  /**
   * A `GameIconName` (see hooks/useGameIcon.ts) or, when the fantasy set has no match, a
   * `@tamagui/lucide-icons` component name — resolved by components/common/AchievementIcon.tsx,
   * the one place every trophy view (journal shelf, village shelf, village detail) renders this.
   * Not persisted: only the unlocked `code` and timestamp are stored, so this string is safe to
   * repoint at any time without a migration.
   */
  icon: string;
  enTitle: string;
  frTitle: string;
  deTitle: string;
  esTitle: string;
  enDescription: string;
  frDescription: string;
  deDescription: string;
  esDescription: string;
  category: "sessions" | "streaks" | "xp" | "special";
}

export const achievementDefinitions: AchievementDefinition[] = [
  // Session milestones
  {
    code: "first_workout",
    icon: "Target",
    enTitle: "First Steps",
    frTitle: "Premiers Pas",
    deTitle: "Erste Schritte",
    esTitle: "Primeros pasos",
    enDescription: "Complete your first workout",
    frDescription: "Termine ton premier entraînement",
    deDescription: "Schließ dein erstes Training ab",
    esDescription: "Completa tu primer entrenamiento",
    category: "sessions",
  },
  {
    code: "sessions_10",
    icon: "muscle",
    enTitle: "Getting Started",
    frTitle: "Bien Parti",
    deTitle: "Gut gestartet",
    esTitle: "Buen comienzo",
    enDescription: "Complete 10 workouts",
    frDescription: "Termine 10 entraînements",
    deDescription: "Schließ 10 Trainings ab",
    esDescription: "Completa 10 entrenamientos",
    category: "sessions",
  },
  {
    code: "sessions_25",
    icon: "Footprints",
    enTitle: "Dedicated",
    frTitle: "Dévoué",
    deTitle: "Beharrlich",
    esTitle: "Constante",
    enDescription: "Complete 25 workouts",
    frDescription: "Termine 25 entraînements",
    deDescription: "Schließ 25 Trainings ab",
    esDescription: "Completa 25 entrenamientos",
    category: "sessions",
  },
  {
    code: "sessions_50",
    icon: "flame",
    enTitle: "On Fire",
    frTitle: "En Feu",
    deTitle: "Feuer und Flamme",
    esTitle: "Al rojo vivo",
    enDescription: "Complete 50 workouts",
    frDescription: "Termine 50 entraînements",
    deDescription: "Schließ 50 Trainings ab",
    esDescription: "Completa 50 entrenamientos",
    category: "sessions",
  },
  {
    code: "sessions_100",
    icon: "sword",
    enTitle: "Century Warrior",
    frTitle: "Guerrier des Cent",
    deTitle: "Krieger der Hundert",
    esTitle: "Guerrero de los cien",
    enDescription: "Complete 100 workouts",
    frDescription: "Termine 100 entraînements",
    deDescription: "Schließ 100 Trainings ab",
    esDescription: "Completa 100 entrenamientos",
    category: "sessions",
  },
  {
    code: "sessions_250",
    icon: "trophy",
    enTitle: "Champion",
    frTitle: "Champion",
    deTitle: "Champion",
    esTitle: "Campeón",
    enDescription: "Complete 250 workouts",
    frDescription: "Termine 250 entraînements",
    deDescription: "Schließ 250 Trainings ab",
    esDescription: "Completa 250 entrenamientos",
    category: "sessions",
  },
  {
    code: "sessions_500",
    icon: "crown",
    enTitle: "Legend",
    frTitle: "Légende",
    deTitle: "Legende",
    esTitle: "Leyenda",
    enDescription: "Complete 500 workouts",
    frDescription: "Termine 500 entraînements",
    deDescription: "Schließ 500 Trainings ab",
    esDescription: "Completa 500 entrenamientos",
    category: "sessions",
  },

  // Streak milestones
  {
    code: "streak_3",
    icon: "Sprout",
    enTitle: "Sprouting",
    frTitle: "Bourgeonnement",
    deTitle: "Erster Keim",
    esTitle: "Brote",
    enDescription: "Keep your flame lit for 3 days",
    frDescription: "Garde ta flamme allumée 3 jours",
    deDescription: "Lass deine Flamme 3 Tage lang brennen",
    esDescription: "Mantén tu llama encendida 3 días",
    category: "streaks",
  },
  {
    code: "streak_7",
    icon: "Leaf",
    enTitle: "Weekly Warrior",
    frTitle: "Guerrier Hebdo",
    deTitle: "Wochenkrieger",
    esTitle: "Guerrero semanal",
    enDescription: "Keep your flame lit for 7 days",
    frDescription: "Garde ta flamme allumée 7 jours",
    deDescription: "Lass deine Flamme 7 Tage lang brennen",
    esDescription: "Mantén tu llama encendida 7 días",
    category: "streaks",
  },
  {
    code: "streak_14",
    icon: "TreePine",
    enTitle: "Two Week Wonder",
    frTitle: "Quinze Jours de Feu",
    deTitle: "Zwei Wochen Feuer",
    esTitle: "Quince días de fuego",
    enDescription: "Keep your flame lit for 14 days",
    frDescription: "Garde ta flamme allumée 14 jours",
    deDescription: "Lass deine Flamme 14 Tage lang brennen",
    esDescription: "Mantén tu llama encendida 14 días",
    category: "streaks",
  },
  {
    code: "streak_30",
    icon: "flame",
    enTitle: "Monthly Master",
    frTitle: "Maître Mensuel",
    deTitle: "Monatsmeister",
    esTitle: "Maestro del mes",
    enDescription: "Keep your flame lit for 30 days",
    frDescription: "Garde ta flamme allumée 30 jours",
    deDescription: "Lass deine Flamme 30 Tage lang brennen",
    esDescription: "Mantén tu llama encendida 30 días",
    category: "streaks",
  },
  {
    code: "streak_60",
    icon: "lightning",
    enTitle: "Unstoppable",
    frTitle: "Inarrêtable",
    deTitle: "Unaufhaltsam",
    esTitle: "Imparable",
    enDescription: "Keep your flame lit for 60 days",
    frDescription: "Garde ta flamme allumée 60 jours",
    deDescription: "Lass deine Flamme 60 Tage lang brennen",
    esDescription: "Mantén tu llama encendida 60 días",
    category: "streaks",
  },
  {
    code: "streak_100",
    icon: "star",
    enTitle: "Centurion",
    frTitle: "Centurion",
    deTitle: "Zenturio",
    esTitle: "Centurión",
    enDescription: "Keep your flame lit for 100 days",
    frDescription: "Garde ta flamme allumée 100 jours",
    deDescription: "Lass deine Flamme 100 Tage lang brennen",
    esDescription: "Mantén tu llama encendida 100 días",
    category: "streaks",
  },

  // XP milestones
  {
    code: "xp_100",
    icon: "Sparkles",
    enTitle: "XP Hunter",
    frTitle: "Chasseur d'XP",
    deTitle: "XP-Jäger",
    esTitle: "Cazador de XP",
    enDescription: "Earn 100 total XP",
    frDescription: "Gagne 100 XP au total",
    deDescription: "Sammle insgesamt 100 XP",
    esDescription: "Gana 100 XP en total",
    category: "xp",
  },
  {
    code: "xp_500",
    icon: "Gem",
    enTitle: "XP Collector",
    frTitle: "Collectionneur d'XP",
    deTitle: "XP-Sammler",
    esTitle: "Coleccionista de XP",
    enDescription: "Earn 500 total XP",
    frDescription: "Gagne 500 XP au total",
    deDescription: "Sammle insgesamt 500 XP",
    esDescription: "Gana 500 XP en total",
    category: "xp",
  },
  {
    code: "xp_1000",
    icon: "Medal",
    enTitle: "XP Master",
    frTitle: "Maître de l'XP",
    deTitle: "XP-Meister",
    esTitle: "Maestro de la XP",
    enDescription: "Earn 1,000 total XP",
    frDescription: "Gagne 1 000 XP au total",
    deDescription: "Sammle insgesamt 1.000 XP",
    esDescription: "Gana 1000 XP en total",
    category: "xp",
  },
  {
    code: "xp_5000",
    icon: "Award",
    enTitle: "XP Elite",
    frTitle: "Élite de l'XP",
    deTitle: "XP-Elite",
    esTitle: "Élite de la XP",
    enDescription: "Earn 5,000 total XP",
    frDescription: "Gagne 5 000 XP au total",
    deDescription: "Sammle insgesamt 5.000 XP",
    esDescription: "Gana 5000 XP en total",
    category: "xp",
  },
  {
    code: "xp_10000",
    icon: "crown",
    enTitle: "XP Legend",
    frTitle: "Légende de l'XP",
    deTitle: "XP-Legende",
    esTitle: "Leyenda de la XP",
    enDescription: "Earn 10,000 total XP",
    frDescription: "Gagne 10 000 XP au total",
    deDescription: "Sammle insgesamt 10.000 XP",
    esDescription: "Gana 10 000 XP en total",
    category: "xp",
  },

  // Special achievements
  {
    code: "long_session_30min",
    icon: "Timer",
    enTitle: "Endurance",
    frTitle: "Endurance",
    deTitle: "Ausdauer",
    esTitle: "Resistencia",
    enDescription: "Complete a 30+ minute workout",
    frDescription: "Termine un entraînement de 30+ minutes",
    deDescription: "Schließ ein Training von mindestens 30 Minuten ab",
    esDescription: "Completa un entrenamiento de 30 minutos o más",
    category: "special",
  },
  {
    code: "long_session_60min",
    icon: "Dumbbell",
    enTitle: "Iron Will",
    frTitle: "Volonté de Fer",
    deTitle: "Eiserner Wille",
    esTitle: "Voluntad de hierro",
    enDescription: "Complete a 60+ minute workout",
    frDescription: "Termine un entraînement de 60+ minutes",
    deDescription: "Schließ ein Training von mindestens 60 Minuten ab",
    esDescription: "Completa un entrenamiento de 60 minutos o más",
    category: "special",
  },
  {
    code: "early_bird",
    icon: "Sunrise",
    enTitle: "Early Bird",
    frTitle: "Lève-Tôt",
    deTitle: "Frühaufsteher",
    esTitle: "Madrugador",
    enDescription: "Complete a workout before 7am",
    frDescription: "Termine un entraînement avant 7h",
    deDescription: "Schließ ein Training vor 7 Uhr ab",
    esDescription: "Completa un entrenamiento antes de las 7:00",
    category: "special",
  },
  {
    code: "night_owl",
    icon: "Moon",
    enTitle: "Night Owl",
    frTitle: "Oiseau de Nuit",
    deTitle: "Nachteule",
    esTitle: "Noctámbulo",
    enDescription: "Complete a workout after 10pm",
    frDescription: "Termine un entraînement après 22h",
    deDescription: "Schließ ein Training nach 22 Uhr ab",
    esDescription: "Completa un entrenamiento después de las 22:00",
    category: "special",
  },
  {
    // Worth no XP and no points, deliberately. The research warns that extrinsic rewards can erode
    // the intrinsic kind and must "stay secondary to real progress", while endorsing badges that
    // *materialize* mastery. The trophy has to **be** the progress, never a currency laid on top.
    code: "path_climbed",
    icon: "Mountain",
    enTitle: "Path Climbed",
    frTitle: "Voie gravie",
    deTitle: "Pfad erklommen",
    esTitle: "Senda coronada",
    enDescription: "Own every rung of one path",
    frDescription: "Maîtrise chaque étape d'une voie",
    deDescription: "Meistere jede Stufe eines Pfads",
    esDescription: "Domina cada etapa de una senda",
    category: "special",
  },
  {
    code: "first_outing",
    icon: "Footprints",
    enTitle: "Out the Gate",
    frTitle: "Hors les murs",
    deTitle: "Vor den Toren",
    esTitle: "Fuera de las murallas",
    enDescription: "Finish one outing",
    frDescription: "Termine une sortie",
    deDescription: "Schließ eine Tour ab",
    esDescription: "Termina una salida",
    category: "special",
  },
  {
    code: "hour_outside",
    icon: "TreePine",
    enTitle: "An Hour on the Road",
    frTitle: "Une heure sur la route",
    deTitle: "Eine Stunde unterwegs",
    esTitle: "Una hora en el camino",
    enDescription: "Spend an hour moving in one outing",
    frDescription: "Passe une heure en mouvement sur une seule sortie",
    deDescription: "Sei auf einer Tour eine Stunde in Bewegung",
    esDescription: "Pasa una hora en movimiento en una sola salida",
    category: "special",
  },
  {
    code: "variety_3_quests",
    icon: "Drama",
    enTitle: "Variety Seeker",
    frTitle: "Touche-à-Tout",
    deTitle: "Vielseitig",
    esTitle: "Todoterreno",
    enDescription: "Complete 3 different quests",
    frDescription: "Termine 3 quêtes différentes",
    deDescription: "Schließ 3 verschiedene Quests ab",
    esDescription: "Completa 3 misiones distintas",
    category: "special",
  },
  {
    code: "variety_5_quests",
    icon: "scroll",
    enTitle: "Quest Master",
    frTitle: "Maître des Quêtes",
    deTitle: "Questmeister",
    esTitle: "Maestro de misiones",
    enDescription: "Complete 5 different quests",
    frDescription: "Termine 5 quêtes différentes",
    deDescription: "Schließ 5 verschiedene Quests ab",
    esDescription: "Completa 5 misiones distintas",
    category: "special",
  },
];

export function getAchievementDefinition(code: AchievementCode): AchievementDefinition | undefined {
  return achievementDefinitions.find((a) => a.code === code);
}

// Store unlocked achievements as JSON in userPreferences
const ACHIEVEMENTS_KEY = "unlocked_achievements";

export interface UnlockedAchievement {
  code: AchievementCode;
  unlockedAt: string; // ISO date string
}

export async function getUnlockedAchievements(): Promise<UnlockedAchievement[]> {
  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.key, ACHIEVEMENTS_KEY));

  const row = rows[0];
  if (!row) return [];

  try {
    return JSON.parse(row.value) as UnlockedAchievement[];
  } catch {
    return [];
  }
}

export function unlockAchievement(code: AchievementCode): Promise<boolean> {
  // Read-modify-write on a single JSON blob, so it must run in one transaction: two
  // overlapping calls (e.g. an effect double-invoked, or two save flows in flight at
  // once) would otherwise read the same list and the last write wins, silently dropping
  // whichever unlock was written first.
  return transactionOrFallback(async (tx) => {
    const rows = await tx
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.key, ACHIEVEMENTS_KEY));

    let unlocked: UnlockedAchievement[] = [];
    const stored = rows[0];
    if (stored) {
      try {
        unlocked = JSON.parse(stored.value) as UnlockedAchievement[];
      } catch {
        unlocked = [];
      }
    }

    // Already unlocked
    if (unlocked.some((a) => a.code === code)) {
      return false;
    }

    const newUnlocked: UnlockedAchievement[] = [
      ...unlocked,
      { code, unlockedAt: new Date().toISOString() },
    ];

    if (rows.length > 0) {
      await tx
        .update(userPreferences)
        .set({ value: JSON.stringify(newUnlocked), updatedAt: new Date() })
        .where(eq(userPreferences.key, ACHIEVEMENTS_KEY));
    } else {
      await tx.insert(userPreferences).values({
        key: ACHIEVEMENTS_KEY,
        value: JSON.stringify(newUnlocked),
      });
    }

    return true;
  });
}

export interface AchievementProgress {
  code: AchievementCode;
  definition: AchievementDefinition;
  isUnlocked: boolean;
  unlockedAt: Date | null;
  progress: number; // 0-100
  currentValue: number;
  targetValue: number;
}

export async function getAllAchievementsWithProgress(): Promise<AchievementProgress[]> {
  const unlocked = await getUnlockedAchievements();
  const unlockedMap = new Map(unlocked.map((a) => [a.code, a]));

  // Two totals, on purpose. `getSessionAggregates` counts *training* since 0049, which is what
  // the session and variety milestones are about. The XP milestones are about the number on the
  // hero's own level bar, so they read `getTotalXp` — otherwise a hero who walked to level 12
  // would be shown "0 / 500 XP" beside it.
  const { totalSessions, uniqueQuests } = await getSessionAggregates();
  const totalXp = await getTotalXp();

  // Get streak info
  const streakInfo = await getStreakInfo();
  const bestStreak = streakInfo.best;

  const climbedPaths = await countClimbedPaths();

  // Calculate progress for each achievement
  return achievementDefinitions.map((def) => {
    const unlockedInfo = unlockedMap.get(def.code);
    const isUnlocked = !!unlockedInfo;

    let currentValue = 0;
    let targetValue = 1;

    switch (def.code) {
      case "first_workout":
        currentValue = Math.min(1, totalSessions);
        targetValue = 1;
        break;
      case "sessions_10":
        currentValue = Math.min(10, totalSessions);
        targetValue = 10;
        break;
      case "sessions_25":
        currentValue = Math.min(25, totalSessions);
        targetValue = 25;
        break;
      case "sessions_50":
        currentValue = Math.min(50, totalSessions);
        targetValue = 50;
        break;
      case "sessions_100":
        currentValue = Math.min(100, totalSessions);
        targetValue = 100;
        break;
      case "sessions_250":
        currentValue = Math.min(250, totalSessions);
        targetValue = 250;
        break;
      case "sessions_500":
        currentValue = Math.min(500, totalSessions);
        targetValue = 500;
        break;
      case "streak_3":
        currentValue = Math.min(3, bestStreak);
        targetValue = 3;
        break;
      case "streak_7":
        currentValue = Math.min(7, bestStreak);
        targetValue = 7;
        break;
      case "streak_14":
        currentValue = Math.min(14, bestStreak);
        targetValue = 14;
        break;
      case "streak_30":
        currentValue = Math.min(30, bestStreak);
        targetValue = 30;
        break;
      case "streak_60":
        currentValue = Math.min(60, bestStreak);
        targetValue = 60;
        break;
      case "streak_100":
        currentValue = Math.min(100, bestStreak);
        targetValue = 100;
        break;
      case "xp_100":
        currentValue = Math.min(100, totalXp);
        targetValue = 100;
        break;
      case "xp_500":
        currentValue = Math.min(500, totalXp);
        targetValue = 500;
        break;
      case "xp_1000":
        currentValue = Math.min(1000, totalXp);
        targetValue = 1000;
        break;
      case "xp_5000":
        currentValue = Math.min(5000, totalXp);
        targetValue = 5000;
        break;
      case "xp_10000":
        currentValue = Math.min(10000, totalXp);
        targetValue = 10000;
        break;
      case "variety_3_quests":
        currentValue = Math.min(3, uniqueQuests);
        targetValue = 3;
        break;
      case "variety_5_quests":
        currentValue = Math.min(5, uniqueQuests);
        targetValue = 5;
        break;
      // Derived from the journal rather than from the unlock, so the row shows real progress
      // before it is won — and keeps showing 1/1 afterwards even if the hero detrains.
      case "path_climbed":
        currentValue = Math.min(1, climbedPaths);
        targetValue = 1;
        break;
      // Special achievements - binary (either done or not)
      case "first_outing":
      case "hour_outside":
      case "long_session_30min":
      case "long_session_60min":
      case "early_bird":
      case "night_owl":
        currentValue = isUnlocked ? 1 : 0;
        targetValue = 1;
        break;
    }

    const progress = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;

    return {
      code: def.code,
      definition: def,
      isUnlocked,
      unlockedAt: unlockedInfo ? new Date(unlockedInfo.unlockedAt) : null,
      progress,
      currentValue,
      targetValue,
    };
  });
}

export interface NewAchievementResult {
  code: AchievementCode;
  definition: AchievementDefinition;
}

/**
 * Check for new achievements after completing a session.
 * Returns list of newly unlocked achievements.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Achievement checking requires evaluating multiple conditions per achievement type
export async function checkForNewAchievements(sessionInfo: {
  durationSeconds: number;
  xpEarned: number;
  performedAt: Date;
  questId: number | null;
  /**
   * Which kind of session this was (`completed_sessions.outing`). Null is a workout.
   *
   * Every one of the 25 achievement strings says "workout" / "entraînement", and two of them say
   * it about a duration: an hour of walking unlocked "Iron Will · Complete a 60+ minute workout".
   */
  outing: Locomotion | null;
}): Promise<NewAchievementResult[]> {
  const unlocked = await getUnlockedAchievements();
  const unlockedCodes = new Set(unlocked.map((a) => a.code));
  const newlyUnlocked: NewAchievementResult[] = [];

  // Get current stats. Two totals — see `getAllAchievementsWithProgress` above.
  const { totalSessions, uniqueQuests } = await getSessionAggregates();
  const totalXp = await getTotalXp();

  // Get streak info
  const streakInfo = await getStreakInfo();
  const bestStreak = streakInfo.best;

  // Check session milestones
  const sessionMilestones: { count: number; code: AchievementCode }[] = [
    { count: 1, code: "first_workout" },
    { count: 10, code: "sessions_10" },
    { count: 25, code: "sessions_25" },
    { count: 50, code: "sessions_50" },
    { count: 100, code: "sessions_100" },
    { count: 250, code: "sessions_250" },
    { count: 500, code: "sessions_500" },
  ];

  for (const { count, code } of sessionMilestones) {
    if (totalSessions >= count && !unlockedCodes.has(code)) {
      const def = getAchievementDefinition(code);
      if (def && (await unlockAchievement(code))) {
        newlyUnlocked.push({ code, definition: def });
        unlockedCodes.add(code);
      }
    }
  }

  // Check streak milestones
  const streakMilestones: { count: number; code: AchievementCode }[] = [
    { count: 3, code: "streak_3" },
    { count: 7, code: "streak_7" },
    { count: 14, code: "streak_14" },
    { count: 30, code: "streak_30" },
    { count: 60, code: "streak_60" },
    { count: 100, code: "streak_100" },
  ];

  for (const { count, code } of streakMilestones) {
    if (bestStreak >= count && !unlockedCodes.has(code)) {
      const def = getAchievementDefinition(code);
      if (def && (await unlockAchievement(code))) {
        newlyUnlocked.push({ code, definition: def });
        unlockedCodes.add(code);
      }
    }
  }

  // Check XP milestones
  const xpMilestones: { count: number; code: AchievementCode }[] = [
    { count: 100, code: "xp_100" },
    { count: 500, code: "xp_500" },
    { count: 1000, code: "xp_1000" },
    { count: 5000, code: "xp_5000" },
    { count: 10000, code: "xp_10000" },
  ];

  for (const { count, code } of xpMilestones) {
    if (totalXp >= count && !unlockedCodes.has(code)) {
      const def = getAchievementDefinition(code);
      if (def && (await unlockAchievement(code))) {
        newlyUnlocked.push({ code, definition: def });
        unlockedCodes.add(code);
      }
    }
  }

  // Check variety achievements
  if (uniqueQuests >= 3 && !unlockedCodes.has("variety_3_quests")) {
    const def = getAchievementDefinition("variety_3_quests");
    if (def && (await unlockAchievement("variety_3_quests"))) {
      newlyUnlocked.push({ code: "variety_3_quests", definition: def });
      unlockedCodes.add("variety_3_quests");
    }
  }
  if (uniqueQuests >= 5 && !unlockedCodes.has("variety_5_quests")) {
    const def = getAchievementDefinition("variety_5_quests");
    if (def && (await unlockAchievement("variety_5_quests"))) {
      newlyUnlocked.push({ code: "variety_5_quests", definition: def });
      unlockedCodes.add("variety_5_quests");
    }
  }

  // Check session duration achievements. A walk is not a long workout, and the two badges that
  // depend on this say so in both locales.
  const durationMinutes = sessionInfo.outing === null ? sessionInfo.durationSeconds / 60 : 0;
  if (durationMinutes >= 30 && !unlockedCodes.has("long_session_30min")) {
    const def = getAchievementDefinition("long_session_30min");
    if (def && (await unlockAchievement("long_session_30min"))) {
      newlyUnlocked.push({ code: "long_session_30min", definition: def });
      unlockedCodes.add("long_session_30min");
    }
  }
  if (durationMinutes >= 60 && !unlockedCodes.has("long_session_60min")) {
    const def = getAchievementDefinition("long_session_60min");
    if (def && (await unlockAchievement("long_session_60min"))) {
      newlyUnlocked.push({ code: "long_session_60min", definition: def });
      unlockedCodes.add("long_session_60min");
    }
  }

  // The two a walk can take. `durationSeconds` on an outing is what its trace can prove, which
  // is moving time plus the stops moving time is allowed to hide — the same number the journal
  // shows, so a badge and a row cannot disagree about the same hour.
  if (sessionInfo.outing !== null) {
    for (const [code, seconds] of [
      ["first_outing", 0],
      ["hour_outside", 3600],
    ] as const) {
      if (sessionInfo.durationSeconds < seconds || unlockedCodes.has(code)) continue;
      const def = getAchievementDefinition(code);
      if (def && (await unlockAchievement(code))) {
        newlyUnlocked.push({ code, definition: def });
        unlockedCodes.add(code);
      }
    }
  }

  // Check time-based achievements. Same rule: "Complete a workout before 7am" is about training,
  // and a dawn walk is a different thing worth a different badge.
  const hour = sessionInfo.outing === null ? sessionInfo.performedAt.getHours() : 12;
  if (hour < 7 && !unlockedCodes.has("early_bird")) {
    const def = getAchievementDefinition("early_bird");
    if (def && (await unlockAchievement("early_bird"))) {
      newlyUnlocked.push({ code: "early_bird", definition: def });
    }
  }
  if (hour >= 22 && !unlockedCodes.has("night_owl")) {
    const def = getAchievementDefinition("night_owl");
    if (def && (await unlockAchievement("night_owl"))) {
      newlyUnlocked.push({ code: "night_owl", definition: def });
    }
  }

  // A whole route owned, summit included. Measured over the whole journal rather than the ladder's
  // recency window: what the shelf records is that it happened, and that cannot un-happen.
  if (!unlockedCodes.has("path_climbed") && (await countClimbedPaths()) > 0) {
    const def = getAchievementDefinition("path_climbed");
    if (def && (await unlockAchievement("path_climbed"))) {
      newlyUnlocked.push({ code: "path_climbed", definition: def });
    }
  }

  return newlyUnlocked;
}

/**
 * Get summary stats for achievements
 */
/** @legacy test */
export async function getAchievementStats(): Promise<{
  total: number;
  unlocked: number;
  percentage: number;
}> {
  const unlocked = await getUnlockedAchievements();
  const total = achievementDefinitions.length;

  return {
    total,
    unlocked: unlocked.length,
    percentage: total > 0 ? Math.round((unlocked.length / total) * 100) : 0,
  };
}
