// This file is required for Expo/React Native SQLite migrations
// https://orm.drizzle.team/quick-sqlite/expo
// IMPORTANT: migration keys must be in format "m0000", "m0001", etc.
// matching the journal entry idx values

import m0000 from "./0000_schema.sql";
import m0001 from "./0001_seed_exercises.sql";
import m0002 from "./0002_seed_quests.sql";
import m0003 from "./0003_seed_adventures.sql";
import m0004 from "./0004_seed_village.sql";
import journal from "./meta/_journal.json";

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
  },
};
