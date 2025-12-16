// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import m0000 from "./0000_flaky_riptide.sql";
import m0001 from "./0001_narrow_giant_girl.sql";
import m0002 from "./0002_seed_exercises.sql";
import m0003 from "./0003_quick_thunderbird.sql";
import m0004 from "./0004_seed_quest_couper_du_bois.sql";
import m0005 from "./0005_add_exercises_creator.sql";
import m0006 from "./0006_add_completed_history.sql";
import m0007 from "./0007_add_exercise_equipment_and_timing_and_quest_rest.sql";
import m0008 from "./0008_seed_more_quests.sql";
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
  },
};
