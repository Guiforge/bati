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
import m0009 from "./0009_seed_missing_covers.sql";
import m0010 from "./0010_seed_bodyweight_exercises.sql";
import m0011 from "./0011_seed_bodyweight_exercise_images.sql";
import m0012 from "./0012_fix_exercise_muscles.sql";
import m0013 from "./0013_rebalance_quests.sql";
import m0014 from "./0014_seed_spec_quests.sql";
import m0015 from "./0015_seed_pull_exercises.sql";
import m0016 from "./0016_seed_new_quests.sql";
import m0017 from "./0017_seed_adventures.sql";
import m0018 from "./0018_delete_dumbbell_exercise.sql";
import m0019 from "./0019_seed_quest_archetype.sql";
import m0020 from "./0020_movement_patterns.sql";
import m0021 from "./0021_pattern_balance.sql";
import m0022 from "./0022_progression_ladder.sql";
import m0023 from "./0023_official_exercise_names.sql";
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
    m0019,
    m0020,
    m0021,
    m0022,
    m0023,
  },
};
