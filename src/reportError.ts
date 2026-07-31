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
export function reportError(context: string, error: unknown): void {
  if (__DEV__) {
    // biome-ignore lint/suspicious/noConsole: the only sink there is until telemetry exists
    console.error(`[${context}]`, error);
  }

  // ponytail: dev console only, because the app ships no telemetry service today. Point this
  //           at one and every silenced failure in the codebase becomes visible at once —
  //           that is the whole reason the calls route through one function.
}
