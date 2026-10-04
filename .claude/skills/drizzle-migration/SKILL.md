---
name: drizzle-migration
description: Writing or changing a database migration in drizzle/ (new column, table, index, seed content, data fix on exercises/quests/adventures). Use before touching drizzle/, db/schema.ts, or any SQL that ships to heroes' devices.
---

# Writing a Drizzle migration

A migration runs on every hero's phone, inside one transaction for the whole journal. If one
statement fails, the journal rolls back and the app fails again on every launch, with no
recovery short of reinstalling, which deletes the data. Write it by hand and read it twice.

## Never `npm run db:generate`

`drizzle/meta/` holds snapshots only up to `0025`. `drizzle-kit generate` diffs the current
schema against that one and re-emits every change since: `ADD COLUMN` for columns that exist,
`CREATE UNIQUE INDEX` for indexes that exist. Applying it breaks the database. Nobody
regenerates the snapshots; do not start now.

## The four places, every time

1. **`drizzle/NNNN_<slug>.sql`**: next number, a slug that says what it does. Open with a
   comment block that explains *why* (see `0039_exercise_measure.sql`, `0066_*`): the reader is
   the person debugging a hero's broken launch a year from now.
2. **`drizzle/migrations.js`**: the `import mNNNN from './NNNN_<slug>.sql'` line *and* the
   entry in the `migrations` object.
3. **`drizzle/meta/_journal.json`**: a new entry copied from the last one, with `idx` + 1,
   `"version": "6"`, `when` (epoch ms, later than the previous one), `tag` = the file name
   without `.sql`, `"breakpoints": true`.
4. **`db/schema.ts`**: if the shape changed, the Drizzle schema must match what the SQL
   produces. The types the app compiles against come from here, not from the SQL.

A file with more than one statement separates them with `--> statement-breakpoint`
(`db/migrate.ts` splits on it). No semicolon inside a string literal:
`__tests__/seed-migration-guard.test.ts` splits on `;`.

## Rules that already bit

- **`exercises` holds two populations**, told apart by `creator` (`'Admin'` seed vs `'hero'`).
  Every `UPDATE` or `DELETE` on `exercises`, and every join that finds a row by `enName`,
  scopes itself with `creator = 'Admin'`. Otherwise it rewrites a hero's own movement that
  happens to share a name. The guard test enforces it from `0035` on. Background:
  `docs/architecture/exercise-ownership.md`.
- **`ALTER TABLE ADD COLUMN` is not idempotent.** It fails on a database that already has the
  column, so never re-run or renumber a shipped migration. A shipped migration is immutable;
  fix forward with a new one.
- **Seed copy has three languages** (`fr`, `en`, `de` columns) and the copy rules of
  `docs/product/writing.md`: no em dash, `tu` in French.
- **Game state is never written before what earned it exists.** A migration that backfills
  XP, streaks or boss damage needs a test proving it on a realistic history
  (`__tests__/migration-xp-clamp.test.ts` is the model).

## Data-safety gates

All in `docs/architecture/data-safety.md`; read it before a migration that moves rows or
figures.

- A migration above `0066` with `DROP TABLE`, `DROP COLUMN`, `DELETE FROM`, `REPLACE INTO` or
  `INSERT OR REPLACE` needs a `-- destructive-ok: <why the rows are safe>` line.
- One migration per release. A second one carries `-- multi-migration-ok: <why>`, or
  `release.yml` refuses the tag.
- A migration that moves a figure a hero reads fails `golden-hero`. Only when the move is
  intended: `UPDATE_GOLDEN=1 npx jest golden-hero`, commit the JSON, and list the moved figures
  and why in the commit or PR. Never regenerate it to turn a red build green.

## Check it

Build a database from every migration, in order, without a phone:

```bash
mkdir -p scratch
awk 'FNR==1{print ";"} {print}' drizzle/*.sql > scratch/all.sql
sqlite3 scratch/bati.db < scratch/all.sql
```

The `;` before each file matters: a plain `cat` glues a file that ends without one onto the
next, sqlite reports a parse error, and the cascade of `NOT NULL` / `UNIQUE` failures after it
leaves a database that looks right but is missing migrations. Zero errors is the bar.

Then run the tests that read migrations:

```bash
npx jest db-migrate seed-migration-guard migration-destructive-guard golden-hero \
  backup-compat content-invariants seed-copy-shape
```

For a data migration, also play it on the emulator against a copy of a real dev database
(the `device-check` skill covers pulling and pushing it) and read the result in SQLite, not
on screen.
