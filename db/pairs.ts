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

async function isFull(): Promise<boolean> {
  return (await listPairs()).length >= MAX_PAIRS;
}

/**
 * Phone A: makes the pair and its secret, under the name the hero gives the other. The row is
 * written before anyone has scanned, because nothing ever comes back to say someone did; an invite
 * nobody took is unlinked like any pair.
 */
export async function createPair(name: string): Promise<Invite | PairingRefusal> {
  if (await isFull()) return "full";
  const now = nowDate();
  const invite: Invite = {
    pairId: await randomHex(16),
    senderId: await randomHex(8),
    madeAt: seconds(now),
    secret: await batiCrypto().randomBytes(SECRET_BYTES),
  };
  await db.insert(pairs).values({
    id: invite.pairId,
    secret: invite.secret,
    name: name.trim(),
    selfId: invite.senderId,
    peerId: null,
    createdAt: now,
    updatedAt: now,
  });
  return invite;
}

/**
 * Phone B: joins the pair of an invite the hero has seen and accepted, under the name they chose.
 * `known` is also what a hero gets scanning their own invite, or one synced from their other phone.
 */
export async function acceptInvite(
  invite: Invite,
  name: string,
): Promise<"paired" | PairingRefusal> {
  const [existing] = await db
    .select({ id: pairs.id })
    .from(pairs)
    .where(eq(pairs.id, invite.pairId));
  if (existing) return "known";
  if (await isFull()) return "full";
  const now = nowDate();
  await db.insert(pairs).values({
    id: invite.pairId,
    secret: invite.secret,
    name: name.trim(),
    selfId: await randomHex(8),
    peerId: invite.senderId,
    createdAt: now,
    updatedAt: now,
  });
  return "paired";
}

/**
 * One tap, and the secret is gone from this database: `secure_delete` so the page does not keep it,
 * and a tombstone so the hero's other device drops its copy at the next sync rather than bring the
 * pair back (the same one hero content uses, 0074).
 *
 * shortcut: the bytes can outlive this in the WAL until the next checkpoint, and in a backup taken
 * earlier. Fine against a forward-looking unlink; a checkpoint here is the upgrade if that changes.
 */
export async function unlinkPair(id: string): Promise<void> {
  await db.run(sql`PRAGMA secure_delete = ON`);
  const deletedAt = nowDate();
  await transactionOrFallback(async (tx) => {
    await tx.delete(pairs).where(eq(pairs.id, id));
    await tx
      .insert(deletedContent)
      .values({ uuid: id, deletedAt })
      .onConflictDoUpdate({ target: deletedContent.uuid, set: { deletedAt } });
  });
}
