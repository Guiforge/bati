import { fireEvent, render, screen } from "@testing-library/react-native";
import { Keyboard, ScrollView } from "react-native";
import { TamaguiProvider } from "tamagui";

import { ExercisePickerSheet } from "@/components/quests/ExercisePickerSheet";
import type { Exercise } from "@/db/exercises";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * What the sheet has to put back when it leaves, because nothing else will.
 *
 * The list's offset survives a close and a narrowing search — RN never clamps it — so the picker
 * reopened mid-catalogue, and searching from a scrolled position hid both the matches and the
 * "nothing matches" line above the fold. And the search input keeps the focus after the sheet is
 * gone: every keystroke aimed at the screen behind landed in a box nobody could see, which is
 * how a picker reopened pre-filled with garbage and no rows.
 */

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

jest.mock("@/db/exercises", () => ({ ADMIN_CREATOR: "Admin" }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => true }));

function makeExercise(id: number, enName: string): Exercise {
  return {
    id,
    enName,
    frName: enName,
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
  };
}

const EXERCISES = [makeExercise(1, "Squat"), makeExercise(2, "Push Up")];

const renderSheet = async (onOpenChange = jest.fn()) => {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <ExercisePickerSheet
        exercises={EXERCISES}
        pickedIds={[]}
        language="en"
        open
        onOpenChange={onOpenChange}
        title="Add an exercise"
        onPick={jest.fn()}
        pickAction={null}
        bottomInset={0}
      />
    </TamaguiProvider>,
  );
  return onOpenChange;
};

it("sends the list back to the top when the search narrows it", async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo").mockImplementation(() => {});
  await renderSheet();

  await fireEvent.changeText(screen.getByPlaceholderText("Search"), "squ");

  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
  scrollTo.mockRestore();
});

it("closes with the keyboard down and the list back at the top", async () => {
  const dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
  const scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo").mockImplementation(() => {});
  const onOpenChange = await renderSheet();

  await fireEvent.press(screen.getByLabelText("Close"));

  expect(dismiss).toHaveBeenCalled();
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
  dismiss.mockRestore();
  scrollTo.mockRestore();
});
