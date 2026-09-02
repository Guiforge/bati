import { eq } from "drizzle-orm";
import { createTestDb } from "./helpers/testDb";

/**
 * 0048 made an outing a chapter. Before it, the three expedition quests sat in the gallery with
 * no adventure passing through them, so "Head out" was a shortcut rather than a story. This holds
 * the two things that migration promised and nothing else checks: a route campaign ends on an
 * outing, and the words around that step obey the catalogue's rules (no addressee, no em dash).
 */
describe("an adventure leaves the walls", () => {
  const t = createTestDb();

  afterAll(() => {
    t.close();
  });

  test("a route campaign ends on an expedition step with a story in both languages", async () => {
    const schema = require("../db/schema") as typeof import("../db/schema");
    const { NON_REP_STYLE } = require("../db/workUnits") as typeof import("../db/workUnits");

    const rows = await t.db
      .select({
        adventure: schema.adventures.enTitle,
        kind: schema.adventures.kind,
        stepIndex: schema.adventureSteps.stepIndex,
        style: schema.exercises.style,
        enNarrative: schema.adventureSteps.enNarrative,
        frNarrative: schema.adventureSteps.frNarrative,
        enOutro: schema.adventureSteps.enOutroNarrative,
        frOutro: schema.adventureSteps.frOutroNarrative,
      })
      .from(schema.adventureSteps)
      .innerJoin(schema.adventures, eq(schema.adventures.id, schema.adventureSteps.adventureId))
      .innerJoin(
        schema.questExercises,
        eq(schema.questExercises.questId, schema.adventureSteps.questId),
      )
      .innerJoin(schema.exercises, eq(schema.exercises.id, schema.questExercises.exerciseId))
      .where(eq(schema.exercises.style, NON_REP_STYLE));

    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      // A march does not deal damage, so it can never be a boss campaign's step.
      expect(row.kind).toBe("route");

      const lastIndex = await t.db
        .select({ stepIndex: schema.adventureSteps.stepIndex })
        .from(schema.adventureSteps)
        .innerJoin(schema.adventures, eq(schema.adventures.id, schema.adventureSteps.adventureId))
        .where(eq(schema.adventures.enTitle, row.adventure));
      expect(row.stepIndex).toBe(Math.max(...lastIndex.map((s) => s.stepIndex)));

      for (const text of [row.enNarrative, row.frNarrative, row.enOutro, row.frOutro]) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(text).not.toMatch(/—/);
        // Written in the catalogue's voice, like the outing descriptions 0045 rewrote.
        expect(text).not.toMatch(/\byou\b|\byour\b|\btu\b|\bton\b|\btes\b|\bvous\b|\bvotre\b/i);
      }
    }
  });
});
