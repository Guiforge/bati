import { sql } from "drizzle-orm";

import { MERGED_PREFERENCES } from "./backup";
import { db, type IsolatedConnection, withWritableConnection } from "./client";
import { deleteSession, parseRecords } from "./completed";
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
 * streak are read from sessions, so they follow on their own.
 *
 * **This device's rows keep their ids; only the other device's get new ones**, through temporary
 * maps: the id of a saved session, a cached screen or an open quest never changes under anyone.
 * Admin exercises are matched by `enName` and Admin quests by `enTitle`, since seeds written after
 * 0035 got different ids on devices that already had hero rows. Hero exercises and quests are
 * matched by name as `compareWithPeer` names them, the newer `updatedAt` winning.
 *
 * **Timestamps are copied verbatim**, so the two devices agree afterwards on what is newer and a
 * second comparison finds nothing: a merge stamped with "now" would bounce between them forever.
 *
 * **Left local in this version**: campaigns and boss fights (random crits cannot be replayed; the
 * other device's campaign sessions count as training), quest configs and favourites (they name
 * quest ids, and `compareWithPeer` leaves them out for that reason), achievements (derived).
 *
 * ponytail: hero content is matched by name. A rename on one device while the other still uses
 *           the old one leaves both; a uuid column on exercises and quests is the real fix, with
 *           the backfill problem 0038 had.
 *
 * One transaction on a connection of its own (an `ATTACH` cannot run behind Drizzle's statements),
 * rolled back whole on anything it cannot map. `path` must have passed `validateBackup`.
 */
export function mergePeer(path: string): Promise<MergeOutcome> {
  return withWritableConnection(async (conn) => {
    await conn.execAsync(`ATTACH DATABASE ${sqlString(path)} AS ${PEER}`);
    const newest = (schema: string) =>
      conn.getFirstAsync<{ at: number | null }>(
        `SELECT max(created_at) AS at FROM ${schema}.__drizzle_migrations`,
      );
    if ((await newest("main"))?.at !== (await newest(PEER))?.at) return { merged: false };

    await conn.execAsync("BEGIN IMMEDIATE");
    try {
      const outcome = await mergeInto(conn);
      await conn.execAsync("COMMIT");
      return { merged: true, ...outcome };
    } catch (error) {
      await conn.execAsync("ROLLBACK");
      throw error;
    }
  });
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

async function mergeInto(conn: IsolatedConnection): Promise<{ sessions: number; changes: number }> {
  let changes = 0;
  await conn.execAsync(`
    DROP TABLE IF EXISTS temp.ex_map; DROP TABLE IF EXISTS temp.quest_map;
    DROP TABLE IF EXISTS temp.fresh; DROP TABLE IF EXISTS temp.sess_map;
    DROP TABLE IF EXISTS temp.written;
    CREATE TEMP TABLE written (tbl TEXT, local INTEGER);
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

  changes += await mergeAuthored(conn, {
    table: "exercises",
    owner: "creator",
    admin: "enName",
    hero: "enName",
    map: "ex_map",
    deferred: ["prerequisiteExerciseId"],
    children: { table: "exercise_muscles", key: "exerciseId" },
  });
  // Written empty above, since it names the other device's id and that row may not exist here
  // yet: now every row has its local id, the other device's prerequisite is translated.
  await conn.execAsync(`UPDATE main.exercises SET prerequisiteExerciseId =
      (SELECT m2.local FROM temp.ex_map m1
         JOIN ${PEER}.exercises p ON p.id = m1.peer
         JOIN temp.ex_map m2 ON m2.peer = p.prerequisiteExerciseId
       WHERE m1.local = main.exercises.id)
    WHERE id IN (SELECT local FROM temp.written WHERE tbl = 'exercises')`);
  changes += await mergeAuthored(conn, {
    table: "quests",
    owner: "author",
    admin: "enTitle",
    hero: "enTitle || '/' || frTitle",
    map: "quest_map",
    children: { table: "quest_exercises", key: "questId", remap: { exerciseId: "ex_map" } },
  });

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
    changes += sessions;
  }

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
    WHERE p.key IN (${keys}) AND (${fresh ? "1" : "l.key IS NULL OR p.updatedAt > l.updatedAt"})
      AND (l.key IS NULL OR l.value IS NOT p.value OR l.updatedAt IS NOT p.updatedAt)`;
  changes += await count(conn, newer);
  await conn.execAsync(`INSERT OR REPLACE INTO main.user_preferences (key, value, updatedAt)
    SELECT key, value, updatedAt FROM ${PEER}.user_preferences WHERE key IN (${newer})`);

  return { sessions, changes };
}

/**
 * Hero-made rows of `exercises` or `quests`: Admin rows mapped by their seed name (every one must
 * exist here, or this build and that one do not hold the same content, and nothing is merged);
 * hero rows matched by name, the newer written over the older with its children replaced, the
 * unmatched inserted. Returns how many hero rows it wrote.
 */
async function mergeAuthored(
  conn: IsolatedConnection,
  spec: {
    table: string;
    owner: string;
    admin: string;
    hero: string;
    map: string;
    /** Columns naming the other device's ids, written empty and translated by the caller. */
    deferred?: string[];
    children: { table: string; key: string; remap?: Record<string, string> };
  },
): Promise<number> {
  const { table, owner, map } = spec;
  await conn.execAsync(`INSERT INTO temp.${map} SELECT p.id,
      (SELECT min(l.id) FROM main.${table} l WHERE l.${owner} = 'Admin' AND l.${spec.admin} = p.${spec.admin})
    FROM ${PEER}.${table} p WHERE p.${owner} = 'Admin'`);
  const missing = await count(conn, `SELECT 1 FROM temp.${map} WHERE local IS NULL`);
  if (missing > 0)
    throw new Error(`Merge: ${missing} ${table} of the other build are unknown here`);

  const cols = await columnsOf(conn, table, ["id"]);
  const values = selectList(
    cols,
    "p",
    Object.fromEntries((spec.deferred ?? []).map((column) => [column, "NULL"])),
  );
  const heroRows = await conn.getAllAsync<{ id: number; name: string; at: number | null }>(
    `SELECT id, ${spec.hero} AS name, updatedAt AS at FROM ${PEER}.${table} WHERE ${owner} = 'hero'`,
  );
  let written = 0;
  for (const row of heroRows) {
    const local = await conn.getFirstAsync<{ id: number | null; at: number | null }>(
      `SELECT min(id) AS id, updatedAt AS at FROM main.${table}
        WHERE ${owner} = 'hero' AND ${spec.hero} = ${sqlString(row.name)}`,
    );
    let id = local?.id ?? null;
    if (id === null) {
      await conn.execAsync(`INSERT INTO main.${table} (${columnList(cols)})
        SELECT ${values} FROM ${PEER}.${table} p WHERE p.id = ${row.id}`);
      id = Number(
        (await conn.getFirstAsync<{ id: number }>("SELECT last_insert_rowid() AS id"))?.id,
      );
    } else if ((row.at ?? 0) > (local?.at ?? 0)) {
      await conn.execAsync(`UPDATE main.${table} SET (${columnList(cols)}) =
        (SELECT ${values} FROM ${PEER}.${table} p WHERE p.id = ${row.id}) WHERE id = ${id}`);
    } else {
      await conn.execAsync(`INSERT INTO temp.${map} VALUES (${row.id}, ${id})`);
      continue;
    }
    await conn.execAsync(`INSERT INTO temp.${map} VALUES (${row.id}, ${id})`);
    await conn.execAsync(`INSERT INTO temp.written VALUES (${sqlString(table)}, ${id})`);
    await replaceChildren(conn, spec.children, row.id, id);
    written++;
  }
  return written;
}

async function replaceChildren(
  conn: IsolatedConnection,
  children: { table: string; key: string; remap?: Record<string, string> },
  peerId: number,
  localId: number,
): Promise<void> {
  const { table, key } = children;
  const cols = await columnsOf(conn, table, ["id"]);
  const replaced: Record<string, string> = { [key]: String(localId) };
  for (const [column, map] of Object.entries(children.remap ?? {})) {
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
      WHERE id IN (SELECT local FROM temp.sess_map) AND records_json IS NOT NULL`,
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
  return removed;
}
