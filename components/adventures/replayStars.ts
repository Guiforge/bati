/**
 * "★", "★★", "★★★", then "★ ×n" — how many times a campaign was completed.
 * Gold stars are the replay marker; the flame stays reserved for the streak.
 */
export function starsFor(finishedCount: number): string | null {
  if (finishedCount <= 0) return null;
  if (finishedCount <= 3) return "★".repeat(finishedCount);
  return `★ ×${finishedCount}`;
}
