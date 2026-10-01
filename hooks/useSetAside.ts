import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { useToast } from "@/components/common/Toast";
import type { Exercise } from "@/db/exercises";
import { otherJumps, putExerciseBack, setExerciseAside } from "@/db/setAside";
import { localizedName } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * The one door to setting an exercise aside or putting it back from a screen: the write, the
 * offer to set the other jumps aside with it, the toast that says where to undo it, and the error
 * report. Every entry point goes through here so none of them forgets a half. Neither function
 * rejects: a failure is reported here and the caller carries on.
 */
export function useSetAside() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const { showSuccess } = useToast();

  /** "Set aside the other jumps too?", answered. Resolves false on a dismiss. */
  const askAboutJumps = (others: Exercise[]): Promise<boolean> =>
    new Promise((resolve) => {
      Alert.alert(
        t("setAside.also_jumps_title"),
        others.map((e) => localizedName(e, language)).join(", "),
        [
          { text: t("setAside.also_jumps_no"), style: "cancel", onPress: () => resolve(false) },
          { text: t("setAside.also_jumps_yes"), onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });

  return {
    /** Resolves with the `enName`s set aside, so a running warm-up can drop every one of them. */
    setAside(exercise: Exercise): Promise<ReadonlySet<string>> {
      return setAsideWithJumps(exercise, askAboutJumps).then(
        (done) => {
          const name = localizedName(exercise, language);
          showSuccess(
            done.size > 1
              ? t("setAside.done_many", { n: done.size })
              : t("setAside.done", {
                  name,
                  defaultValue: `${name} is set aside. Put it back from Settings.`,
                }),
          );
          return done;
        },
        (error: unknown) => {
          reportError("setAside.write", error);
          return new Set<string>();
        },
      );
    },
    putBack(exercise: { id: number }): Promise<void> {
      return putExerciseBack(exercise.id).catch((error: unknown) =>
        reportError("setAside.putBack", error),
      );
    },
  };
}

/**
 * The writes, outside the hook: the React Compiler cannot lower a conditional inside a `try`,
 * and skipped the whole hook over it.
 */
async function setAsideWithJumps(
  exercise: Exercise,
  askAboutJumps: (others: Exercise[]) => Promise<boolean>,
): Promise<Set<string>> {
  await setExerciseAside(exercise.id);
  const done = new Set([exercise.enName]);

  const others = await otherJumps(exercise);
  if (others.length > 0 && (await askAboutJumps(others))) {
    for (const other of others) {
      await setExerciseAside(other.id);
      done.add(other.enName);
    }
  }
  return done;
}
