import { listPairs, type Pair, replyStanding } from "@/db/pairs";
import { openEnvelope } from "./envelope";
import { decodeInvite, type Invite } from "./invite";
import { bytesOfLink } from "./link";
import { decodeLinkInvite, type LinkInvite, readReply } from "./linkInvite";

export type Received =
  | { kind: "invite"; invite: Invite }
  | { kind: "linkInvite"; invite: LinkInvite }
  | { kind: "reply"; bytes: Uint8Array }
  | { kind: "week"; from: string; summary: string }
  | { kind: "unreadable"; why: string };

/**
 * What a code or a link holds, read and changing nothing. `via` is the door it came through: an
 * invite carrying the pair's secret is accepted from a camera pointed at a screen in the room, and
 * refused from a link, which a chat keeps for ever.
 */
export async function readCode(text: string, via: "link" | "scan"): Promise<Received> {
  const bytes = bytesOfLink(text);
  if (bytes === null) return { kind: "unreadable", why: "This is not a Bati code." };

  const now = Math.floor(Date.now() / 1000);
  const invite = decodeInvite(bytes, now);
  if (invite) {
    return via === "scan"
      ? { kind: "invite", invite }
      : {
          kind: "unreadable",
          why: "This kind of invitation only works face to face, by its code.",
        };
  }

  const linkInvite = decodeLinkInvite(bytes, now);
  if (linkInvite) return { kind: "linkInvite", invite: linkInvite };

  if (readReply(bytes)) {
    const standing = await replyStanding(bytes);
    if (standing === "ok") return { kind: "reply", bytes };
    return {
      kind: "unreadable",
      why:
        standing === "known"
          ? "This companion is already on this phone."
          : "An answer to an invitation this phone no longer holds.",
    };
  }

  return readWeek(bytes, await listPairs());
}

/** A week from a companion: read and shown, and nothing keeps it until lot 1 has a challenge. */
async function readWeek(bytes: Uint8Array, pairs: readonly Pair[]): Promise<Received> {
  for (const pair of pairs) {
    const opened = await openEnvelope(pair.secret, bytes, pair.selfId);
    if (opened.kind === "ok") {
      const hits = opened.state.days.reduce((sum, n) => sum + n, 0);
      return { kind: "week", from: pair.name, summary: `${hits} of ${opened.state.goal} sessions` };
    }
    if (opened.kind === "newerVersion") {
      return { kind: "unreadable", why: "Made by a newer Bati. Update to read it." };
    }
  }
  return { kind: "unreadable", why: "An expired invite, or for a companion not on this phone." };
}
