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
import m0024 from "./0024_mobility_branch.sql";
import m0025 from "./0025_boss_art.sql";
import m0026 from "./0026_boss_pacing.sql";
import m0027 from "./0027_iron_golem.sql";
import m0028 from "./0028_retroactive_final_blow.sql";
import m0029 from "./0029_fr_tutoiement.sql";
import m0030 from "./0030_fr_exercise_casing.sql";
import m0031 from "./0031_fr_exercise_names.sql";
import m0032 from "./0032_calisthenics_rungs.sql";
import m0033 from "./0033_calisthenics_summits.sql";
import m0034 from "./0034_quest_round_rest.sql";
import m0035 from "./0035_hero_exercises.sql";
import m0036 from "./0036_hero_names_are_theirs.sql";
import m0037 from "./0037_xp_measures_effort.sql";
import m0038 from "./0038_sessions_name_themselves.sql";
import m0039 from "./0039_exercise_measure.sql";
import m0040 from "./0040_the_plan_nobody_read.sql";
import m0041 from "./0041_the_three_ways_out.sql";
import m0042 from "./0042_three_doors_out.sql";
import m0043 from "./0043_the_ground_covered.sql";
import m0044 from "./0044_the_ground_that_counted.sql";
import m0045 from "./0045_the_story_and_the_instruction.sql";
import m0046 from "./0046_the_time_it_took.sql";
import m0047 from "./0047_the_catalogue_says_tu.sql";
import m0048 from "./0048_word_must_travel.sql";
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
    m0024,
    m0025,
    m0026,
    m0027,
    m0028,
    m0029,
    m0030,
    m0031,
    m0032,
    m0033,
    m0034,
    m0035,
    m0036,
    m0037,
    m0038,
    m0039,
    m0040,
    m0041,
    m0042,
    m0043,
    m0044,
    m0045,
    m0046,
    m0047,
    m0048,
  },
};
