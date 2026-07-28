/**
 * The dynamic warm-up played before the first exercise of a session.
 *
 * The warm-up is the one part of a session with real evidence behind it for injury risk, and the
 * app claimed one for a long time without running it: the 3-second countdown told the hero
 * "warm-up done". Now it runs one.
 *
 * Two minutes, not the five to ten the literature describes: a five-minute warm-up in front of a
 * twelve-minute quest is a warm-up nobody does twice. Movements are drawn from the seeded
 * catalogue by name, so they arrive with their own bilingual labels and art and there is no
 * second kind of content to maintain — and they are dynamic rather than static holds, which is
 * what the evidence actually supports before effort.
 *
 * Nothing here is journaled: no results, no volume, no personal records, no boss damage. A
 * warm-up is preparation, not work.
 */
export type WarmupStep = {
  /** Matches `Exercise.enName` in the seeded catalogue. */
  exerciseName: string;
  seconds: number;
};

export const WARMUP_SEQUENCE: WarmupStep[] = [
  { exerciseName: "Thunder Jumping Jack", seconds: 30 }, // raise temperature and heart rate
  { exerciseName: "Glute Bridge", seconds: 30 }, // wake the hips before anything loads them
  { exerciseName: "Bear Crawl", seconds: 30 }, // shoulders, core, coordination
  { exerciseName: "Druid's Cobra Stretch", seconds: 30 }, // open the front, extend the spine
];

export const WARMUP_TOTAL_SECONDS = WARMUP_SEQUENCE.reduce((sum, step) => sum + step.seconds, 0);
