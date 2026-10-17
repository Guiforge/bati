#!/usr/bin/env python3
"""Generate the Chinese catalogue migrations (0074 columns, 0075 fills).

Builds the real migrated database, reads the seeded rows with their keys, and emits
SQL in the shape 0058/0059 set for German and Spanish. Every statement is scoped to
the seeded row, so a hero's own content is never touched.
"""
import json
import subprocess
import sys

sys.path.insert(0, "scripts/zh_translate")
from seed_zh import ADVENTURES, EXERCISES, QUESTS, STEP_OUTROS, STEPS

NODE = "C:/Program Files/nodejs/node.exe"

# --- The seeded rows, straight out of a freshly migrated database -----------------

BUILD = r"""
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const sqlite = new Database(":memory:");
const journal = JSON.parse(fs.readFileSync("drizzle/meta/_journal.json", "utf8"));
sqlite.exec("CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at NUMERIC)");
for (const entry of [...journal.entries].sort((a, b) => a.idx - b.idx)) {
  const content = fs.readFileSync(path.join("drizzle", entry.tag + ".sql"), "utf8");
  for (const stmt of content.split(/\n?--> statement-breakpoint\n?/g).map(s => s.trim()).filter(Boolean)) sqlite.exec(stmt);
}
const out = {
  exercises: sqlite.prepare("SELECT id, enName FROM exercises WHERE creator = ? ORDER BY id").all("Admin"),
  quests: sqlite.prepare("SELECT id, enTitle FROM quests WHERE author = ? ORDER BY id").all("Admin"),
  adventures: sqlite.prepare("SELECT id, enTitle FROM adventures WHERE author = ? ORDER BY id").all("Admin"),
  steps: sqlite.prepare("SELECT s.id, s.stepIndex, a.enTitle AS adventure FROM adventure_steps s JOIN adventures a ON a.id = s.adventureId WHERE a.author = ? ORDER BY s.id").all("Admin"),
};
console.log(JSON.stringify(out));
"""

proc = subprocess.run([NODE, "-e", BUILD], capture_output=True, text=True, cwd=".")
if proc.returncode != 0:
    print(proc.stderr)
    raise SystemExit("could not build the seeded database")
seed = json.loads(proc.stdout)

# --- Coverage: every seed row translated, every translation matched -----------------


def check(seed_rows, translations, label):
    ids = {row["id"] for row in seed_rows}
    missing = sorted(ids - set(translations))
    extra = sorted(set(translations) - ids)
    if missing or extra:
        print(f"{label}: missing {missing}, extra {extra}")
        raise SystemExit(1)
    print(f"{label}: {len(ids)} rows, all translated")


check(seed["exercises"], EXERCISES, "exercises")
check(seed["quests"], QUESTS, "quests")
check(seed["adventures"], ADVENTURES, "adventures")
check(seed["steps"], STEPS, "steps")
check([s for s in seed["steps"] if s["id"] in STEP_OUTROS], STEP_OUTROS, "step outros")


def sql_str(text: str) -> str:
    if ";" in text:
        raise SystemExit(f"unsafe character in translation: {text!r}")
    if "—" in text or "..." in text:
        raise SystemExit(f"banned typography in translation: {text!r}")
    # SQL doubles a single quote inside a literal: the English key "World's Greatest Stretch"
    # needs it, the Chinese never does.
    return "'" + text.replace("'", "''") + "'"


def update(table: str, sets: list[str], where: str) -> str:
    body = ",\n    ".join(sets)
    return f"UPDATE `{table}` SET\n    {body},\n    `updatedAt` = strftime('%s', 'now') * 1000\n{where}"


# --- 0074: the columns, empty ------------------------------------------------------

COLUMNS = """-- Chinese gets a column beside the other five on every seeded multilingual row, the same shape
-- 0058 gave German and Spanish: eight columns on four tables, empty until the next migration
-- writes the translations. `localizedText` reads an empty column as English, so a row nobody
-- has translated yet shows English rather than a blank card.
--
-- multi-migration-ok: 0074 and 0075 ship together, one language in the two-step shape 0058 and
-- 0059 set: this file adds the columns empty, the next fills them.
--
-- NOT NULL DEFAULT '' like the columns they sit beside, so a hero's own row written by an older
-- build during an update, and every row already installed, is valid the moment this runs.
ALTER TABLE `exercises` ADD `zhName` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `exercises` ADD `zhDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `quests` ADD `zhTitle` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `quests` ADD `zhDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures` ADD `zhTitle` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures` ADD `zhDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventure_steps` ADD `zhNarrative` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventure_steps` ADD `zhOutroNarrative` text DEFAULT '' NOT NULL;
"""

# --- 0075: the translations --------------------------------------------------------

parts = ["""-- The seeded content in Chinese: every Admin exercise, quest, adventure and step.
--
-- 0074 added the columns empty and `localizedText` has been showing English in them since. This
-- fills them, translated from the English with the French beside it and against the glossary's
-- Chinese terms (docs/product/glossary.md), in the register the rest of the game uses there:
-- 你, the game talking to the hero. Proper names are translated, not kept: the Squire is 侍从
-- the way French already has L'Écuyer, and the golem is 石魔 the way the boss is 采石王.
--
-- Every statement is scoped to the seeded row: `creator = 'Admin'` on exercises (rule 2, 0035),
-- `author = 'Admin'` on quests and adventures, and steps through their Admin adventure. A hero's
-- own row is never touched: it already carries its one language in every column.
--
-- No semicolon inside any string: `seed-migration-guard.test.ts` splits statements on `;`, and a
-- description with one reads to it as a second statement that forgot its `creator`. No em dash
-- either, the rule `locale-style.test.ts` holds everywhere a reader looks.
"""]

ex_by_id = {row["id"]: row["enName"] for row in seed["exercises"]}
qu_by_id = {row["id"]: row["enTitle"] for row in seed["quests"]}
adv_by_id = {row["id"]: row["enTitle"] for row in seed["adventures"]}
step_by_id = {row["id"]: row for row in seed["steps"]}

for row in seed["exercises"]:
    name, description = EXERCISES[row["id"]]
    parts.append(
        update(
            "exercises",
            [f"`zhName` = {sql_str(name)}", f"`zhDescription` = {sql_str(description)}"],
            f"WHERE `enName` = {sql_str(row['enName'])} AND `creator` = 'Admin';",
        )
    )

for row in seed["quests"]:
    title, description = QUESTS[row["id"]]
    parts.append(
        update(
            "quests",
            [f"`zhTitle` = {sql_str(title)}", f"`zhDescription` = {sql_str(description)}"],
            f"WHERE `enTitle` = {sql_str(row['enTitle'])} AND `author` = 'Admin';",
        )
    )

for row in seed["adventures"]:
    title, description = ADVENTURES[row["id"]]
    parts.append(
        update(
            "adventures",
            [f"`zhTitle` = {sql_str(title)}", f"`zhDescription` = {sql_str(description)}"],
            f"WHERE `enTitle` = {sql_str(row['enTitle'])} AND `author` = 'Admin';",
        )
    )

for row in seed["steps"]:
    narrative = STEPS[row["id"]]
    sets = [f"`zhNarrative` = {sql_str(narrative)}"]
    if row["id"] in STEP_OUTROS:
        sets.append(f"`zhOutroNarrative` = {sql_str(STEP_OUTROS[row['id']])}")
    where = (
        f"WHERE `stepIndex` = {row['stepIndex']}\n"
        "    AND `adventureId` = (\n"
        f"        SELECT `id` FROM `adventures` WHERE `enTitle` = {sql_str(row['adventure'])} AND `author` = 'Admin'\n"
        "    );"
    )
    parts.append(update("adventure_steps", sets, where))

# The header comment rides with the first statement, the way 0058 and 0059 lay out: no
# statement-breakpoint between the comment block and the first statement.
FILL = parts[0] + "\n" + "\n--> statement-breakpoint\n".join(parts[1:]) + "\n"

with open("drizzle/0074_chinese_columns.sql", "w", encoding="utf-8", newline="\n") as f:
    f.write(COLUMNS)
with open("drizzle/0075_the_catalogue_in_chinese.sql", "w", encoding="utf-8", newline="\n") as f:
    f.write(FILL)

print("wrote drizzle/0074_chinese_columns.sql and drizzle/0075_the_catalogue_in_chinese.sql")
print("statements in 0075:", FILL.count("UPDATE "))
