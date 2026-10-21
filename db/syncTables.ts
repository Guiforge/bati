/**
 * What device sync does with every table, so that a table added later is a decision and not an accident
 * (`__tests__/db-sync-classification.test.ts` fails on a table that is classed nowhere):
 *
 * - `merged`: copied to the other device by `mergePeer` and read by `compareWithPeer`. `adventures` and
 *   `adventure_steps` are merged for the hero's rows only (0076): the game's are mapped by `enTitle`.
 *   `hero_bosses` (0079) holds the hero's rows only and is merged by uuid like a quest.
 * - `local`: stays on this device. Campaigns and boss fights cannot be replayed from another device; seed content is
 *   the same on both.
 * - `unused`: in the schema and read by no code (the village economy was removed, roadmap 7).
 *
 * A column added to a merged table is carried by the generic column lists (`columnsOf`); a rule that is not
 * "the newer `updatedAt` wins" belongs in `mergeInto` and in `docs/testing/data-rules.md`.
 */
export const TABLE_SYNC = {
  completed_sessions: "merged",
  completed_exercises: "merged",
  gps_points: "merged",
  deleted_sessions: "merged",
  deleted_content: "merged",
  session_photos: "merged",
  exercises: "merged",
  exercise_muscles: "merged",
  quests: "merged",
  quest_exercises: "merged",
  user_preferences: "merged",
  adventures: "merged",
  adventure_steps: "merged",
  hero_bosses: "merged",
  adventure_runs: "local",
  adventure_run_steps: "local",
  boss_fights: "local",
  boss_damage_log: "local",
  resource_inventory: "unused",
  resource_transactions: "unused",
  village_buildings: "unused",
  village_stats: "unused",
} as const satisfies Record<string, "merged" | "local" | "unused">;
