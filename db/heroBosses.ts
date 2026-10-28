import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { type BossAssetKey, getBossKey } from "@/constants/assetMap";
import { invalidateAdventures } from "./adventures";
import {
  type BossArt,
  bossArtJson,
  bossLinesJson,
  cleanBossArt,
  clip,
  type HeroBossLines,
  MAX_BOSS_NAME,
  noBossLines,
  parseBossArt,
  parseBossLines,
} from "./bossVoice";
import { db, schema, type TransactionTx, transactionOrFallback } from "./client";
import { nextEditStamp } from "./completed";
import { writeContentTombstone } from "./contentTombstone";
import { monsterOf } from "./heroAdventures";
import type { MuscleCode } from "./schema";
import { uuidv7 } from "./uuid";

/**
 * The hero's bosses (0079): the fourth thing a hero creates, beside exercises, quests and
 * adventures. A row of `hero_bosses` is a name, a painted monster its pictures fall back to, a
 * photo for each form the hero cares to give, a weakness and a resistance of their choosing, and
 * the lines it speaks. An adventure ends on one by uuid (`adventures.heroBossUuid`); the fight
 * reads it at fight time (`db/bossFights.ts`), so editing a boss changes every adventure that
 * ends on it, and no combat number lives here (HP stays derived from the steps).
 *
 * The one writer: nothing else inserts or updates `hero_bosses` except `importAdventure`, through
 * `createHeroBoss`, and the merge in `db/merge.ts`.
 */
const { adventures, heroBosses } = schema;

type Exec = typeof db | TransactionTx;

export type HeroBoss = {
  id: number;
  uuid: string;
  /** Empty: the painted monster's own name shows. */
  name: string;
  /** The painted monster (as `adventures.bossImagePath` writes it), and its key when this build ships it. */
  monster: string;
  monsterKey: BossAssetKey | null;
  weakness: MuscleCode | null;
  resistance: MuscleCode | null;
  lines: HeroBossLines;
  art: BossArt;
  updatedAt: Date | null;
};

/** What the boss editor and the file import hand the writer. */
export type HeroBossDraft = {
  name: string;
  monster: BossAssetKey;
  weakness: MuscleCode | null;
  resistance: MuscleCode | null;
  lines: HeroBossLines;
  art: BossArt;
};

export const emptyHeroBossDraft = (monster: BossAssetKey): HeroBossDraft => ({
  name: "",
  monster,
  weakness: null,
  resistance: null,
  lines: noBossLines(),
  art: {},
});

type BossUser = {
  enTitle: string;
  frTitle: string;
  deTitle: string;
  esTitle: string;
  ruTitle: string;
};

/** Thrown when a boss is deleted while an adventure still ends on it, as for a quest. */
export class HeroBossInUseError extends Error {
  /** The adventures that still end on it, for the editor to name. */
  readonly using: BossUser[];
  constructor(using: BossUser[] = []) {
    super("A boss an adventure ends on cannot be deleted");
    this.using = using;
    this.name = "HeroBossInUseError";
  }
}

type Row = typeof heroBosses.$inferSelect;

export function toHeroBoss(row: Row): HeroBoss {
  return {
    id: row.id,
    uuid: row.uuid,
    name: row.name,
    monster: row.monster,
    monsterKey: getBossKey(row.monster),
    weakness: row.weaknessMuscle,
    resistance: row.resistanceMuscle,
    lines: parseBossLines(row.linesJson),
    art: parseBossArt(row.artJson),
    updatedAt: row.updatedAt,
  };
}

/**
 * Newest first: the Forge shows the last three. Lists show the normal picture only, so only that one
 * leaves SQLite (`art.fresh`); the other three forms come with `getHeroBoss`, and the fight reads
 * its own (`getBossArt`). Ten bosses with four photos each were 40 photos per Forge focus.
 */
export async function listHeroBosses(): Promise<HeroBoss[]> {
  const { artJson: _all, ...rest } = getTableColumns(heroBosses);
  const rows = await db
    .select({ ...rest, fresh: sql<string | null>`json_extract(${heroBosses.artJson}, '$.fresh')` })
    .from(heroBosses)
    .orderBy(desc(heroBosses.updatedAt), desc(heroBosses.id));
  return rows.map(({ fresh, ...row }) => ({
    ...toHeroBoss({ ...row, artJson: null }),
    art: cleanBossArt({ fresh }),
  }));
}

export async function getHeroBoss(id: number): Promise<HeroBoss | null> {
  const [row] = await db.select().from(heroBosses).where(eq(heroBosses.id, id)).limit(1);
  return row ? toHeroBoss(row) : null;
}

export async function getHeroBossByUuid(uuid: string, exec: Exec = db): Promise<HeroBoss | null> {
  const [row] = await exec.select().from(heroBosses).where(eq(heroBosses.uuid, uuid)).limit(1);
  return row ? toHeroBoss(row) : null;
}

/**
 * The hero's active adventures that end on this boss, by title (the editor names them): a retired
 * one falls back to its painted monster.
 */
export async function adventuresUsingBoss(uuid: string, exec: Exec = db): Promise<BossUser[]> {
  return await exec
    .select({
      enTitle: adventures.enTitle,
      frTitle: adventures.frTitle,
      deTitle: adventures.deTitle,
      esTitle: adventures.esTitle,
      ruTitle: adventures.ruTitle,
    })
    .from(adventures)
    .where(and(eq(adventures.heroBossUuid, uuid), eq(adventures.isActive, 1)));
}

async function columns(draft: HeroBossDraft) {
  const monster = await monsterOf(draft.monster);
  if (!monster) throw new Error("Unknown monster");
  return {
    name: clip(draft.name.replace(/\s+/g, " ").trim(), MAX_BOSS_NAME),
    monster: monster.bossImagePath,
    weaknessMuscle: draft.weakness,
    // One muscle is never both (two contradicting badges, a 0.75 hit): a file
    // may say so, the editor cannot.
    resistanceMuscle: draft.resistance === draft.weakness ? null : draft.resistance,
    linesJson: bossLinesJson(draft.lines),
    artJson: bossArtJson(draft.art),
  };
}

/**
 * `uuid` and `exec` are for the file import only: it names the boss as the sender did and writes on
 * its own transaction (`transactionOrFallback` queues, so an inner one would wait on the outer
 * forever); it calls `invalidateAdventures()` itself after its commit.
 */
export async function createHeroBoss(
  draft: HeroBossDraft,
  { uuid, exec }: { uuid?: string; exec?: Exec } = {},
): Promise<number> {
  const values = await columns(draft);
  const write = async (tx: Exec) => {
    const [row] = await tx
      .insert(heroBosses)
      .values({ ...values, uuid: uuid ?? uuidv7() })
      .returning({ id: heroBosses.id });
    if (!row) throw new Error("Failed to create boss");
    return row.id;
  };
  return exec ? write(exec) : transactionOrFallback(write);
}

export async function updateHeroBoss(id: number, draft: HeroBossDraft): Promise<void> {
  const values = await columns(draft);
  await db
    .update(heroBosses)
    .set({ ...values, updatedAt: nextEditStamp(heroBosses.updatedAt) })
    .where(eq(heroBosses.id, id));
  invalidateAdventures();
}

/**
 * Deleted with a tombstone (device sync must not bring it back), refused while an adventure ends on
 * it: the adventure would silently turn into a painted boss.
 */
export async function deleteHeroBoss(id: number): Promise<void> {
  await transactionOrFallback(async (tx) => {
    const [row] = await tx
      .select({ uuid: heroBosses.uuid })
      .from(heroBosses)
      .where(eq(heroBosses.id, id))
      .limit(1);
    if (!row) return;
    const using = await adventuresUsingBoss(row.uuid, tx);
    if (using.length > 0) throw new HeroBossInUseError(using);
    await writeContentTombstone(tx, "hero_bosses", id);
    await tx.delete(heroBosses).where(eq(heroBosses.id, id));
  });
  invalidateAdventures();
}
