import { sql } from "drizzle-orm";
import { USER_EXERCISE_CREATOR } from "./schema";

/**
 * Whether an adventure's victory counts as a deed (spec R1, R2): every adventure that is not the
 * hero's own. One rule in two forms, both reading the exception so they agree on any author.
 *
 * Kept apart from `db/adventures.ts` and written without the schema objects: the session store
 * asks the JS form, and several suites mock `db/client` without a schema, so this file must load
 * with nothing behind it.
 *
 * A `BossFight` restored from a session saved by a build before 0076 (`SavedSessionState.bossFight`)
 * has no `author`, and is the game's.
 */
export const countsAsDeed = (a: { author?: string }) => a.author !== USER_EXERCISE_CREATOR;

/** The SQL form, for a query that joins `adventures` unaliased. */
export const DEED_ADVENTURE = sql`"adventures"."author" <> ${USER_EXERCISE_CREATOR}`;
