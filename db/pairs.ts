import { eq, sql } from "drizzle-orm";
import { batiCrypto } from "@/modules/bati-crypto";
import { fromBase64, hex } from "@/src/multiplayer/envelope";
import { type Invite, SECRET_BYTES } from "@/src/multiplayer/invite";
import { db, schema, transactionOrFallback } from "./client";

const { deletedContent, pairs } = schema;

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

/** Overwrites what it deletes, for a table holding a secret. Off again after: it slows every delete. */
export async function withSecureDelete<T>(work: () => Promise<T>): Promise<T> {
  await db.run(sql`PRAGMA secure_delete = ON`);
  try {
    return await work();
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
      });
      return "paired";
    }),
  );
}

/**
 * One tap, and the secret is gone from this database, its page overwritten, with a tombstone so the
 * hero's other device drops its copy at the next sync rather than bring the pair back (the same one
 * hero content uses, 0074).
 *
 * shortcut: the bytes can outlive this in the WAL until the next checkpoint, and in a backup taken
 * earlier. Fine against a forward-looking unlink; a checkpoint here is the upgrade if that changes.
 */
export async function unlinkPair(id: string): Promise<void> {
  const deletedAt = nowDate();
  await withSecureDelete(() =>
    transactionOrFallback(async (tx) => {
      await tx.delete(pairs).where(eq(pairs.id, id));
      await tx
        .insert(deletedContent)
        .values({ uuid: id, deletedAt })
        .onConflictDoUpdate({ target: deletedContent.uuid, set: { deletedAt } });
    }),
  );
}
