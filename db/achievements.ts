import { eq } from "drizzle-orm";
import { db, schema, transactionOrFallback } from "./client";
import { listCompletedSessions } from "./completed";
import { getStreakInfo } from "./streaks";

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
] as const;

export type AchievementCode = (typeof achievementCodes)[number];

export interface AchievementDefinition {
  code: AchievementCode;
  icon: string;
  enTitle: string;
  frTitle: string;
  enDescription: string;
  frDescription: string;
  category: "sessions" | "streaks" | "xp" | "special";
}

export const achievementDefinitions: AchievementDefinition[] = [
  // Session milestones
  {
    code: "first_workout",
    icon: "🎯",
    enTitle: "First Steps",
    frTitle: "Premiers Pas",
    enDescription: "Complete your first workout",
    frDescription: "Termine ton premier entraînement",
    category: "sessions",
  },
  {
    code: "sessions_10",
    icon: "💪",
    enTitle: "Getting Started",
    frTitle: "Bien Parti",
    enDescription: "Complete 10 workouts",
    frDescription: "Termine 10 entraînements",
    category: "sessions",
  },
  {
    code: "sessions_25",
    icon: "🏃",
    enTitle: "Dedicated",
    frTitle: "Dévoué",
    enDescription: "Complete 25 workouts",
    frDescription: "Termine 25 entraînements",
    category: "sessions",
  },
  {
    code: "sessions_50",
    icon: "🔥",
    enTitle: "On Fire",
    frTitle: "En Feu",
    enDescription: "Complete 50 workouts",
    frDescription: "Termine 50 entraînements",
    category: "sessions",
  },
  {
    code: "sessions_100",
    icon: "⚔️",
    enTitle: "Century Warrior",
    frTitle: "Guerrier Centenaire",
    enDescription: "Complete 100 workouts",
    frDescription: "Termine 100 entraînements",
    category: "sessions",
  },
  {
    code: "sessions_250",
    icon: "🏆",
    enTitle: "Champion",
    frTitle: "Champion",
    enDescription: "Complete 250 workouts",
    frDescription: "Termine 250 entraînements",
    category: "sessions",
  },
  {
    code: "sessions_500",
    icon: "👑",
    enTitle: "Legend",
    frTitle: "Légende",
    enDescription: "Complete 500 workouts",
    frDescription: "Termine 500 entraînements",
    category: "sessions",
  },

  // Streak milestones
  {
    code: "streak_3",
    icon: "🌱",
    enTitle: "Sprouting",
    frTitle: "Bourgeonnement",
    enDescription: "Keep your flame lit for 3 days",
    frDescription: "Garde ta flamme allumée 3 jours",
    category: "streaks",
  },
  {
    code: "streak_7",
    icon: "🌿",
    enTitle: "Weekly Warrior",
    frTitle: "Guerrier Hebdo",
    enDescription: "Keep your flame lit for 7 days",
    frDescription: "Garde ta flamme allumée 7 jours",
    category: "streaks",
  },
  {
    code: "streak_14",
    icon: "🌳",
    enTitle: "Two Week Wonder",
    frTitle: "Merveille de Deux Semaines",
    enDescription: "Keep your flame lit for 14 days",
    frDescription: "Garde ta flamme allumée 14 jours",
    category: "streaks",
  },
  {
    code: "streak_30",
    icon: "🔥",
    enTitle: "Monthly Master",
    frTitle: "Maître Mensuel",
    enDescription: "Keep your flame lit for 30 days",
    frDescription: "Garde ta flamme allumée 30 jours",
    category: "streaks",
  },
  {
    code: "streak_60",
    icon: "⚡",
    enTitle: "Unstoppable",
    frTitle: "Inarrêtable",
    enDescription: "Keep your flame lit for 60 days",
    frDescription: "Garde ta flamme allumée 60 jours",
    category: "streaks",
  },
  {
    code: "streak_100",
    icon: "💫",
    enTitle: "Centurion",
    frTitle: "Centurion",
    enDescription: "Keep your flame lit for 100 days",
    frDescription: "Garde ta flamme allumée 100 jours",
    category: "streaks",
  },

  // XP milestones
  {
    code: "xp_100",
    icon: "✨",
    enTitle: "XP Hunter",
    frTitle: "Chasseur d'XP",
    enDescription: "Earn 100 total XP",
    frDescription: "Gagne 100 XP au total",
    category: "xp",
  },
  {
    code: "xp_500",
    icon: "💎",
    enTitle: "XP Collector",
    frTitle: "Collectionneur d'XP",
    enDescription: "Earn 500 total XP",
    frDescription: "Gagne 500 XP au total",
    category: "xp",
  },
  {
    code: "xp_1000",
    icon: "🏅",
    enTitle: "XP Master",
    frTitle: "Maître de l'XP",
    enDescription: "Earn 1,000 total XP",
    frDescription: "Gagne 1 000 XP au total",
    category: "xp",
  },
  {
    code: "xp_5000",
    icon: "🎖️",
    enTitle: "XP Elite",
    frTitle: "Élite de l'XP",
    enDescription: "Earn 5,000 total XP",
    frDescription: "Gagne 5 000 XP au total",
    category: "xp",
  },
  {
    code: "xp_10000",
    icon: "👑",
    enTitle: "XP Legend",
    frTitle: "Légende de l'XP",
    enDescription: "Earn 10,000 total XP",
    frDescription: "Gagne 10 000 XP au total",
    category: "xp",
  },

  // Special achievements
  {
    code: "long_session_30min",
    icon: "⏱️",
    enTitle: "Endurance",
    frTitle: "Endurance",
    enDescription: "Complete a 30+ minute workout",
    frDescription: "Termine un entraînement de 30+ minutes",
    category: "special",
  },
  {
    code: "long_session_60min",
    icon: "🏋️",
    enTitle: "Iron Will",
    frTitle: "Volonté de Fer",
    enDescription: "Complete a 60+ minute workout",
    frDescription: "Termine un entraînement de 60+ minutes",
    category: "special",
  },
  {
    code: "early_bird",
    icon: "🌅",
    enTitle: "Early Bird",
    frTitle: "Lève-Tôt",
    enDescription: "Complete a workout before 7am",
    frDescription: "Termine un entraînement avant 7h",
    category: "special",
  },
  {
    code: "night_owl",
    icon: "🦉",
    enTitle: "Night Owl",
    frTitle: "Oiseau de Nuit",
    enDescription: "Complete a workout after 10pm",
    frDescription: "Termine un entraînement après 22h",
    category: "special",
  },
  {
    code: "variety_3_quests",
    icon: "🎭",
    enTitle: "Variety Seeker",
    frTitle: "Chercheur de Variété",
    enDescription: "Complete 3 different quests",
    frDescription: "Termine 3 quêtes différentes",
    category: "special",
  },
  {
    code: "variety_5_quests",
    icon: "🎪",
    enTitle: "Quest Master",
    frTitle: "Maître des Quêtes",
    enDescription: "Complete 5 different quests",
    frDescription: "Termine 5 quêtes différentes",
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

  if (rows.length === 0) return [];

  try {
    return JSON.parse(rows[0].value) as UnlockedAchievement[];
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
    if (rows.length > 0) {
      try {
        unlocked = JSON.parse(rows[0].value) as UnlockedAchievement[];
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

  // Get stats for progress calculation
  const sessions = await listCompletedSessions(1000);
  const totalSessions = sessions.length;
  const totalXp = sessions.reduce((sum, s) => sum + s.xpEarned, 0);
  const uniqueQuests = new Set(sessions.filter((s) => s.questId).map((s) => s.questId)).size;

  // Get streak info
  const streakInfo = await getStreakInfo();
  const bestStreak = streakInfo.best;

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
      // Special achievements - binary (either done or not)
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
}): Promise<NewAchievementResult[]> {
  const unlocked = await getUnlockedAchievements();
  const unlockedCodes = new Set(unlocked.map((a) => a.code));
  const newlyUnlocked: NewAchievementResult[] = [];

  // Get current stats
  const sessions = await listCompletedSessions(1000);
  const totalSessions = sessions.length;
  const totalXp = sessions.reduce((sum, s) => sum + s.xpEarned, 0);
  const uniqueQuests = new Set(sessions.filter((s) => s.questId).map((s) => s.questId)).size;

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

  // Check session duration achievements
  const durationMinutes = sessionInfo.durationSeconds / 60;
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

  // Check time-based achievements
  const hour = sessionInfo.performedAt.getHours();
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

  return newlyUnlocked;
}

/**
 * Get summary stats for achievements
 */
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
