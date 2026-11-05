import { and, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { batiCrypto } from "@/modules/bati-crypto";
import { fromBase64, hex } from "@/src/multiplayer/envelope";
import { INVITE_DAYS, type Invite, SECRET_BYTES } from "@/src/multiplayer/invite";
import {
  derivePairKey,
  inviteIsLive,
  type LinkInvite,
  newKeyPair,
  publicKeyOf,
  readReply,
  replyOpens,
  sealReply,
} from "@/src/multiplayer/linkInvite";
import { reportError } from "@/src/reportError";
import { db, schema, transactionOrFallback, withIsolatedConnection } from "./client";
import { frozenGoal } from "./duo";

const { deletedContent, duoWeeks, pairInvites, pairs } = schema;

/** `COMPANION_WORDS_GONE`, as Drizzle writes it: what an unlinked companion said of their weeks. */
const GONE = { stamp: null, goal: null, paused: null, days: null };

/** At most this many companions: a duo game, and a bound on what one hero's phone carries. */
export const MAX_PAIRS = 5;

export type Pair = typeof pairs.$inferSelect;

export type PairingRefusal = "full" | "known";

/** Random ids, not uuid v7: these travel in clear, and a v7 would tell when the pair was made. */
const randomHex = async (length: number) => hex(fromBase64(await batiCrypto().randomBytes(length)));

const nowDate = () => new Date();
const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

export function listPairs(): Promise<Pair[]> {
  return db.select().from(pairs).orderBy(pairs.createdAt);
}

/**
 * A failed query's message holds its params, and here the params hold the secret: through
 * `reportError` it would reach the feedback mail. Only SQLite's own sentence survives, which names
 * a column and no value.
 */
function withoutParams<T>(write: () => Promise<T>): Promise<T> {
  return write().catch((error: unknown) => {
    const cause = (error as { cause?: { message?: unknown } }).cause?.message;
    throw new Error(`Writing a pair failed: ${typeof cause === "string" ? cause : "unknown"}`);
  });
}

/**
 * Moves what was deleted out of the main file. On its own connection: on the app's, Drizzle's open
 * statements make a checkpoint fail, on a phone and not under jest. Never a reason to fail the write
 * it follows, which is already done.
 *
 * TRUNCATE empties the log too, now that Drizzle's statements are finalised once read
 * (`db/releasingStatements.ts`): measured on a release build on 05/11, the deleted key was in neither
 * file afterwards and the log was 0 bytes. A reader left open elsewhere would make it a passive
 * checkpoint again, without error: the bytes would then wait for SQLite to reuse their pages.
 */
async function flushLog(): Promise<void> {
  try {
    await withIsolatedConnection((conn) => conn.getFirstAsync("PRAGMA wal_checkpoint(TRUNCATE)"));
  } catch (error) {
    reportError("pairs.checkpoint", error);
  }
}

/** Overwrites what it deletes, for a table holding a secret. Off again after: it slows every delete. */
export async function withSecureDelete<T>(work: () => Promise<T>): Promise<T> {
  await db.run(sql`PRAGMA secure_delete = ON`);
  try {
    const result = await work();
    await flushLog();
    return result;
  } finally {
    await db.run(sql`PRAGMA secure_delete = OFF`);
  }
}

/**
 * Phone A: makes the pair and its secret, under the name the hero gives the other. The row is
 * written before anyone has scanned, because nothing ever comes back to say someone did; an invite
 * nobody took is unlinked like any pair.
 */
export async function createPair(name: string): Promise<Invite | PairingRefusal> {
  const now = nowDate();
  const goal = await frozenGoal();
  const invite: Invite = {
    pairId: await randomHex(16),
    senderId: await randomHex(8),
    madeAt: seconds(now),
    secret: await batiCrypto().randomBytes(SECRET_BYTES),
  };
  return withoutParams(() =>
    transactionOrFallback(async (tx) => {
      if ((await tx.select({ id: pairs.id }).from(pairs)).length >= MAX_PAIRS) return "full";
      await tx.insert(pairs).values({
        id: invite.pairId,
        secret: invite.secret,
        name: name.trim(),
        selfId: invite.senderId,
        peerId: null,
        createdAt: now,
        updatedAt: now,
        goal,
      });
      return invite;
    }),
  );
}

/**
 * Phone B: joins the pair of an invite the hero has seen and accepted, under the name they chose.
 * `known` is also what a hero gets scanning their own invite, or one synced from their other phone.
 */
export async function acceptInvite(
  invite: Invite,
  name: string,
): Promise<"paired" | PairingRefusal> {
  const now = nowDate();
  const goal = await frozenGoal();
  const selfId = await randomHex(8);
  return withoutParams(() =>
    transactionOrFallback(async (tx) => {
      const held = await tx.select({ id: pairs.id }).from(pairs);
      if (held.some((pair) => pair.id === invite.pairId)) return "known";
      if (held.length >= MAX_PAIRS) return "full";
      await tx.insert(pairs).values({
        id: invite.pairId,
        secret: invite.secret,
        name: name.trim(),
        selfId,
        peerId: invite.senderId,
        createdAt: now,
        updatedAt: now,
        goal,
      });
      return "paired";
    }),
  );
}

/**
 * Phone A, by link: a key pair and no pair yet. The private half waits here for the answer, and no
 * secret exists until one comes. Refused past `MAX_PAIRS` waiting: a bound on keys kept for nothing.
 */
export async function createLinkInvite(): Promise<LinkInvite | "full"> {
  const now = nowDate();
  const keys = await newKeyPair();
  const invite: LinkInvite = {
    pairId: await randomHex(16),
    senderId: await randomHex(8),
    madeAt: seconds(now),
    publicKey: keys.publicKey,
  };
  return withoutParams(() =>
    transactionOrFallback(async (tx) => {
      if ((await tx.select({ id: pairInvites.id }).from(pairInvites)).length >= MAX_PAIRS) {
        return "full";
      }
      await tx.insert(pairInvites).values({
        id: invite.pairId,
        privateKey: keys.secret,
        selfId: invite.senderId,
        madeAt: now,
      });
      return invite;
    }),
  );
}

/**
 * Phone B, by link: derives the pair's key, writes the pair, and returns the answer to send back.
 * `known` covers a hero opening their own invitation, and `refused` a public key that yields no
 * shared secret. The answer is kept on the pair (`reply`, 0085) and rides with the hero's sends until a
 * week from A proves A has it (`answerArrived`).
 */
export async function acceptLinkInvite(
  invite: LinkInvite,
  name: string,
): Promise<Uint8Array | PairingRefusal | "refused"> {
  const now = nowDate();
  const goal = await frozenGoal();
  const keys = await newKeyPair();
  const selfId = await randomHex(8);
  const secret = derivePairKey(keys.secret, invite.publicKey, {
    pairId: invite.pairId,
    inviterPublic: invite.publicKey,
    joinerPublic: keys.publicKey,
  });
  if (secret === null) return "refused";
  const answer = await sealReply(
    secret,
    { pairId: invite.pairId, senderId: selfId, publicKey: keys.publicKey },
    seconds(now),
  );
  return withoutParams(() =>
    transactionOrFallback(async (tx) => {
      const held = await tx.select({ id: pairs.id }).from(pairs);
      const waiting = await tx
        .select({ id: pairInvites.id })
        .from(pairInvites)
        .where(eq(pairInvites.id, invite.pairId));
      if (waiting.length > 0 || held.some((pair) => pair.id === invite.pairId)) return "known";
      if (held.length >= MAX_PAIRS) return "full";
      await tx.insert(pairs).values({
        id: invite.pairId,
        secret,
        name: name.trim(),
        selfId,
        peerId: invite.senderId,
        createdAt: now,
        updatedAt: now,
        goal,
        reply: answer,
      });
      return answer;
    }),
  );
}

type OpenedReply = {
  reply: NonNullable<ReturnType<typeof readReply>>;
  selfId: string;
  secret: string;
};

/** The waiting invite an answer belongs to and the key both sides now hold, if the answer proves it. */
async function openReply(bytes: Uint8Array): Promise<OpenedReply | "known" | "refused"> {
  const reply = readReply(bytes);
  if (reply === null) return "refused";
  const [invite] = await db.select().from(pairInvites).where(eq(pairInvites.id, reply.pairId));
  if (!invite) {
    const held = await db.select({ id: pairs.id }).from(pairs).where(eq(pairs.id, reply.pairId));
    return held.length > 0 ? "known" : "refused";
  }
  if (!inviteIsLive(seconds(invite.madeAt), seconds(nowDate()))) return "refused";
  const secret = derivePairKey(invite.privateKey, reply.publicKey, {
    pairId: reply.pairId,
    inviterPublic: publicKeyOf(invite.privateKey),
    joinerPublic: reply.publicKey,
  });
  if (secret === null || !(await replyOpens(secret, bytes))) return "refused";
  return { reply, selfId: invite.selfId, secret };
}

/** What an answer would do, writing nothing: the hero is asked before anything changes. */
export async function replyStanding(bytes: Uint8Array): Promise<"ok" | "known" | "refused"> {
  const opened = await withoutParams(() => openReply(bytes));
  return typeof opened === "string" ? opened : "ok";
}

/**
 * Phone A: the answer came, proved itself, and the hero named the other. The pair is written and the
 * private key is overwritten in one step. A second answer to the same invitation finds no key, so
 * the first to arrive holds the pair.
 */
export function completeLinkInvite(
  bytes: Uint8Array,
  name: string,
): Promise<"paired" | PairingRefusal | "refused"> {
  const now = nowDate();
  return withoutParams(async () => {
    const opened = await openReply(bytes);
    if (typeof opened === "string") return opened;
    const { reply, selfId, secret } = opened;
    return withSecureDelete(() =>
      transactionOrFallback(async (tx) => {
        const held = await tx.select({ id: pairs.id }).from(pairs);
        if (held.length >= MAX_PAIRS) return "full";
        await tx.insert(pairs).values({
          id: reply.pairId,
          secret,
          name: name.trim(),
          selfId,
          peerId: reply.senderId,
          createdAt: now,
          updatedAt: now,
          goal: await frozenGoal(),
        });
        await tx.delete(pairInvites).where(eq(pairInvites.id, reply.pairId));
        return "paired";
      }),
    );
  });
}

/** Seven days on, the private key of an unanswered invitation is overwritten, whatever else happens. */
export async function sweepExpiredInvites(now = nowDate()): Promise<void> {
  const before = new Date(now.getTime() - INVITE_DAYS * 86_400_000);
  const expired = lt(pairInvites.madeAt, before);
  const waiting = await db.select({ id: pairInvites.id }).from(pairInvites).where(expired);
  if (waiting.length === 0) return;
  await withSecureDelete(() => db.delete(pairInvites).where(expired));
}

/**
 * One tap, and the secret is gone from this database's tables and main file (`flushLog` says what the
 * log keeps), with a tombstone so the
 * hero's other device drops its copy at the next sync rather than bring the pair back (the same one
 * hero content uses, 0074).
 *
 * shortcut: the bytes can outlive this in a backup taken earlier. Fine against a forward-looking
 * unlink; nothing here can reach a file already handed to someone.
 */
export async function unlinkPair(id: string): Promise<void> {
  const deletedAt = nowDate();
  await withSecureDelete(() =>
    transactionOrFallback(async (tx) => {
      await tx.delete(pairs).where(eq(pairs.id, id));
      await tx.update(duoWeeks).set(GONE).where(eq(duoWeeks.pairId, id));
      await tx
        .insert(deletedContent)
        .values({ uuid: id, deletedAt })
        .onConflictDoUpdate({ target: deletedContent.uuid, set: { deletedAt } });
    }),
  );
}

/** E3: a week from A has arrived, so A holds the answer, and B's sends stop carrying it. */
export async function answerArrived(pairId: string): Promise<void> {
  await db
    .update(pairs)
    .set({ reply: null, updatedAt: nowDate() })
    .where(and(eq(pairs.id, pairId), isNotNull(pairs.reply)));
}

/** Phone A after a face-to-face pairing: the first week from B names B's id in the pair. */
export async function nameTheirSide(pairId: string, peerId: string): Promise<void> {
  await db
    .update(pairs)
    .set({ peerId, updatedAt: nowDate() })
    .where(and(eq(pairs.id, pairId), isNull(pairs.peerId)));
}

/** The link invitations waiting for an answer on this phone, oldest first: when each was made. */
export function listInvites(): Promise<{ id: string; madeAt: Date }[]> {
  return db
    .select({ id: pairInvites.id, madeAt: pairInvites.madeAt })
    .from(pairInvites)
    .orderBy(pairInvites.madeAt);
}

/** "Annuler": the private key of a waiting invitation is overwritten; an answer finds nothing. */
export async function cancelInvite(id: string): Promise<void> {
  await withSecureDelete(() => db.delete(pairInvites).where(eq(pairInvites.id, id)));
}
