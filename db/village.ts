import { eq, isNotNull } from "drizzle-orm";
import { db, schema } from "./client";
import { getMuscleBalance } from "./muscleBalance";
import type { MuscleCode } from "./schema";
import { getStreakInfo } from "./streaks";
import { getUserLevelInfo } from "./userLevel";

const { bossFights, adventures } = schema;

export type VillageTier = 1 | 2 | 3 | 4 | 5;

// Level buckets for the 5 illustrated tiers (hameau -> village -> bourg -> cité -> cité florissante).
// Derived from the existing 20-level curve in db/userLevel.ts; no separate threshold table.
const TIER_LEVEL_FLOORS: Record<VillageTier, number> = {
  1: 1,
  2: 5,
  3: 10,
  4: 15,
  5: 20,
};

export function getVillageTier(level: number): VillageTier {
  let tier: VillageTier = 1;
  for (const [tierStr, floor] of Object.entries(TIER_LEVEL_FLOORS)) {
    if (level >= floor) tier = Number(tierStr) as VillageTier;
  }
  return tier;
}

export type FlameLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Matches the flame table in docs/gameplay/progression.md.
export function getFlameLevel(streakDays: number): FlameLevel {
  if (streakDays >= 100) return 5;
  if (streakDays >= 30) return 4;
  if (streakDays >= 14) return 3;
  if (streakDays >= 7) return 2;
  if (streakDays >= 3) return 1;
  return 0;
}

export type BossBanner = {
  adventureId: number;
  enTitle: string;
  frTitle: string;
  defeatedAt: Date;
};

export async function getBossBanners(): Promise<BossBanner[]> {
  const rows = await db
    .select({
      adventureId: bossFights.adventureId,
      enTitle: adventures.enTitle,
      frTitle: adventures.frTitle,
      defeatedAt: bossFights.defeatedAt,
    })
    .from(bossFights)
    .innerJoin(adventures, eq(bossFights.adventureId, adventures.id))
    .where(isNotNull(bossFights.defeatedAt));

  return rows
    .filter((row): row is typeof row & { defeatedAt: Date } => row.defeatedAt !== null)
    .map((row) => ({
      adventureId: row.adventureId,
      enTitle: row.enTitle,
      frTitle: row.frTitle,
      defeatedAt: row.defeatedAt,
    }));
}

export type DominantSportOverlay = {
  muscle: MuscleCode;
  percentage: number;
} | null;

export async function getDominantSportOverlay(): Promise<DominantSportOverlay> {
  const balance = await getMuscleBalance("7d");
  if (balance.totalVolume === 0) return null;

  const top = [...balance.muscles].sort((a, b) => b.percentage - a.percentage)[0];
  if (!top || top.percentage === 0) return null;

  return { muscle: top.muscle, percentage: top.percentage };
}

export type VillageScene = {
  tier: VillageTier;
  level: number;
  flame: FlameLevel;
  dominantSport: DominantSportOverlay;
  bossBanners: BossBanner[];
};

/**
 * Everything the village scene needs, in one call. Pure aggregation over
 * existing derived sources (level, streak, muscle balance, boss fights) —
 * no village-specific table.
 */
export async function getVillageScene(): Promise<VillageScene> {
  const [levelInfo, streak, dominantSport, bossBanners] = await Promise.all([
    getUserLevelInfo(),
    getStreakInfo(),
    getDominantSportOverlay(),
    getBossBanners(),
  ]);

  return {
    tier: getVillageTier(levelInfo.level),
    level: levelInfo.level,
    flame: getFlameLevel(streak.current),
    dominantSport,
    bossBanners,
  };
}
