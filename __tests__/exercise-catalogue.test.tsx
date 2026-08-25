import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import ExerciseCatalogue from "@/app/exercises/index";
import type { Exercise } from "@/db/exercises";
import "@/i18n";
import config from "@/tamagui.config";

// roadmap 4.22: the catalogue is the only way to reach a movement on purpose, and the "leads
// to" caption is 4.4's ladder seen from the list. Both are asserted on the tree's contents —
// not on "the screen rendered" — because a list that shows the wrong rows still renders.

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  // The catalogue reloads on focus since the hero can write to it; the real hook needs a
  // navigation container, so run the effect once like a mount.
  useFocusEffect: (effect: () => undefined | (() => void)) => {
    const { useEffect } = require("react");
    useEffect(effect, [effect]);
  },
}));

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector?: (s: { language: string }) => unknown) => {
    const state = { language: "en" };
    return selector ? selector(state) : state;
  },
}));

// LegendList virtualizes against a real layout, which jest has none of. Rendering every row
// keeps the assertions about *which* rows survive the filters, which is what this screen does.
jest.mock("@legendapp/list/react-native", () => {
  const { View } = require("react-native");
  return {
    LegendList: ({
      data,
      renderItem,
      keyExtractor,
    }: {
      data: unknown[];
      renderItem: (arg: { item: unknown; index: number }) => React.ReactNode;
      keyExtractor: (item: unknown) => string;
    }) => (
      <View>
        {data.map((item, index) => (
          <View key={keyExtractor(item)}>{renderItem({ item, index })}</View>
        ))}
      </View>
    ),
  };
});

const mockListExercises = jest.fn();
jest.mock("@/db/exercises", () => ({
  listExercises: (...args: unknown[]) => mockListExercises(...args),
  ADMIN_CREATOR: "Admin",
}));

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
    // No `as Exercise`: the cast is what let this fixture miss `retiredAt` when the column
    // landed, and a fixture the compiler cannot check is a fixture that drifts from the row.
  };
}

const TABLE_ROW = makeExercise({ id: 1, enName: "Table Row" });
const INVERTED_ROW = makeExercise({ id: 2, enName: "Inverted Row", prerequisiteExerciseId: 1 });
const PUSH_UP = makeExercise({
  id: 3,
  enName: "Push-up",
  muscles: ["chest"],
  pattern: "push_horizontal",
});

const renderScreen = () =>
  render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <ExerciseCatalogue />
    </TamaguiProvider>,
  );

beforeEach(() => {
  mockPush.mockClear();
  mockListExercises.mockResolvedValue([TABLE_ROW, INVERTED_ROW, PUSH_UP]);
});

describe("exercise catalogue", () => {
  it("lists every movement, sorted by name", async () => {
    await renderScreen();

    await waitFor(() => expect(screen.getByText("Inverted Row")).toBeTruthy());
    expect(screen.getByText("Table Row")).toBeTruthy();
    expect(screen.getByText("Push-up")).toBeTruthy();
  });

  // 4.4: the ladder was in the database since `0022` and nowhere on screen.
  it("names what a movement leads to, and only where it leads somewhere", async () => {
    await renderScreen();

    await waitFor(() => expect(screen.getByText("leads to Inverted Row")).toBeTruthy());
    expect(screen.queryByText("leads to Table Row")).toBeNull();
    expect(screen.queryByText("leads to Push-up")).toBeNull();
  });

  it("keeps only the movements that lead somewhere when the ladder chip is on", async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Push-up")).toBeTruthy());

    await act(async () => fireEvent.press(screen.getByText("Ladder")));

    expect(screen.getByText("Table Row")).toBeTruthy();
    expect(screen.queryByText("Inverted Row")).toBeNull();
    expect(screen.queryByText("Push-up")).toBeNull();
  });

  it("narrows to the searched movement", async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Push-up")).toBeTruthy());

    await act(async () =>
      fireEvent.changeText(screen.getByPlaceholderText("Search a movement"), "push"),
    );

    expect(screen.getByText("Push-up")).toBeTruthy();
    expect(screen.queryByText("Table Row")).toBeNull();
  });

  it("offers a way out when the filters empty the list", async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Push-up")).toBeTruthy());

    await act(async () =>
      fireEvent.changeText(screen.getByPlaceholderText("Search a movement"), "burpee"),
    );
    expect(screen.getByText("No matches")).toBeTruthy();

    await act(async () => fireEvent.press(screen.getByText("Clear filters")));
    expect(screen.getByText("Push-up")).toBeTruthy();
  });

  it("opens the detail screen — the route that did not exist before", async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Table Row")).toBeTruthy());

    await act(async () =>
      fireEvent.press(screen.getByLabelText("Table Row, leads to Inverted Row")),
    );

    expect(mockPush).toHaveBeenCalledWith("/exercises/1");
  });
});
