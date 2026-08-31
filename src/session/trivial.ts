/**
 * Whether a finished session is short enough that it was probably a mistake.
 *
 * A time-based set records `Math.max(1, elapsedSeconds)` and ends whenever the hero taps done,
 * so starting an expedition and stopping after five seconds writes a real `completed_sessions`
 * row — one that counts toward the streak and toward `weekly_sessions`, the eight-week oath.
 * The hole is not new (a strength quest can be saved after one rep and a run of skips), but an
 * expedition makes it a single accidental tap: go out, change your mind, and the week is
 * credited.
 *
 * This does not try to police intent. It is an offline single-player app; a hero determined to
 * cheat their own oath will, and nothing here should pretend otherwise. What it catches is the
 * accident, and it catches it the way a sports watch does — by asking, because the hero is the
 * only one who knows whether those ninety seconds were the whole outing or a false start.
 *
 * Deliberately about the clock and nothing else. A rule that reasoned about reps would need one
 * definition per style, and two definitions of "did this count" is the drift this codebase
 * already spends a lot of comments avoiding.
 */
export const TRIVIAL_SESSION_SECONDS = 120;

export function isTrivialSession(durationSeconds: number): boolean {
  return durationSeconds < TRIVIAL_SESSION_SECONDS;
}
