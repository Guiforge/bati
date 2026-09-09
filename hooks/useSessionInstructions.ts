import { useEffect, useState } from "react";

import { type Exercise, listExercises, officialByName } from "@/db/exercises";
import { localizedName } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";

/**
 * What movement the session is on, in the shape a screen renders it.
 *
 * One reader for three states, because "which exercise is this?" was about to be written a
 * second time in `PausedOverlay`, and the first copy (`WarmupView`) resolves a warm-up step by
 * name against the catalogue — a lookup with a rule attached that must not exist twice.
 *
 * Resting is deliberately the same branch as running: `completeExercise` advances
 * `currentExerciseIndex` before handing over to the rest screen, so during a rest this is the
 * movement about to start — which is exactly the one worth reading about.
 */
export type SessionInstruction = {
  imagePath: string;
  name: string;
  description: string;
};

/**
 * A catalogue row in the shape a screen renders it.
 *
 * Exported because the warm-up's "up next" card describes a step this hook does not point at:
 * the hook answers "which movement is the session on", and that card is about the one after.
 */
export function describeExercise(ex: Exercise, language: AppLanguage): SessionInstruction {
  return {
    imagePath: ex.imagePath,
    name: localizedName(ex, language),
    description: language === "fr" ? ex.frDescription : ex.enDescription,
  };
}

export function useSessionInstructions(): SessionInstruction | null {
  const language = useSettingsStore((s) => s.language);
  const status = useSessionStore((s) => s.status);
  const prePauseStatus = useSessionStore((s) => s.prePauseStatus);
  const quest = useSessionStore((s) => s.quest);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const warmupSequence = useSessionStore((s) => s.warmupSequence);
  const warmupIndex = useSessionStore((s) => s.warmupIndex);

  const effective = status === "paused" ? prePauseStatus : status;
  const warmupName = effective === "warmup" ? warmupSequence[warmupIndex]?.exerciseName : undefined;

  const [catalogue, setCatalogue] = useState<Exercise[]>([]);

  useEffect(() => {
    if (!warmupName) return;
    let cancelled = false;
    listExercises()
      .then((all) => {
        if (!cancelled) setCatalogue(all);
      })
      .catch((error) => {
        // The warm-up still runs on the English label from `constants/warmup.ts`; only the
        // description and the art are lost, and the step is thirty seconds long.
        reportError("session.instructions", error);
      });
    return () => {
      cancelled = true;
    };
  }, [warmupName]);

  if (warmupName) {
    const found = officialByName(catalogue, warmupName);
    return found ? describeExercise(found, language) : null;
  }

  const current = quest?.exercises[currentExerciseIndex];
  return current ? describeExercise(current.exercise, language) : null;
}
