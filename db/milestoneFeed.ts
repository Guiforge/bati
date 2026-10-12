import { sql } from "drizzle-orm";
import { db, schema } from "./client";
import { METRES_PER_LEAGUE } from "./gps";
import { MILESTONE_WINDOW, type RecentFeeds, type SessionFed } from "./milestone";
import type { ExerciseStyle, MuscleCode } from "./schema";
import { repEquivalentSql } from "./workUnits";

const { exercises, exerciseMuscles, completedExercises, completedQuest } = schema;

function add<K extends string>(into: Partial<Record<K, number[]>>, key: K, n: number) {
  const list = into[key] ?? [];
  list.push(n);
  into[key] = list;
}

/**
 * What each of the latest sessions brought to each muscle, each style and the road, in one read.
 * The window runs in SQLite: a hero with five years of sessions gets at most five rows per muscle,
 * style and the road, not their whole history to slice in JS, and not one query per building.
 *
 * Same rep-equivalents and the same muscle tags as the building levels (`db/village.ts`), so a
 * session's share cannot disagree with the tally it is subtracted from. Oldest first.
 */
export async function getRecentFeeds(): Promise<RecentFeeds> {
  const reps = repEquivalentSql(
    completedExercises.resultValue,
    completedExercises.resultType,
    exercises.style,
    completedExercises.sides,
  );
  const rows = await db.all<{ kind: "muscle" | "style" | "outing"; key: string; n: number }>(sql`
    SELECT kind, key, n FROM (
      SELECT kind, key, n, at, sid,
        ROW_NUMBER() OVER (PARTITION BY kind, key ORDER BY at DESC, sid DESC) AS rn
      FROM (
        SELECT 'muscle' AS kind, ${exerciseMuscles.muscle} AS key, ${completedQuest.id} AS sid,
          ${completedQuest.performedAt} AS at, SUM(${reps}) AS n
        FROM ${completedExercises}
        JOIN ${completedQuest} ON ${completedQuest.id} = ${completedExercises.sessionId}
        JOIN ${exercises} ON ${exercises.id} = ${completedExercises.exerciseId}
        JOIN ${exerciseMuscles} ON ${exerciseMuscles.exerciseId} = ${exercises.id}
        GROUP BY ${exerciseMuscles.muscle}, ${completedQuest.id}
        UNION ALL
        SELECT 'style', ${exercises.style}, ${completedQuest.id}, ${completedQuest.performedAt}, SUM(${reps})
        FROM ${completedExercises}
        JOIN ${completedQuest} ON ${completedQuest.id} = ${completedExercises.sessionId}
        JOIN ${exercises} ON ${exercises.id} = ${completedExercises.exerciseId}
        GROUP BY ${exercises.style}, ${completedQuest.id}
        UNION ALL
        SELECT 'outing', '', ${completedQuest.id}, ${completedQuest.performedAt},
          ${completedQuest.leaguesM} * 1.0 / ${METRES_PER_LEAGUE}
        FROM ${completedQuest}
        WHERE ${completedQuest.leaguesM} > 0
      )
      WHERE n > 0
    )
    WHERE rn <= ${MILESTONE_WINDOW}
    ORDER BY kind, key, at ASC, sid ASC
  `);

  const feeds: RecentFeeds = { muscle: {}, style: {}, outing: [] };
  for (const { kind, key, n } of rows) {
    if (kind === "outing") feeds.outing.push(n);
    else if (kind === "muscle") add(feeds.muscle, key as MuscleCode, n);
    else add(feeds.style, key as ExerciseStyle, n);
  }
  return feeds;
}

/** What one saved session brought, to name the building it fed: same tags and reps as `getRecentFeeds`. */
export async function getSessionFed(sessionId: number): Promise<SessionFed> {
  const reps = repEquivalentSql(
    completedExercises.resultValue,
    completedExercises.resultType,
    exercises.style,
    completedExercises.sides,
  );
  const rows = await db.all<{ kind: "muscle" | "style"; key: string }>(sql`
    SELECT 'muscle' AS kind, ${exerciseMuscles.muscle} AS key
    FROM ${completedExercises}
    JOIN ${exercises} ON ${exercises.id} = ${completedExercises.exerciseId}
    JOIN ${exerciseMuscles} ON ${exerciseMuscles.exerciseId} = ${exercises.id}
    WHERE ${completedExercises.sessionId} = ${sessionId}
    GROUP BY ${exerciseMuscles.muscle} HAVING SUM(${reps}) > 0
    UNION ALL
    SELECT 'style', ${exercises.style}
    FROM ${completedExercises}
    JOIN ${exercises} ON ${exercises.id} = ${completedExercises.exerciseId}
    WHERE ${completedExercises.sessionId} = ${sessionId}
    GROUP BY ${exercises.style} HAVING SUM(${reps}) > 0
  `);
  const [outing] = await db.all<{ n: number }>(
    sql`SELECT COUNT(*) AS n FROM ${completedQuest} WHERE ${completedQuest.id} = ${sessionId} AND ${completedQuest.leaguesM} > 0`,
  );
  return {
    muscles: rows.filter((r) => r.kind === "muscle").map((r) => r.key as MuscleCode),
    styles: rows.filter((r) => r.kind === "style").map((r) => r.key as ExerciseStyle),
    outing: (outing?.n ?? 0) > 0,
  };
}
