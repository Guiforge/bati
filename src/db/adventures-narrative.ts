import { and, eq } from "drizzle-orm";
import { db, schema } from "./client";

const { adventureRunSteps, adventureRuns, adventureSteps } = schema;

/**
 * Get the narrative for a specific adventure run step.
 */
export async function getAdventureStepNarrative(
  runStepId: number,
  language: "en" | "fr" = "en",
): Promise<string | null> {
  const result = await db
    .select({
      enNarrative: adventureSteps.enNarrative,
      frNarrative: adventureSteps.frNarrative,
    })
    .from(adventureRunSteps)
    .innerJoin(adventureRuns, eq(adventureRuns.id, adventureRunSteps.runId))
    .innerJoin(
      adventureSteps,
      and(
        eq(adventureSteps.adventureId, adventureRuns.adventureId),
        eq(adventureSteps.stepIndex, adventureRunSteps.stepIndex),
      ),
    )
    .where(eq(adventureRunSteps.id, runStepId))
    .limit(1);

  const row = result[0];
  if (!row) return null;

  const text = language === "fr" ? row.frNarrative : row.enNarrative;
  return text || null;
}

/**
 * Get the outro narrative for a specific adventure run step.
 */
export async function getAdventureStepOutroNarrative(
  runStepId: number,
  language: "en" | "fr" = "en",
): Promise<string | null> {
  const result = await db
    .select({
      enOutroNarrative: adventureSteps.enOutroNarrative,
      frOutroNarrative: adventureSteps.frOutroNarrative,
    })
    .from(adventureRunSteps)
    .innerJoin(adventureRuns, eq(adventureRuns.id, adventureRunSteps.runId))
    .innerJoin(
      adventureSteps,
      and(
        eq(adventureSteps.adventureId, adventureRuns.adventureId),
        eq(adventureSteps.stepIndex, adventureRunSteps.stepIndex),
      ),
    )
    .where(eq(adventureRunSteps.id, runStepId))
    .limit(1);

  const row = result[0];
  if (!row) return null;

  const text = language === "fr" ? row.frOutroNarrative : row.enOutroNarrative;
  return text || null;
}
