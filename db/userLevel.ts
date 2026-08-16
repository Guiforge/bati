import { count, sum } from "drizzle-orm";
import { db, schema } from "./client";
import { shortLivedQuery } from "./queryCache";

const { completedQuest } = schema;

// Level XP thresholds (cumulative)
// Each level requires more XP than the previous
const LEVEL_THRESHOLDS = [
  0, // Level 1: 0 XP
  100, // Level 2: 100 XP
  300, // Level 3: 300 XP
  600, // Level 4: 600 XP
  1000, // Level 5: 1000 XP
  1500, // Level 6: 1500 XP
  2100, // Level 7: 2100 XP
  2800, // Level 8: 2800 XP
  3600, // Level 9: 3600 XP
  4500, // Level 10: 4500 XP
  5500, // Level 11: 5500 XP
  6600, // Level 12: 6600 XP
  7800, // Level 13: 7800 XP
  9100, // Level 14: 9100 XP
  10500, // Level 15: 10500 XP
  12000, // Level 16: 12000 XP
  13600, // Level 17: 13600 XP
  15300, // Level 18: 15300 XP
  17100, // Level 19: 17100 XP
  19000, // Level 20: 19000 XP
  // Beyond 20, each level requires 2000 more XP
];

// Level titles (RPG themed)
const LEVEL_TITLES: Record<number, { en: string; fr: string }> = {
  1: { en: "Apprentice", fr: "Apprenti" },
  2: { en: "Novice", fr: "Novice" },
  3: { en: "Trainee", fr: "Entraîné" },
  4: { en: "Squire", fr: "Écuyer" },
  5: { en: "Warrior", fr: "Guerrier" },
  6: { en: "Fighter", fr: "Combattant" },
  7: { en: "Veteran", fr: "Vétéran" },
  8: { en: "Champion", fr: "Champion" },
  9: { en: "Elite", fr: "Élite" },
  10: { en: "Master", fr: "Maître" },
  11: { en: "Grandmaster", fr: "Grand Maître" },
  12: { en: "Legend", fr: "Légende" },
  13: { en: "Mythic", fr: "Mythique" },
  14: { en: "Titan", fr: "Titan" },
  15: { en: "Demigod", fr: "Demi-dieu" },
  16: { en: "Hero", fr: "Héros" },
  17: { en: "Paragon", fr: "Parangon" },
  18: { en: "Ascended", fr: "Ascendant" },
  19: { en: "Immortal", fr: "Immortel" },
  20: { en: "Divine", fr: "Divin" },
};

export type UserLevelInfo = {
  level: number;
  totalXp: number;
  currentLevelXp: number; // XP progress within current level
  xpToNextLevel: number; // XP needed for next level
  xpProgress: number; // 0-100 percentage progress to next level
  title: { en: string; fr: string };
};

/**
 * Calculate level from total XP
 */
export function calculateLevelFromXp(totalXp: number): number {
  // Check if beyond max threshold level
  const maxLevel = LEVEL_THRESHOLDS.length;
  // Last element of a non-empty module constant; `?? 0` keeps the maths total either way.
  const maxXp = LEVEL_THRESHOLDS[maxLevel - 1] ?? 0;

  if (totalXp >= maxXp) {
    // Beyond level 20, each additional level requires 2000 XP
    const xpBeyond = totalXp - maxXp;
    const additionalLevels = Math.floor(xpBeyond / 2000);
    return maxLevel + additionalLevels;
  }

  // Within threshold array
  for (let i = maxLevel - 1; i >= 0; i--) {
    if (totalXp >= (LEVEL_THRESHOLDS[i] ?? 0)) {
      return i + 1;
    }
  }

  return 1; // Default to level 1
}

/**
 * Get XP threshold for a given level
 */
export function getXpForLevel(level: number): number {
  if (level <= 0) return 0;
  if (level <= LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[level - 1] ?? 0;
  }
  // Beyond threshold array
  const maxXp = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] ?? 0;
  const extraLevels = level - LEVEL_THRESHOLDS.length;
  return maxXp + extraLevels * 2000;
}

/**
 * Get title for a given level
 */
export function getLevelTitle(level: number): { en: string; fr: string } {
  // LEVEL_TITLES is keyed 1..20 and both branches stay inside it; the index signature does not
  // know that, so both fall back to the same level-1 title the guard above returns.
  const first = LEVEL_TITLES[1] ?? { en: "Novice", fr: "Novice" };
  if (level <= 0) return first;
  if (level <= 20) return LEVEL_TITLES[level] ?? first;
  // Beyond 20, use "Divine" with level number
  return { en: `Divine ${level}`, fr: `Divin ${level}` };
}

/**
 * Get the user's total XP from all completed sessions
 */
export async function getTotalXp(): Promise<number> {
  const result = await db.select({ total: sum(completedQuest.xpEarned) }).from(completedQuest);

  return Number(result[0]?.total ?? 0);
}

/**
 * Get comprehensive user level info
 */
export function getUserLevelInfo(): Promise<UserLevelInfo> {
  // Home asks for this twice per focus (header + village teaser), the journal once more.
  return shortLivedQuery("userLevelInfo", computeUserLevelInfo);
}

async function computeUserLevelInfo(): Promise<UserLevelInfo> {
  const totalXp = await getTotalXp();
  const level = calculateLevelFromXp(totalXp);
  const currentLevelStart = getXpForLevel(level);
  const nextLevelStart = getXpForLevel(level + 1);

  const currentLevelXp = totalXp - currentLevelStart;
  const xpToNextLevel = nextLevelStart - totalXp;
  const xpProgress =
    nextLevelStart > currentLevelStart
      ? Math.min(100, (currentLevelXp / (nextLevelStart - currentLevelStart)) * 100)
      : 100;

  return {
    level,
    totalXp,
    currentLevelXp,
    xpToNextLevel,
    xpProgress,
    title: getLevelTitle(level),
  };
}

/**
 * Get total session count and total time
 */
export async function getTotalStats(): Promise<{
  totalSessions: number;
  totalSeconds: number;
  totalXp: number;
}> {
  // One aggregate query — this used to SELECT * over the whole table on every Home focus
  // and reduce in JS.
  const [row] = await db
    .select({
      totalSessions: count(),
      totalSeconds: sum(completedQuest.durationSeconds),
      totalXp: sum(completedQuest.xpEarned),
    })
    .from(completedQuest);

  return {
    totalSessions: Number(row?.totalSessions ?? 0),
    totalSeconds: Number(row?.totalSeconds ?? 0),
    totalXp: Number(row?.totalXp ?? 0),
  };
}
