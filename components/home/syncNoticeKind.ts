import type { SyncFailure } from "@/src/cloudSync";
import type { LastMerge } from "@/src/deviceSync";

/** Failing for this long, sync stops being a detail of Settings and says so on Home. */
const FAILING_FOR_MS = 3 * 24 * 60 * 60 * 1000;

export type SyncNoticeKind = "lost" | "waiting" | "failing" | "merged";

/**
 * Which sync card is due, the most serious first. One source: `SyncCard` draws from it and
 * `NoticeSlot` asks it whether sync has anything to say before it gives the slot away.
 */
export function syncNoticeKind(input: {
  lost: string | null;
  waitingPassword: boolean;
  failure: SyncFailure | null;
  failingSince: number | null;
  merge: Pick<LastMerge, "seen"> | null;
  now: number;
}): SyncNoticeKind | null {
  if (input.lost !== null) return "lost";
  if (input.waitingPassword) return "waiting";
  if (
    input.failure &&
    input.failingSince !== null &&
    input.now - input.failingSince > FAILING_FOR_MS
  ) {
    return "failing";
  }
  if (input.merge !== null && !input.merge.seen) return "merged";
  return null;
}
