import { useTranslation } from "react-i18next";
import { useToast } from "@/components/common/Toast";
import type { Exercise } from "@/db/exercises";
import { putExerciseBack, setExerciseAside } from "@/db/setAside";
import { localizedName } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * The one door to setting an exercise aside or putting it back from a screen: the write, the
 * toast that says what happened and offers it back, and the error report. Every entry point goes
 * through here so none of them forgets a half. Neither function rejects: a failure is reported
 * here and the caller is told, so a screen that already showed the change can take it back.
 */
export function useSetAside() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const { showSuccess } = useToast();

  const putBack = (exercise: { id: number }): Promise<boolean> =>
    putExerciseBack(exercise.id).then(
      () => true,
      (error: unknown) => {
        reportError("setAside.putBack", error);
        return false;
      },
    );

  return {
    /**
     * Resolves true once written, false when the write failed.
     *
     * `onUndone` is required, `null` included, so no screen can forget the toast's "Put back":
     * each one holds its own copy of what is set aside, and an undo it is not told about leaves
     * it showing a state the list no longer holds. `null` means no button at all, for a screen
     * whose own control already puts it back in place (the exercise page).
     */
    setAside(exercise: Exercise, onUndone: (() => void) | null): Promise<boolean> {
      const name = localizedName(exercise, language);
      return setExerciseAside(exercise.id).then(
        () => {
          showSuccess(
            t("setAside.done", { name, defaultValue: `${name} won't be suggested again.` }),
            onUndone
              ? {
                  action: {
                    label: t("setAside.put_back"),
                    onPress: () => {
                      putBack(exercise)
                        .then((ok) => {
                          if (!ok) return;
                          onUndone();
                          showSuccess(t("setAside.back", { name }));
                        })
                        .catch(() => {
                          // Reported by `putBack`, which never rejects.
                        });
                    },
                  },
                }
              : undefined,
          );
          return true;
        },
        (error: unknown) => {
          reportError("setAside.write", error);
          return false;
        },
      );
    },
    /** Resolves false when the write failed. */
    putBack,
  };
}
