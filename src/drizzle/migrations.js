// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import m0000 from "./0000_schema.sql";
import m0001 from "./0001_seed_exercises.sql";
import m0002 from "./0002_seed_quests.sql";
import m0003 from "./0003_seed_adventures.sql";
import m0004 from "./0004_seed_village.sql";
import m0005 from "./0005_village_resources.sql";
import m0006 from "./0006_content_expansion.sql";
import m0007 from "./0007_add_image_paths.sql";
import m0008 from "./0008_seed_images.sql";
import m0009 from "./0009_add_quest_columns.sql";
import m0010 from "./0010_audit_and_content.sql";
import m0011 from "./0011_backfill_quest_exercises.sql";
import journal from "./meta/_journal.json";

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
    m0005,
    m0006,
    m0007,
    m0008,
    m0009,
    m0010,
    m0011,
  },
};
