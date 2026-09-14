import { adventureSteps, adventures, quests } from "../db/schema";
import { createTestDb } from "./helpers/testDb";

/**
 * The villagers' shape cap, applied to the three seeded pools it was never measured on.
 *
 * `villagers.test.ts` refuses a pool that is more than three quarters one sentence shape, because
 * a reader hears rhythm before vocabulary and seven vocabularies built the same way still read as
 * one narrator wearing seven hats. That rule was written for the villagers, measured only on them,
 * and the seeded content had never been counted at all.
 *
 * When it was, on 10 September 2026, the step narratives were 92% two-sentence in both languages:
 * statement, full stop, short order, forty times running. 0057 reshaped eleven of them.
 *
 * Then the same migration did the villagers' bug to the other two pools while fixing this one.
 * Rewriting seventeen quest and adventure descriptions in one sitting put every one of them in
 * the same mould, and the first draft took quests from 62% to 86% and adventures from 38% to
 * 100%, eight rows out of eight. Nothing caught it, because this file only measured the pool the
 * author happened to be thinking about. That is why all three are here, and why a fourth pool of
 * seeded prose belongs here the day it exists.
 *
 * Same cap and the same `sentenceCount` as the villagers, deliberately, so there is one shape
 * rule in this repo rather than two that can drift. A ratchet: tighten it as the pools get more
 * varied, never loosen it to land a batch of copy.
 *
 * Only the templates are checked. `adventure_run_steps` holds no narrative text of its own
 * (`db/schema.ts`), so a hero mid-campaign reads these rows live and a rewrite reaches them at
 * once; there is no copied snapshot to keep in step.
 */
const SHAPE_CAP = 0.75;

/** Same splitter as villagers.test.ts, so the two rules cannot disagree on what a shape is. */
const sentenceCount = (line: string) =>
  line
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .filter(Boolean).length;

describe("seeded copy is not written in one shape", () => {
  const { db, sqlite } = createTestDb();

  afterAll(() => sqlite.close());

  const POOLS = [
    [
      "quest descriptions",
      db.select({ en: quests.enDescription, fr: quests.frDescription }).from(quests).all(),
    ],
    [
      "adventure descriptions",
      db
        .select({ en: adventures.enDescription, fr: adventures.frDescription })
        .from(adventures)
        .all(),
    ],
    [
      "step narratives",
      db
        .select({ en: adventureSteps.enNarrative, fr: adventureSteps.frNarrative })
        .from(adventureSteps)
        .all(),
    ],
  ] as const;

  test.each(POOLS)("%s: there is a pool to measure", (_name, rows) => {
    // A pool that lost its rows would otherwise pass every check below by being empty.
    expect(rows.length).toBeGreaterThan(5);
  });

  test.each(
    POOLS.flatMap(([name, rows]) => [
      [`${name}, en`, rows.map((row) => row.en)] as const,
      [`${name}, fr`, rows.map((row) => row.fr)] as const,
    ]),
  )("%s stays under three quarters one shape", (_label, lines) => {
    const shapes = new Map<number, number>();
    for (const line of lines) {
      if (!line) continue;
      const shape = sentenceCount(line);
      shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
    }

    const total = [...shapes.values()].reduce((sum, n) => sum + n, 0);
    const share = Math.max(...shapes.values()) / total;

    // Compared as a percentage so a failure reports how far over the line the pool is.
    expect(Math.round(share * 100)).toBeLessThanOrEqual(SHAPE_CAP * 100);
  });
});
