import { fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { QuestExerciseRow } from "@/components/quests/QuestExerciseRow";
import type { QuestExercise } from "@/db/quests";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * The quest screen's movement list was three cards a third of a screen tall, so a hero who opened
 * it to read three names scrolled past art, how-to, equipment, tempo and four muscles to find
 * them (UX audit 2026-09-10). What the shut row owes is the three facts that decide whether to
 * run the quest: the name, the target, and what the hero managed last time.
 *
 * The assertion that matters in the first test is the second half of it — that the how-to is
 * *absent*. A row that quietly renders everything and only looks short is the same two screens.
 */

const exercise = {
  id: 7,
  enName: "Wall Sit",
  frName: "Chaise",
  enDescription: "Back flat on the wall, thighs level, hold.",
  frDescription: "Dos plat au mur, cuisses à l'horizontale, tiens.",
  imagePath: "",
  creator: "Admin",
  difficulty: "medium",
  equipment: "none",
  style: "isometric",
  secondsPerRep: 3,
  muscles: ["legs"],
  pattern: "squat",
  measure: "time",
  locomotion: null,
  prerequisiteId: null,
  retiredAt: null,
};

const slot = (over: Partial<QuestExercise> = {}): QuestExercise =>
  ({
    id: 1,
    exercise,
    images: [],
    target: { type: "time", value: 45 },
    ghost: { last: 39, best: 52 },
    ...over,
  }) as unknown as QuestExercise;

const onOpenExercise = jest.fn();

async function renderRow(over: Partial<QuestExercise> = {}, showTarget = true) {
  onOpenExercise.mockClear();
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <QuestExerciseRow
        qex={slot(over)}
        index={0}
        language="en"
        showTarget={showTarget}
        onOpenExercise={onOpenExercise}
      />
    </TamaguiProvider>,
  );
}

test("shut, the row is the name, the target and the last result, and nothing else", async () => {
  await renderRow();

  expect(screen.getByText("1. Wall Sit")).toBeTruthy();
  expect(screen.getByText("45s")).toBeTruthy();
  expect(screen.getByText("Last: 39s")).toBeTruthy();

  expect(screen.queryByText(exercise.enDescription)).toBeNull();
  expect(screen.queryByText("Legs")).toBeNull();
  expect(screen.queryByText("See the movement")).toBeNull();
});

test("a tap opens the how-to, and the movement's own screen keeps a door", async () => {
  await renderRow();

  await fireEvent.press(screen.getByText("1. Wall Sit"));

  expect(screen.getByText(exercise.enDescription)).toBeTruthy();
  await fireEvent.press(screen.getByText("See the movement"));
  expect(onOpenExercise).toHaveBeenCalledTimes(1);

  // Shut again: the row is a disclosure, not a one-way door.
  await fireEvent.press(screen.getByText("1. Wall Sit"));
  expect(screen.queryByText(exercise.enDescription)).toBeNull();
});

// On an outing set by distance the slot's seconds are the fallback `outingGoal` never reads, so a
// chip saying "15 min" beside a 5 km goal is the screen contradicting itself.
test("the target is dropped when the caller says the goal is named elsewhere", async () => {
  await renderRow({ target: { type: "time", value: 900 } }, false);

  expect(screen.getByText("1. Wall Sit")).toBeTruthy();
  expect(screen.queryByText("15 min")).toBeNull();
});
