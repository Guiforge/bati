import { readDuoWeek, recordTheirWeek } from "@/db/duo";
import { answerArrived, listPairs, nameTheirSide, type Pair, replyStanding } from "@/db/pairs";
import { decodeBundle } from "./bundle";
import { KIND_WEEK, openEnvelope } from "./envelope";
import { decodeInvite, type Invite } from "./invite";
import { bytesOfLink } from "./link";
import { decodeLinkInvite, KIND_PAIRING_REPLY, type LinkInvite, readReply } from "./linkInvite";

/** Why a code was turned away: the screen says it in the hero's language (`duo.refused.*`). */
export type Refusal =
  | "notBati"
  | "faceToFaceOnly"
  | "alreadyCompanion"
  | "noInvite"
  | "newer"
  | "unknownPair";

export type Received =
  | { kind: "invite"; invite: Invite }
  | { kind: "linkInvite"; invite: LinkInvite }
  /** A pairing answer for an invitation this phone holds, and the weeks that came with it. */
  | { kind: "reply"; bytes: Uint8Array; weeks: Uint8Array[] }
  | { kind: "weeks"; weeks: Uint8Array[] }
  | { kind: "unreadable"; why: Refusal };

/**
 * What a code or a link holds, read and changing nothing. `via` is the door it came through: an
 * invite carrying the pair's secret is accepted from a camera pointed at a screen in the room, and
 * refused from a link, which a chat keeps for ever.
 */
export async function readCode(text: string, via: "link" | "scan"): Promise<Received> {
  const bytes = bytesOfLink(text);
  if (bytes === null) return { kind: "unreadable", why: "notBati" };

  const now = Math.floor(Date.now() / 1000);
  const invite = decodeInvite(bytes, now);
  if (invite) {
    return via === "scan"
      ? { kind: "invite", invite }
      : { kind: "unreadable", why: "faceToFaceOnly" };
  }

  const linkInvite = decodeLinkInvite(bytes, now);
  if (linkInvite) return { kind: "linkInvite", invite: linkInvite };

  return await readEnvelopes(bytes);
}

/** Weeks and a pairing answer, alone or in a bundle (kind 5). */
async function readEnvelopes(bytes: Uint8Array): Promise<Received> {
  const inside = decodeBundle(bytes) ?? [bytes];
  const weeks = inside.filter((envelope) => envelope[1] === KIND_WEEK);
  const reply = inside.find((envelope) => envelope[1] === KIND_PAIRING_REPLY);
  const standing = reply && readReply(reply) ? await replyStanding(reply) : null;
  if (reply && standing === "ok") return { kind: "reply", bytes: reply, weeks };
  if (weeks.length > 0) return { kind: "weeks", weeks };
  // An answer already taken rides with every send until a week proves it: news only when alone.
  if (standing !== null) {
    return { kind: "unreadable", why: standing === "known" ? "alreadyCompanion" : "noInvite" };
  }
  // A version byte past ours, on anything we could not place: updating Bati will read it.
  return { kind: "unreadable", why: (bytes[0] ?? 0) > 1 ? "newer" : "notBati" };
}

/** What one week from a companion did here: kept, already known, or from a clock ahead of ours. */
export type TakenWeek = {
  pairId: string;
  name: string;
  isoYear: number;
  isoWeek: number;
  hits: number;
  goal: number;
  /** The boss fell for this week, as this phone now reads it (S1). */
  fallen: boolean;
  outcome: "new" | "same" | "ahead";
};

/**
 * F4: a stamp ahead of this clock would win every later merge, so past 14 hours it waits. Fourteen,
 * the widest gap between two time zones, as `duoWeek` allows for the end of a week.
 */
const AHEAD_SECONDS = 14 * 3600;

/**
 * Opens the weeks of a code with the pair whose key fits, and keeps what is news (S4). The first
 * week from a companion also proves they hold the pairing (E3) and names their side on a phone
 * that paired face to face. Returns one line per week, or the reason none could be read.
 */
export async function takeWeeks(
  weeks: readonly Uint8Array[],
  now = new Date(),
): Promise<TakenWeek[] | Refusal> {
  const pairs = await listPairs();
  const taken: TakenWeek[] = [];
  let newer = false;
  for (const bytes of weeks) {
    const opened = await openWithAnyPair(bytes, pairs);
    if (opened === "newer") newer = true;
    else if (opened !== null) taken.push(await takeOne(opened, now));
  }
  if (taken.length > 0) return taken;
  return newer ? "newer" : "unknownPair";
}

type Opened = NonNullable<Exclude<Awaited<ReturnType<typeof openWithAnyPair>>, "newer">>;

async function takeOne({ pair, header, state }: Opened, now: Date): Promise<TakenWeek> {
  const week = { isoYear: header.isoYear, isoWeek: header.isoWeek };
  const ahead = state.stamp > now.getTime() / 1000 + AHEAD_SECONDS;
  const base = {
    pairId: pair.id,
    name: pair.name,
    ...week,
    hits: state.days.filter((n) => n > 0).length,
    goal: state.goal,
  };
  if (ahead) return { ...base, outcome: "ahead", fallen: false };
  const outcome = await recordTheirWeek(pair.id, week, state);
  await answerArrived(pair.id);
  if (pair.peerId === null) await nameTheirSide(pair.id, header.senderId);
  return { ...base, outcome, fallen: (await readDuoWeek(pair, week, now)).result === "fallen" };
}

async function openWithAnyPair(bytes: Uint8Array, pairs: readonly Pair[]) {
  for (const pair of pairs) {
    const opened = await openEnvelope(pair.secret, bytes, pair.selfId);
    if (opened.kind === "ok") return { pair, header: opened.header, state: opened.state };
    if (opened.kind === "newerVersion") return "newer" as const;
  }
  return null;
}
