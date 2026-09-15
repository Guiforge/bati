import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { getChangeVersion } from "@/db/changeVersion";
import { reportError } from "@/src/reportError";

/**
 * Run `load` when the screen gains focus, but only if the database or the day moved since it last
 * succeeded.
 *
 * Home had six focus effects that re-read everything on every return to the tab, 51 queries
 * whether anything had changed or not (perf audit, 2026-09-15). A new `load` (its language, its
 * `t`) always runs, and so does one whose last attempt failed or was cut short by a blur: the
 * version is only recorded once a load resolves, so a transient failure heals on the next look.
 *
 * `load` receives `isCancelled`, true once the screen has lost focus again.
 */
export function useReloadOnChange(
  context: string,
  load: (isCancelled: () => boolean) => Promise<unknown>,
): void {
  const done = useRef<{ version: string; load: typeof load } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const isCancelled = () => cancelled;

      getChangeVersion()
        .then(async (version) => {
          const last = done.current;
          if (cancelled || (last?.version === version && last.load === load)) return;
          await load(isCancelled);
          if (!cancelled) done.current = { version, load };
        })
        .catch((error: unknown) => reportError(context, error));

      return () => {
        cancelled = true;
      };
    }, [context, load]),
  );
}
