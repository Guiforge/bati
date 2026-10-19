import { sql } from "drizzle-orm";
import { reportError } from "@/src/reportError";
import {
  type CanonicalColumns,
  canonical,
  canonicalColumns,
  MERGED_PREFERENCES,
  setsCanon,
} from "./backup";
import { db, type IsolatedConnection, withWritableConnection } from "./client";
import { deleteSession, parseRecords } from "./completed";
import { getExerciseUsage, invalidateExercisesCache, removeExercise } from "./exercises";
import { type MovedMovement, redecideAfterChange, redecideSessions } from "./personalRecords";
import { invalidateQuestTemplates, removeQuest } from "./quests";
import { sqlString } from "./sql";

/**
 * Device sync's merge (roadmap 4.18 phase 4), apart from db/backup.ts: that module is imported by
 * the headless widget task and by tests that stand up only part of the database, and the merge
 * needs `deleteSession`, which pulls in most of the app's data layer.
 */
/** What `mergePeer` did: how many sessions arrived, and how many rows of any kind it changed. */
export type MergeOutcome =
  /** The other device is on another migration: its columns may differ, so nothing was merged. */
  { merged: false } | { merged: true; sessions: number; changes: number };

const PEER = "merge_peer";

/**
 * Another device's history, merged into this one (roadmap 4.18 phase 4): what either side
 * recorded ends up on both, and nobody is asked to choose.
 *
 * **Sources are copied, never recomputed.** A session carries its XP as earned there, bonuses
 * included; its sets, its GPS points and its records come with it. XP, level, the village and the
 * streak are read from sessions, so they follow on their own. A session both hold takes the other
 * device's sets if it corrected them later, and its feedback if it changed that later, each on its
 * own stamp (0072); only records are then decided again, because the later sessions they were
 * judged against are this device's.
 *
 * **This device's rows keep their ids; only the other device's get new ones**, through temporary
 * maps: the id of a saved session, a cached screen or an open quest never changes under anyone.
 * Admin exercises are matched by `enName` and Admin quests by `enTitle`, since seeds written after
 * 0035 got different ids on devices that already had hero rows. Hero exercises and quests are
 * matched by `uuid` (0066), the newer `updatedAt` winning, so a rename on one device is the same
 * row on the other. Only a row with no uuid at all (written in raw SQL) falls back to its name.
 *
 * **Timestamps are copied verbatim**, so the two devices agree afterwards on what is newer and a
 * second comparison finds nothing: a merge stamped with "now" would bounce between them forever.
 *
 * **Left local in this version**: campaigns and boss fights (random crits cannot be replayed; the
 * other device's campaign sessions count as training), quest configs and favourites (they name
 * quest ids, and `compareWithPeer` leaves them out for that reason), achievements (derived).
 *
 * ponytail: a hero row renamed on one device *before* 0066 reached both still has two uuids
 *           (0066 derives them from the name), and both stay. Only a manual merge could join them.
 *
 * One transaction on a connection of its own (an `ATTACH` cannot run behind Drizzle's statements),
 * rolled back whole on anything it cannot map. `path` must have passed `validateBackup`.
 */
export async function mergePeer(path: string): Promise<MergeOutcome> {
  const merged = await withWritableConnection(async (conn) => {
    await conn.execAsync(`ATTACH DATABASE ${sqlString(path)} AS ${PEER}`);
    const newest = (schema: string) =>
      conn.getFirstAsync<{ at: number | null }>(
        `SELECT max(created_at) AS at FROM ${schema}.__drizzle_migrations`,
      );
    if ((await newest("main"))?.at !== (await newest(PEER))?.at) return { merged: false as const };

    await conn.execAsync("BEGIN IMMEDIATE");
    try {
      const outcome = await mergeInto(conn);
      await conn.execAsync("COMMIT");
      return outcome;
    } catch (error) {
      await conn.execAsync("ROLLBACK");
      throw error;
    }
  });
  if (!("moved" in merged)) return merged;
  // After the commit, on the app's own connection: the records of what came after an edited
  // session were judged against the figure it replaced, here, and only this device has them all.
  // Their failure is reported, not thrown: the merge is in, and a rejection would tell the hero
  // it was not. Each pass on its own, so one failing still lets the other run.
  // The edited sessions kept this device's records: every movement in them is judged again on
  // the sets that came in, and the later sessions only where a figure moved.
  //
  // ponytail: a session that arrives fresh never makes this device judge its own later sessions
  //           again (older than this PR), so an edited session judged here against a journal the
  //           other device lacks can keep a different verdict there. Records converge when both
  //           journals were whole at the time; sweeping later sessions for fresh ones is the fix.
  const report = (error: unknown) => reportError("sync.merge.records", error);
  await redecideSessions(merged.edited).catch(report);
  await redecideAfterChange(merged.moved).catch(report);
  return { merged: true, sessions: merged.sessions, changes: merged.changes };
}

async function columnsOf(conn: IsolatedConnection, table: string, without: string[]) {
  const rows = await conn.getAllAsync<{ name: string }>(
    `SELECT name FROM pragma_table_info(${sqlString(table)})`,
  );
  return rows.map((r) => r.name).filter((name) => !without.includes(name));
}

/** `SELECT` list for `columns` of `alias`, with some replaced by an expression. */
function selectList(columns: string[], alias: string, replaced: Record<string, string> = {}) {
  return columns.map((c) => replaced[c] ?? `${alias}."${c}"`).join(", ");
}

function columnList(columns: string[]) {
  return columns.map((c) => `"${c}"`).join(", ");
}

async function count(conn: IsolatedConnection, query: string): Promise<number> {
  return Number(
    (await conn.getFirstAsync<{ n: number }>(`SELECT count(*) AS n FROM (${query})`))?.n ?? 0,
  );
}

type AuthoredSpec = {
  table: string;
  owner: string;
  admin: string;
  hero: string;
  map: string;
  /** Columns naming the other device's ids, written empty and translated by the caller. */
  deferred?: string[];
  children: { table: string; key: string; remap?: Record<string, string> };
};

const EXERCISES: AuthoredSpec = {
  table: "exercises",
  owner: "creator",
  admin: "enName",
  hero: "enName",
  map: "ex_map",
  deferred: ["prerequisiteExerciseId"],
  children: { table: "exercise_muscles", key: "exerciseId" },
};

const QUESTS: AuthoredSpec = {
  table: "quests",
  owner: "author",
  admin: "enTitle",
  hero: "enTitle || '/' || frTitle",
  map: "quest_map",
  children: { table: "quest_exercises", key: "questId", remap: { exerciseId: "ex_map" } },
};

async function mergeInto(
  conn: IsolatedConnection,
): Promise<{ sessions: number; changes: number; moved: MovedMovement[]; edited: number[] }> {
  let changes = 0;
  await conn.execAsync(`
    DROP TABLE IF EXISTS temp.ex_map; DROP TABLE IF EXISTS temp.quest_map;
    DROP TABLE IF EXISTS temp.fresh; DROP TABLE IF EXISTS temp.sess_map;
    DROP TABLE IF EXISTS temp.written; DROP TABLE IF EXISTS temp.edited;
    CREATE TEMP TABLE written (tbl TEXT, local INTEGER);
    CREATE TEMP TABLE edited (peer INTEGER PRIMARY KEY, local INTEGER);
    CREATE TEMP TABLE ex_map (peer INTEGER PRIMARY KEY, local INTEGER);
    CREATE TEMP TABLE quest_map (peer INTEGER PRIMARY KEY, local INTEGER);
    CREATE TEMP TABLE fresh (uuid TEXT PRIMARY KEY);
    CREATE TEMP TABLE sess_map (peer INTEGER PRIMARY KEY, local INTEGER);`);

  // A device with nothing of its own yet (fresh from onboarding) takes the other's preferences
  // whatever their dates: its village name and avatar are an hour old and nobody chose them twice.
  const fresh =
    (await count(conn, "SELECT 1 FROM main.completed_sessions")) === 0 &&
    (await count(conn, "SELECT 1 FROM main.exercises WHERE creator = 'hero'")) === 0 &&
    (await count(conn, "SELECT 1 FROM main.quests WHERE author = 'hero'")) === 0;

  // Deletions of hero content first, as a union keeping the later stamp: from here on
  // `main.deleted_content` alone says what is gone, and `mergeAuthored` skips what it kills.
  changes += await count(
    conn,
    `SELECT 1 FROM ${PEER}.deleted_content p WHERE NOT EXISTS
      (SELECT 1 FROM main.deleted_content l WHERE l.uuid = p.uuid AND l.deletedAt >= p.deletedAt)`,
  );
  await conn.execAsync(`INSERT INTO main.deleted_content (uuid, deletedAt)
    SELECT uuid, deletedAt FROM ${PEER}.deleted_content WHERE true
    ON CONFLICT(uuid) DO UPDATE SET deletedAt = max(deletedAt, excluded.deletedAt)`);

  const canon = await canonicalColumns(conn, PEER);
  changes += await mergeAuthored(conn, EXERCISES, canon);
  changes += await mergeAuthored(conn, QUESTS, canon);

  // Sessions this device neither has nor deleted.
  await conn.execAsync(`INSERT INTO temp.fresh SELECT uuid FROM ${PEER}.completed_sessions
    WHERE uuid IS NOT NULL
      AND uuid NOT IN (SELECT uuid FROM main.completed_sessions WHERE uuid IS NOT NULL)
      AND uuid NOT IN (SELECT uuid FROM main.deleted_sessions)`);
  const sessions = await count(conn, "SELECT 1 FROM temp.fresh");
  if (sessions > 0) {
    const cols = await columnsOf(conn, "completed_sessions", ["id"]);
    await conn.execAsync(`INSERT INTO main.completed_sessions (${columnList(cols)})
      SELECT ${selectList(cols, "p", { questId: "(SELECT local FROM temp.quest_map WHERE peer = p.questId)" })}
      FROM ${PEER}.completed_sessions p WHERE p.uuid IN (SELECT uuid FROM temp.fresh)`);
    await conn.execAsync(`INSERT INTO temp.sess_map SELECT p.id, l.id FROM ${PEER}.completed_sessions p
      JOIN main.completed_sessions l ON l.uuid = p.uuid WHERE p.uuid IN (SELECT uuid FROM temp.fresh)`);
  }

  await fillEdited(conn, canon);
  // A movement deleted here that the other device used since: its sets name a row this device
  // skipped, so it is inserted after all (and kept, `honourTombstones` refuses a movement in use).
  changes += await resurrect(
    conn,
    `SELECT exerciseId FROM ${PEER}.completed_exercises
      WHERE sessionId IN (SELECT peer FROM temp.sess_map UNION SELECT peer FROM temp.edited)`,
  );
  const moved = await takeEditedSets(conn);
  changes += await takeEditedFeedback(conn);
  changes += await takeLargerXp(conn);
  const edited = await count(conn, "SELECT 1 FROM temp.edited");
  if (sessions > 0 || edited > 0) {
    const unmapped = await count(
      conn,
      `SELECT 1 FROM ${PEER}.completed_exercises WHERE sessionId IN (SELECT peer FROM temp.sess_map)
         AND exerciseId NOT IN (SELECT peer FROM temp.ex_map)`,
    );
    if (unmapped > 0) throw new Error(`Merge: ${unmapped} sets name an exercise this device lacks`);
    const exCols = await columnsOf(conn, "completed_exercises", ["id"]);
    await conn.execAsync(`INSERT INTO main.completed_exercises (${columnList(exCols)})
      SELECT ${selectList(exCols, "p", {
        sessionId: "(SELECT local FROM temp.sess_map WHERE peer = p.sessionId)",
        exerciseId: "(SELECT local FROM temp.ex_map WHERE peer = p.exerciseId)",
      })}
      FROM ${PEER}.completed_exercises p WHERE p.sessionId IN (SELECT peer FROM temp.sess_map)`);

    const gpsCols = await columnsOf(conn, "gps_points", []);
    await conn.execAsync(`INSERT OR IGNORE INTO main.gps_points (${columnList(gpsCols)})
      SELECT ${selectList(gpsCols, "p")} FROM ${PEER}.gps_points p
      WHERE p.sessionId IN (SELECT uuid FROM temp.fresh)`);
    await remapRecords(conn);
    changes += sessions + edited;
  }

  // Written empty by `mergeAuthored`, since it names the other device's id and that row may not
  // exist here yet: now every row, resurrected ones included, has its local id, the other device's
  // prerequisite is translated. One naming a movement skipped as deleted becomes NULL, as a local
  // delete leaves it.
  await conn.execAsync(`UPDATE main.exercises SET prerequisiteExerciseId =
      (SELECT m2.local FROM temp.ex_map m1
         JOIN ${PEER}.exercises p ON p.id = m1.peer
         JOIN temp.ex_map m2 ON m2.peer = p.prerequisiteExerciseId
       WHERE m1.local = main.exercises.id)
    WHERE id IN (SELECT local FROM temp.written WHERE tbl = 'exercises')`);

  // Deletions travel both ways; `honourTombstones` applies the other device's to this one's rows.
  changes += await count(
    conn,
    `SELECT 1 FROM ${PEER}.deleted_sessions WHERE uuid NOT IN (SELECT uuid FROM main.deleted_sessions)`,
  );
  await conn.execAsync(
    `INSERT OR IGNORE INTO main.deleted_sessions (uuid, deletedAt) SELECT uuid, deletedAt FROM ${PEER}.deleted_sessions`,
  );

  const keys = MERGED_PREFERENCES.map(sqlString).join(", ");
  const newer = `SELECT p.key FROM ${PEER}.user_preferences p
    LEFT JOIN main.user_preferences l ON l.key = p.key
    WHERE p.key IN (${keys}) AND (${
      fresh
        ? "1"
        : // Equal dates (or two undated copies) go to the larger value, on both devices.
          "l.key IS NULL OR p.updatedAt > l.updatedAt OR (ifnull(p.updatedAt, 0) = ifnull(l.updatedAt, 0) AND p.value > l.value)"
    })
      AND (l.key IS NULL OR l.value IS NOT p.value OR l.updatedAt IS NOT p.updatedAt)`;
  changes += await count(conn, newer);
  await conn.execAsync(`INSERT OR REPLACE INTO main.user_preferences (key, value, updatedAt)
    SELECT key, value, updatedAt FROM ${PEER}.user_preferences WHERE key IN (${newer})`);

  // Only ever goes one way. A tablet that found its hero from onboarding had the whole history and
  // still showed the first onboarding screen, because this flag stayed behind: to a new user, the
  // hero they came for was gone.
  const onboarded = `SELECT 1 FROM ${PEER}.user_preferences
    WHERE key = 'hasFinishedOnboarding' AND value = 'true'
      AND NOT EXISTS (SELECT 1 FROM main.user_preferences WHERE key = 'hasFinishedOnboarding' AND value = 'true')`;
  if ((await count(conn, onboarded)) > 0) {
    changes++;
    await conn.execAsync(`INSERT OR REPLACE INTO main.user_preferences (key, value, updatedAt)
      SELECT key, value, updatedAt FROM ${PEER}.user_preferences WHERE key = 'hasFinishedOnboarding'`);
  }

  const editedIds = (
    await conn.getAllAsync<{ local: number }>("SELECT local FROM temp.edited")
  ).map((r) => r.local);
  return { sessions, changes, moved, edited: editedIds };
}

/**
 * Fills `temp.edited` with the sessions both devices hold whose sets the other corrected later, or
 * at the same second with larger content, so `resurrect` can read the movements they name.
 */
async function fillEdited(conn: IsolatedConnection, canon: CanonicalColumns): Promise<void> {
  await conn.execAsync(`INSERT INTO temp.edited SELECT p.id, l.id FROM ${PEER}.completed_sessions p
    JOIN main.completed_sessions l ON l.uuid = p.uuid
    WHERE ${editedLater("setsEditedAt", (schema, alias) => setsCanon(schema, alias, canon.sets))}`);
}

/** `p` (the other device's session) edited a stamp later than `l`, or at the same second with more. */
function editedLater(column: string, content: (schema: string, alias: string) => string): string {
  return `(ifnull(p.${column}, 0) > ifnull(l.${column}, 0)
    OR (p.${column} IS NOT NULL AND p.${column} = l.${column}
        AND ${content(PEER, "p")} > ${content("main", "l")}))`;
}

/**
 * Sessions both hold whose sets the other device corrected later (`setsEditedAt`, 0072): its sets
 * replace this one's, the stamp copied as is so the next comparison finds nothing, and its sets are
 * queued in `sess_map` to be copied with the new sessions' (this one's are deleted). The records
 * stay this device's: the other's were decided against its own journal, and a verdict this device
 * re-decided on another movement of the session would be lost; `mergePeer` decides them again.
 * The rest of the row stays (the XP has its own rule, `takeLargerXp`). Two corrections stamped in
 * the same second go to the larger sets text (`setsCanon`), on both devices. Returns the movements
 * whose figures moved, whose records `mergePeer` decides again after the commit.
 */
async function takeEditedSets(conn: IsolatedConnection): Promise<MovedMovement[]> {
  if ((await count(conn, "SELECT 1 FROM temp.edited")) === 0) return [];
  // The sets one side has and the other does not, in this device's ids: only those movements, and
  // only between their two figures, can have moved a record.
  const here = `SELECT l.sessionId AS sessionId, l.exerciseId AS exerciseId, l.roundIndex AS r,
      l.sortOrder AS o, l.resultValue AS v
    FROM main.completed_exercises l WHERE l.sessionId IN (SELECT local FROM temp.edited)`;
  const there = `SELECT e.local AS sessionId, m.local AS exerciseId, p.roundIndex AS r,
      p.sortOrder AS o, p.resultValue AS v
    FROM ${PEER}.completed_exercises p
    JOIN temp.edited e ON e.peer = p.sessionId JOIN temp.ex_map m ON m.peer = p.exerciseId`;
  const moved = await conn.getAllAsync<MovedMovement>(`SELECT sessionId, exerciseId,
      min(v) AS low, max(v) AS high
    FROM (SELECT * FROM (${here} EXCEPT ${there}) UNION ALL SELECT * FROM (${there} EXCEPT ${here}))
    GROUP BY sessionId, exerciseId`);
  await conn.execAsync(`UPDATE main.completed_sessions SET setsEditedAt =
    (SELECT p.setsEditedAt FROM ${PEER}.completed_sessions p WHERE p.uuid = main.completed_sessions.uuid)
    WHERE id IN (SELECT local FROM temp.edited)`);
  await conn.execAsync(
    "DELETE FROM main.completed_exercises WHERE sessionId IN (SELECT local FROM temp.edited)",
  );
  await conn.execAsync("INSERT INTO temp.sess_map SELECT peer, local FROM temp.edited");
  return moved;
}

/**
 * Sessions both hold whose feedback the other device changed later (`feedbackEditedAt`, 0072): the
 * feedback and its stamp, nothing else, so a chip tapped there never carries that device's older
 * sets over a correction made here. Returns how many.
 */
async function takeEditedFeedback(conn: IsolatedConnection): Promise<number> {
  const later = `SELECT l.id FROM ${PEER}.completed_sessions p
    JOIN main.completed_sessions l ON l.uuid = p.uuid
    WHERE ${editedLater("feedbackEditedAt", (_schema, alias) => `ifnull(${alias}.feedback, '')`)}`;
  const taken = await count(conn, later);
  if (taken > 0) {
    await conn.execAsync(`UPDATE main.completed_sessions SET (feedback, feedbackEditedAt) =
      (SELECT p.feedback, p.feedbackEditedAt FROM ${PEER}.completed_sessions p
        WHERE p.uuid = main.completed_sessions.uuid)
      WHERE id IN (${later})`);
  }
  return taken;
}

/**
 * Sessions both hold where the other device has more XP (a bonus added after the copy, 0073 on):
 * the larger wins and XP that was earned is never taken away. No stamp: a maximum is commutative
 * and idempotent, so both devices reach the same value in any order, and both writers keep it under
 * `MAX_SESSION_XP`. Returns how many it raised.
 */
async function takeLargerXp(conn: IsolatedConnection): Promise<number> {
  const larger = `SELECT l.id FROM ${PEER}.completed_sessions p
    JOIN main.completed_sessions l ON l.uuid = p.uuid WHERE p.xpEarned > l.xpEarned`;
  const raised = await count(conn, larger);
  if (raised > 0) {
    await conn.execAsync(`UPDATE main.completed_sessions SET xpEarned =
      (SELECT p.xpEarned FROM ${PEER}.completed_sessions p WHERE p.uuid = main.completed_sessions.uuid)
      WHERE id IN (${larger})`);
  }
  return raised;
}

/**
 * Hero-made rows of `exercises` or `quests`: Admin rows mapped by their seed name (every one must
 * exist here, or this build and that one do not hold the same content, and nothing is merged);
 * hero rows matched by uuid, else by name when one side has none (`localHeroRow`), the newer
 * written over the older with its children replaced, the unmatched inserted. Returns how many hero
 * rows it wrote.
 */
async function mergeAuthored(
  conn: IsolatedConnection,
  spec: AuthoredSpec,
  canon: CanonicalColumns,
): Promise<number> {
  const { table, owner, map } = spec;
  await conn.execAsync(`INSERT INTO temp.${map} SELECT p.id,
      (SELECT min(l.id) FROM main.${table} l WHERE l.${owner} = 'Admin' AND l.${spec.admin} = p.${spec.admin})
    FROM ${PEER}.${table} p WHERE p.${owner} = 'Admin'`);
  const missing = await count(conn, `SELECT 1 FROM temp.${map} WHERE local IS NULL`);
  if (missing > 0)
    throw new Error(`Merge: ${missing} ${table} of the other build are unknown here`);

  const { cols, values } = await authoredColumns(conn, spec);
  const heroRows = await conn.getAllAsync<HeroRow>(
    `SELECT p.id, p.uuid, ${spec.hero} AS name, p.updatedAt AS at,
        (SELECT deletedAt FROM main.deleted_content d WHERE d.uuid = p.uuid) AS gone
      FROM ${PEER}.${table} p WHERE p.${owner} = 'hero'`,
  );
  let written = 0;
  for (const row of heroRows) {
    const local = await localHeroRow(conn, spec, row);
    let id = local?.id ?? null;
    if (isDead(row, local)) {
      await mapKeptDead(conn, spec, row.id, id);
      continue;
    }
    const theirs = id === null || (await takesPeer(conn, spec, canon, row, id, local));
    if (id === null) {
      id = await insertPeerRow(conn, spec, cols, values, row.id);
    } else if (theirs) {
      await conn.execAsync(`UPDATE main.${table} SET (${columnList(cols)}) =
        (SELECT ${values} FROM ${PEER}.${table} p WHERE p.id = ${row.id}) WHERE id = ${id}`);
    }
    // A row still unnamed after the match takes the other device's uuid, so the two devices name
    // it alike and the next comparison finds nothing to take. Not a fresh one when that side has
    // none either (raw SQL): this device alone would then name it, and the two would disagree.
    if (row.uuid !== null) {
      await conn.execAsync(
        `UPDATE main.${table} SET uuid = ${sqlString(row.uuid)} WHERE id = ${id} AND uuid IS NULL`,
      );
    }
    await conn.execAsync(`INSERT INTO temp.${map} VALUES (${row.id}, ${id})`);
    if (!theirs) continue;
    await conn.execAsync(`INSERT INTO temp.written VALUES (${sqlString(table)}, ${id})`);
    written += await replaceChildren(conn, spec.children, row.id, id);
    written++;
  }
  return written;
}

/**
 * Deleted on one device and not edited since, on either: the row is not brought back. A newer copy
 * on either side outlives the deletion, and goes the ordinary way.
 */
function isDead(row: HeroRow, local: { at: number | null } | null): boolean {
  return row.gone !== null && row.gone >= (row.at ?? 0) && row.gone >= (local?.at ?? 0);
}

/**
 * A quest never enters `quest_map`, so the other device's sessions of it arrive with no quest instead
 * of recreating it. A movement with a local copy is mapped (`honourTombstones` decides after the
 * commit); one without is only inserted if something that lands here names it (`resurrect`).
 */
async function mapKeptDead(
  conn: IsolatedConnection,
  spec: AuthoredSpec,
  peerId: number,
  localId: number | null,
): Promise<void> {
  if (spec.table !== "exercises" || localId === null) return;
  await conn.execAsync(`INSERT INTO temp.${spec.map} VALUES (${peerId}, ${localId})`);
}

/**
 * Whether the other device's copy replaces this one's: it is dated later, or the dates are equal
 * and its content is the larger text, on both devices (`canonical`), so a same-second edit
 * converges instead of staying on the phone that made it.
 */
async function takesPeer(
  conn: IsolatedConnection,
  spec: AuthoredSpec,
  canon: CanonicalColumns,
  row: HeroRow,
  localId: number,
  local: { at: number | null } | null,
): Promise<boolean> {
  const [theirs, ours] = [row.at ?? 0, local?.at ?? 0];
  if (theirs !== ours) return theirs > ours;
  // Compared by SQLite, as the comparison in backup.ts does: its BINARY order (UTF-8 bytes) is not
  // the order of JS strings (UTF-16 units), and two devices must read one order.
  const table = spec.table as "exercises" | "quests";
  const r = await conn.getFirstAsync<{ r: number | null }>(
    `SELECT ${canonical(PEER, table, "p", canon[table])} > ${canonical("main", table, "l", canon[table])} AS r
      FROM ${PEER}.${table} p, main.${table} l WHERE p.id = ${row.id} AND l.id = ${localId}`,
  );
  return r?.r === 1;
}

async function authoredColumns(conn: IsolatedConnection, spec: AuthoredSpec) {
  const cols = await columnsOf(conn, spec.table, ["id"]);
  const values = selectList(
    cols,
    "p",
    Object.fromEntries((spec.deferred ?? []).map((column) => [column, "NULL"])),
  );
  return { cols, values };
}

/** The other device's row copied in as a new one: this device's id for it. */
async function insertPeerRow(
  conn: IsolatedConnection,
  spec: AuthoredSpec,
  cols: string[],
  values: string,
  peerId: number,
): Promise<number> {
  await conn.execAsync(`INSERT INTO main.${spec.table} (${columnList(cols)})
    SELECT ${values} FROM ${PEER}.${spec.table} p WHERE p.id = ${peerId}`);
  return Number((await conn.getFirstAsync<{ id: number }>("SELECT last_insert_rowid() AS id"))?.id);
}

/**
 * Movements of the other device that were skipped as deleted but that rows landing here name (its
 * sets, its quest slots): a movement is only deleted when unused, and the other device may have used
 * it since. They are inserted after all, mapped and written, and `honourTombstones` keeps them
 * (in use). Without this the "names rows this device lacks" check would roll the merge back on every
 * sync. `named` selects the other device's exercise ids. Returns how many it brought in.
 */
async function resurrect(conn: IsolatedConnection, named: string): Promise<number> {
  const rows = await conn.getAllAsync<{ id: number }>(
    `SELECT id FROM ${PEER}.exercises WHERE creator = 'hero' AND id IN (${named})
      AND id NOT IN (SELECT peer FROM temp.ex_map)`,
  );
  if (rows.length === 0) return 0;
  const { cols, values } = await authoredColumns(conn, EXERCISES);
  for (const { id: peerId } of rows) {
    const id = await insertPeerRow(conn, EXERCISES, cols, values, peerId);
    await conn.execAsync(`INSERT INTO temp.ex_map VALUES (${peerId}, ${id})`);
    await conn.execAsync(`INSERT INTO temp.written VALUES ('exercises', ${id})`);
    await replaceChildren(conn, EXERCISES.children, peerId, id);
  }
  return rows.length;
}

type HeroRow = {
  id: number;
  uuid: string | null;
  name: string;
  at: number | null;
  /** When this device's union of tombstones says the row was deleted, if it was. */
  gone: number | null;
};

/**
 * The local row a hero row of the other device is, if any: the one with its uuid, else, only when
 * one of the two has no uuid, one with its name.
 *
 * Two rows that both have a uuid and differ are two quests, whatever they are called: an outing
 * filed as a quest on each phone copies the same seed title onto two different rows, and a match
 * by name would write one over the other, its slots and its sessions' quest with it. Since 0066
 * every hero row is named, so the name only speaks for a row written without one (raw SQL, a
 * dev seed), and then the named side's uuid is adopted (`mergeAuthored`).
 *
 * A local row whose uuid the other device holds is never taken by name either: the copy that
 * follows would give it a second row's uuid, and the UNIQUE index would roll the whole merge back
 * on every sync.
 */
async function localHeroRow(
  conn: IsolatedConnection,
  spec: { table: string; owner: string; hero: string },
  row: HeroRow,
): Promise<{ id: number | null; at: number | null } | null> {
  const { table, owner } = spec;
  if (row.uuid !== null) {
    const byUuid = await conn.getFirstAsync<{ id: number | null; at: number | null }>(
      `SELECT min(id) AS id, updatedAt AS at FROM main.${table}
        WHERE ${owner} = 'hero' AND uuid = ${sqlString(row.uuid)}`,
    );
    if (byUuid?.id != null) return byUuid;
  }
  const unnamed =
    row.uuid === null
      ? `(uuid IS NULL OR uuid NOT IN (SELECT uuid FROM ${PEER}.${table} WHERE uuid IS NOT NULL))`
      : "uuid IS NULL";
  return conn.getFirstAsync<{ id: number | null; at: number | null }>(
    `SELECT min(id) AS id, updatedAt AS at FROM main.${table}
      WHERE ${owner} = 'hero' AND ${spec.hero} = ${sqlString(row.name)} AND ${unnamed}`,
  );
}

async function replaceChildren(
  conn: IsolatedConnection,
  children: { table: string; key: string; remap?: Record<string, string> },
  peerId: number,
  localId: number,
): Promise<number> {
  const { table, key } = children;
  let resurrected = 0;
  const cols = await columnsOf(conn, table, ["id"]);
  const replaced: Record<string, string> = { [key]: String(localId) };
  for (const [column, map] of Object.entries(children.remap ?? {})) {
    if (column === "exerciseId") {
      resurrected += await resurrect(
        conn,
        `SELECT exerciseId FROM ${PEER}.${table} WHERE ${key} = ${peerId}`,
      );
    }
    const unmapped = await count(
      conn,
      `SELECT 1 FROM ${PEER}.${table} WHERE ${key} = ${peerId} AND ${column} NOT IN (SELECT peer FROM temp.${map})`,
    );
    if (unmapped > 0) throw new Error(`Merge: ${table} of ${peerId} names rows this device lacks`);
    replaced[column] = `(SELECT local FROM temp.${map} WHERE peer = p.${column})`;
  }
  await conn.execAsync(`DELETE FROM main.${table} WHERE ${key} = ${localId}`);
  await conn.execAsync(`INSERT INTO main.${table} (${columnList(cols)})
    SELECT ${selectList(cols, "p", replaced)} FROM ${PEER}.${table} p WHERE p.${key} = ${peerId}`);
  return resurrected;
}

/** The exercise ids inside a merged session's `records_json`, rewritten to this device's. */
async function remapRecords(conn: IsolatedConnection): Promise<void> {
  const map = new Map(
    (
      await conn.getAllAsync<{ peer: number; local: number }>("SELECT peer, local FROM temp.ex_map")
    ).map((r) => [r.peer, r.local]),
  );
  const rows = await conn.getAllAsync<{ id: number; json: string }>(
    `SELECT id, records_json AS json FROM main.completed_sessions
      WHERE id IN (SELECT local FROM temp.sess_map) AND id NOT IN (SELECT local FROM temp.edited)
        AND records_json IS NOT NULL`,
  );
  for (const row of rows) {
    const records = parseRecords(row.json).map((r) =>
      r.e === undefined ? r : { ...r, e: map.get(r.e) ?? r.e },
    );
    await conn.execAsync(
      `UPDATE main.completed_sessions SET records_json = ${sqlString(JSON.stringify(records))} WHERE id = ${row.id}`,
    );
  }
}

/**
 * The other device's deletions, applied here after a merge: every local session named in
 * `deleted_sessions` goes through `deleteSession`, which refunds its boss damage and reopens its
 * campaign step, as a delete on this device would. Returns how many it removed.
 *
 * ponytail: `deleteSession` refuses a session whose campaign has moved past it ("locked"), and
 *           such a session stays; `compareWithPeer` then counts it on every sync, harmlessly (the
 *           merge changes nothing, so nothing reloads). A forced delete is the fix if it matters.
 */
export async function honourTombstones(): Promise<number> {
  const rows = await db.all<{ id: number }>(
    sql`SELECT id FROM completed_sessions WHERE uuid IN (SELECT uuid FROM deleted_sessions)`,
  );
  let removed = 0;
  for (const { id } of rows) {
    if ((await deleteSession(id)) === "deleted") removed++;
  }
  // Then hero quests and movements (0074), in that order: a removed session or quest frees a
  // movement. A copy edited after its deletion is newer and stays; so does a movement still in use
  // here, as a "locked" session does.
  const dead = (table: string, owner: string) =>
    sql.raw(`SELECT id FROM ${table} r WHERE ${owner} = 'hero' AND EXISTS
      (SELECT 1 FROM deleted_content d WHERE d.uuid = r.uuid AND d.deletedAt >= ifnull(r.updatedAt, 0))`);
  for (const { id } of await db.all<{ id: number }>(dead("quests", "author"))) {
    await removeQuest(id);
    removed++;
  }
  for (const { id } of await db.all<{ id: number }>(dead("exercises", "creator"))) {
    const usage = await getExerciseUsage(id);
    if (Object.values(usage).some((n) => n > 0)) continue;
    await removeExercise(id);
    removed++;
  }
  if (removed > 0) {
    invalidateQuestTemplates();
    invalidateExercisesCache();
  }
  return removed;
}

/**
 * Sessions this device keeps although a tombstone names them: the other device deleted them and
 * `honourTombstones` was refused. Nothing is lost; the sync sheet says how many.
 */
export async function keptSessions(): Promise<number> {
  const rows = await db.all<{ n: number }>(
    sql`SELECT count(*) AS n FROM completed_sessions WHERE uuid IN (SELECT uuid FROM deleted_sessions)`,
  );
  return Number(rows[0]?.n ?? 0);
}
