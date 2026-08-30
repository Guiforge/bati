/**
 * Somewhere for a failure to go when there is nothing useful to show the hero.
 *
 * Plenty of things in this app are allowed to fail quietly — a sound that will not decode, a
 * widget redraw, a notification reschedule — and none of them should ever take a workout down
 * with them. That part was right. What was wrong is that they failed *invisibly*: the catch
 * block was empty, so a failure left no trace anywhere, and the only way to learn that damage
 * had stopped landing or preferences had stopped saving was to notice the symptom weeks later.
 *
 * `context` is what broke, in the app's own words — "session.save", "sound.play" — so a log
 * line says where to look without a stack trace.
 */
/**
 * Where reported failures go beyond the dev console. Injected rather than imported: this module
 * is pulled in by `db/` code and by `src/widget.tsx` (a headless task), and must stay free of
 * imports so requiring it never drags `Platform` or the SQLite client along.
 *
 * `installCrashHandler()` points it at the local error log in `src/crashLog.ts` — which is why
 * failures in the widget task, whose entry point never runs `app/_layout.tsx`, still go only to
 * the dev console.
 */
let sink: ((context: string, error: unknown) => void) | null = null;

export function setErrorSink(fn: (context: string, error: unknown) => void): void {
  sink = fn;
}

export function reportError(context: string, error: unknown): void {
  if (__DEV__) {
    console.error(`[${context}]`, error);
  }

  sink?.(context, error);
}
