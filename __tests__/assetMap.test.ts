import {
  ADVENTURE_ASSETS,
  EXERCISE_ASSETS,
  getAdventureAsset,
  getExerciseAsset,
  getQuestAsset,
  QUEST_ASSETS,
} from "@/constants/assetMap";

describe("assetMap", () => {
  // The seeds still store `.png` paths for the exercises whose art is now `.jpg` (0001/0010 were
  // never rewritten), so stripping the extension is load-bearing, not cosmetic.
  test("resolves exercise assets from database image paths", () => {
    expect(getExerciseAsset("assets/images/exercises/squat.png")).toBe(EXERCISE_ASSETS.squat);
  });

  test("resolves the renamed 0023 exercises from their seeded path", () => {
    expect(getExerciseAsset("assets/images/exercises/hollow_body_hold.jpg")).toBe(
      EXERCISE_ASSETS.hollow_body_hold,
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
