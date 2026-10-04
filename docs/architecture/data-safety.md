---
title: Data safety, the guardrails around an update
type: technical
status: active
updated: 2026-10-04
related: [backup-and-sync.md, exercise-ownership.md, ../../AGENTS.md]
---

# Data safety, the guardrails around an update

The first complaint about fitness apps is lost data, and in Bati it can only happen at an update
or on a lost phone. Each gate below closes one door, and none of them stops anyone writing a
migration: the price of a risky one is a line of explanation, never a refusal.

## What runs where

| Gate | Where | Catches |
| --- | --- | --- |
| Backup from every migration point | `__tests__/backup-compat.test.ts` | a migration that works on a fresh install and breaks on a database with data, or a validator that refuses what an older build wrote |
| Golden hero | `__tests__/golden-hero.test.ts` | any change to a figure a hero reads: XP, level, flame, records, village tier, boss pools, achievements, what a session pays |
| Golden hero, updated | `__tests__/golden-hero-upgrade.test.ts` | a migration that, on three years of history, loses rows or moves those figures |
| Destructive SQL | `__tests__/migration-destructive-guard.test.ts` | a new migration that drops, deletes or replaces rows without saying why |
| One migration per release | `scripts/check-release-migrations.sh`, run by `release.yml` | two migrations shipping together, so the one that breaks is never a guess |
| Copy before an update | `copyBeforeMigrations` in `src/autoBackup.ts` | a migration that commits and still destroys data, which no ROLLBACK covers |
| Real update on a device | `scripts/upgrade-check.sh`, by hand before a tag | what no jest test can see: the actual APK over the actual previous APK |
| Protect your hero | `src/protectHero.ts`, `components/home/ProtectCard.tsx` | the phone lost with no backup |

## Writing a migration

- A statement that can lose rows (`DROP TABLE`, `DROP COLUMN`, `DELETE FROM`, `REPLACE INTO`,
  `INSERT OR REPLACE`) needs one `-- destructive-ok: <why the rows are safe>` line anywhere in the
  file. `DROP INDEX` and `UPDATE` are not flagged. The rule starts above `0066`; everything older
  shipped before it and never moves (`BASELINE_IDX`).
- Two new migrations in one release fail the release workflow. When they truly belong together,
  one of them carries `-- multi-migration-ok: <why>`.
- A migration that legitimately moves a figure fails the golden tests. Run
  `UPDATE_GOLDEN=1 npx jest golden-hero`, commit the regenerated `__tests__/golden/hero-3-years.json`,
  and say in the PR which figures moved and why. The failing run prints each as
  `path: before -> after`, and that list is what a reviewer reads.
- `__tests__/golden-hero-upgrade.test.ts` lists what may differ when a hero arrives from an older
  build (the XP clamp of 0037, the outing re-filing of 0049, content that changed). From
  `FULL_EQUALITY_FROM` on nothing may differ. Move that number down when it is true, never up to
  make a failure go away.

## The copy before an update

`premigrate.db` sits next to the database, in the app's private storage. It is written before the
runner's `BEGIN IMMEDIATE` (`VACUUM INTO` is illegal inside a transaction), through a temp name
and a rename so a copy cut short by a full disk is never mistaken for a net, and replaced at the
next update: it is the state just before the last one. It is skipped on a fresh install and can
never stop an update.

It exists because `backupBeforeMigrations` returns at once when no backup folder was picked, which
leaves exactly the hero who never opened Settings with nothing. There is no restore screen: it is
for a support session, by file. It is not in the Android backup rules and is not touched by
`validateBackup`.

## `scripts/upgrade-check.sh`

Run it before every tag, on an emulator (it refuses anything else: it uninstalls the app and
rewrites its database). The header of the script has the whole recipe; the shape is:

1. Build the previous tag and this checkout in two worktrees, both `assembleRelease` with the debug
   key and the `.perf` id, `x86_64`. The published APKs are signed with the release key, so they
   cannot be updated over by a local build.
2. `scripts/upgrade-check.sh old.apk new.apk --device emulator-5554`.

It installs the old build, lets it migrate, gives it a three-year hero through the same SQL as the
dev seeder, installs the new build with `adb install -r`, and compares sessions, exercises, XP,
the level and the flame as read off the Home screen, plus that the app is running with no crash
and that no migration disappeared. It prints each figure that moved and exits 1.

The comparison itself is covered without a device by `__tests__/upgrade-check-compare.test.ts`.

## Protect your hero

After 5 workouts, while nothing protects the hero, Home shows a line that opens Settings in one
tap. Closing it is silence for 30 days, then 90, then for good (`protectDismissedDay` and
`protectDismissals`, device-local). It is the one line under the scene: the reminder card yields to it. Protected means an
automatic backup folder whose last copy is under 7 days old (a folder with no stamped day does not
count: every write that lands stamps one), or a device sync that succeeded in the last 7 days. A hero with either never
sees the card. Settings shows "last backup N days ago" under the automatic backup row, read from
`lastAutoBackupDay`, which `enableAutoBackup` now stamps and `disableAutoBackup` clears.

## Not done, on purpose

- A schema fingerprint committed to the repo (as Room does): `backup-compat` already compares
  every migration point against a fresh install.
- Refusing a database newer than the code: Android refuses a downgrade, so it only happens on a
  side-loaded older build.
- A restore screen for `premigrate.db`.
