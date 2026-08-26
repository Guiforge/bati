import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { ExercisePickerSheet } from "@/components/quests/ExercisePickerSheet";
import type { Exercise } from "@/db/exercises";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * The picker's one job beyond listing: tell two identically-named movements apart.
 *
 * A hero may name a movement exactly as seed content is named, so a row the hero wrote wears
 * "Yours". The swap sheet passes its own `captionFor`, and the badge is its nullish fallback —
 * which the swap sheet used to defeat by returning an element that rendered nothing, invisible
 * to the coalesce. `captionFor` returns a string now, so only these two cases exist.
 */

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

// The sheet needs one constant from here; the module opens the database at import.
jest.mock("@/db/exercises", () => ({ ADMIN_CREATOR: "Admin" }));

// Reaches the settings store, which reaches the database. The sheet only asks it for animation.
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => true }));

function makeExercise(over: Partial<Exercise> & Pick<Exercise, "id" | "enName">): Exercise {
  return {
    frName: over.enName,
    enDescription: "",
    frDescription: "",
    imagePath: "assets/placeholder.webp",
    creator: "Admin",
    difficulty: "medium",
    equipment: "none",
    style: "calisthenics",
    secondsPerRep: 3,
    muscles: ["back"],
    pattern: "pull_horizontal",
    prerequisiteExerciseId: null,
    retiredAt: null,
    ...over,
  };
}

const SEED_DEAD_BUG = makeExercise({ id: 1, enName: "Dead Bug" });
const HERO_DEAD_BUG = makeExercise({ id: 2, enName: "Dead Bug", creator: "hero" });

const renderSheet = (captionFor?: (exercise: Exercise) => string | null) =>
  render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <ExercisePickerSheet
        exercises={[SEED_DEAD_BUG, HERO_DEAD_BUG]}
        pickedIds={[]}
        language="en"
        open
        onOpenChange={jest.fn()}
        title="Replace this movement"
        onPick={jest.fn()}
        pickAction={null}
        captionFor={captionFor}
        bottomInset={0}
      />
    </TamaguiProvider>,
  );

describe("the picker's hero badge", () => {
  it("marks the hero's row when the caller has no caption of its own", async () => {
    await renderSheet();

    expect(screen.getAllByText("Dead Bug")).toHaveLength(2);
    expect(screen.getAllByText("Yours")).toHaveLength(1);
  });

  it("still marks it when the caller returns nothing for that row", async () => {
    // The swap sheet's shape: a caption for the candidates it ranked, nothing for the rest.
    await renderSheet((exercise) => (exercise.id === SEED_DEAD_BUG.id ? "An easier rung" : null));

    expect(screen.getByText("An easier rung")).toBeTruthy();
    expect(screen.getAllByText("Yours")).toHaveLength(1);
  });

  it("lets the caller's caption win on a row it does describe", async () => {
    await renderSheet(() => "Same family");

    expect(screen.getAllByText("Same family")).toHaveLength(2);
    expect(screen.queryByText("Yours")).toBeNull();
  });
});
