import {
  ADVENTURE_ASSETS,
  EXERCISE_ASSETS,
  getAdventureAsset,
  getExerciseAsset,
  getQuestAsset,
  QUEST_ASSETS,
} from "@/constants/assetMap";

describe("assetMap", () => {
  test("resolves exercise assets from database image paths", () => {
    expect(getExerciseAsset("assets/images/exercises/goblin_squat.png")).toBe(
      EXERCISE_ASSETS.goblin_squat,
    );
  });

  test("maps alchemist hollow body hold content key to bundled file", () => {
    expect(getExerciseAsset("assets/images/exercises/alchemist_hollow_body_hold.png")).toBe(
      EXERCISE_ASSETS.alchemist_hollow_body_hold,
    );
  });

  // getQuestAsset/getBossAsset/getAdventureAsset used to do an exact-key lookup instead of
  // stripping the directory + extension, so a real DB imagePath (full bundled path) always
  // missed and fell back to the placeholder.
  test("resolves quest cover assets from full database image paths", () => {
    expect(getQuestAsset("assets/images/quests/escape_collapsing_mine.jpg")).toBe(
      QUEST_ASSETS.escape_collapsing_mine,
    );
  });

  test("resolves adventure cover assets from full database image paths", () => {
    expect(getAdventureAsset("assets/images/adventures/scout_trial.jpg")).toBe(
      ADVENTURE_ASSETS.scout_trial,
    );
  });
});
