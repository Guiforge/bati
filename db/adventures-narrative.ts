import { and, eq } from "drizzle-orm";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedText } from "@/src/i18n/localized";
import { db, schema } from "./client";

const { adventureRunSteps, adventureRuns, adventureSteps } = schema;

/**
 * Get the narrative for a specific adventure run step.
 */
export async function getAdventureStepNarrative(
  runStepId: number,
  language: AppLanguage = "en",
): Promise<string | null> {
  const result = await db
    .select({
      enNarrative: adventureSteps.enNarrative,
      frNarrative: adventureSteps.frNarrative,
      deNarrative: adventureSteps.deNarrative,
      esNarrative: adventureSteps.esNarrative,
      ruNarrative: adventureSteps.ruNarrative,
      zhNarrative: adventureSteps.zhNarrative,
    })
    .from(adventureRunSteps)
    .innerJoin(adventureRuns, eq(adventureRuns.id, adventureRunSteps.runId))
    .innerJoin(
      adventureSteps,
      and(
        eq(adventureSteps.adventureId, adventureRuns.adventureId),
        eq(adventureSteps.stepIndex, adventureRunSteps.stepIndex),
        // A step the hero's edit changed under a run shows no narrative, not the wrong one.
        eq(adventureSteps.questId, adventureRunSteps.questId),
      ),
    )
    .where(eq(adventureRunSteps.id, runStepId))
    .limit(1);

  const row = result[0];
  if (!row) return null;

  const text = localizedText(row, "narrative", language);
  return text || null;
}

/**
 * Get the outro narrative for a specific adventure run step.
 */
export async function getAdventureStepOutroNarrative(
  runStepId: number,
  language: AppLanguage = "en",
): Promise<string | null> {
  const result = await db
    .select({
      enOutroNarrative: adventureSteps.enOutroNarrative,
      frOutroNarrative: adventureSteps.frOutroNarrative,
      deOutroNarrative: adventureSteps.deOutroNarrative,
      esOutroNarrative: adventureSteps.esOutroNarrative,
      ruOutroNarrative: adventureSteps.ruOutroNarrative,
      zhOutroNarrative: adventureSteps.zhOutroNarrative,
    })
    .from(adventureRunSteps)
    .innerJoin(adventureRuns, eq(adventureRuns.id, adventureRunSteps.runId))
    .innerJoin(
      adventureSteps,
      and(
        eq(adventureSteps.adventureId, adventureRuns.adventureId),
        eq(adventureSteps.stepIndex, adventureRunSteps.stepIndex),
        // A step the hero's edit changed under a run shows no narrative, not the wrong one.
        eq(adventureSteps.questId, adventureRunSteps.questId),
      ),
    )
    .where(eq(adventureRunSteps.id, runStepId))
    .limit(1);

  const row = result[0];
  if (!row) return null;

  const text = localizedText(row, "outroNarrative", language);
  return text || null;
}
