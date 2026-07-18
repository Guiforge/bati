import { EXERCISE_ASSETS, getExerciseAsset } from "@/constants/assetMap";

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
});
