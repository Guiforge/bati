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
import m0009 from "./0009_add_completed_xp.sql";
import m0010 from "./0010_add_adventures.sql";
import m0011 from "./0011_campaign_adventures.sql";
import m0012 from "./0012_add_author_and_seed_campaigns.sql";
import m0013 from "./0013_localize_adventure_steps_narrative.sql";
import m0014 from "./0014_add_boss_fights.sql";
import m0015 from "./0015_add_session_feedback.sql";
import m0016 from "./0016_add_resources.sql";
import m0017 from "./0017_add_village_buildings.sql";
import m0018 from "./0018_add_goals.sql";
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
    m0012,
    m0013,
    m0014,
    m0015,
    m0016,
    m0017,
    m0018,
  },
};
