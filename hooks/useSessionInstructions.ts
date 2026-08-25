import { useEffect, useState } from "react";

import { type Exercise, listExercises } from "@/db/exercises";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

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

  const describe = (ex: Exercise): SessionInstruction => ({
    imagePath: ex.imagePath,
    name: language === "fr" ? ex.frName : ex.enName,
    description: language === "fr" ? ex.frDescription : ex.enDescription,
  });

  if (warmupName) {
    const found = catalogue.find((e) => e.enName === warmupName);
    return found ? describe(found) : null;
  }

  const current = quest?.exercises[currentExerciseIndex];
  return current ? describe(current.exercise) : null;
}
