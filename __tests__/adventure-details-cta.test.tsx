import { render, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import AdventureDetailsScreen from "@/app/(tabs)/adventures/[id]";
import "@/i18n";
import config from "@/tamagui.config";

// Regression test for 6ed496a: a "boss" adventure is a multi-step campaign that
// culminates in a boss fight on its final step — the CTA must not claim
// "Fight Boss" while step 1 (a regular warm-up step) is what's actually next.

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "1" }),
  // The screen loads on focus; in tests "focused" is simply "mounted".
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
  useSettingsStore: (selector?: (s: { language: string; reducedMotion: boolean }) => unknown) => {
    const state = { language: "en", reducedMotion: false };
    return selector ? selector(state) : state;
  },
}));

jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: jest.fn(), showSuccess: jest.fn(), showInfo: jest.fn() }),
}));

function mockStep(stepIndex: number) {
  return {
    stepIndex,
    imagePath: null,
    enNarrative: "",
    frNarrative: "",
    quest: {
      enTitle: `Step ${stepIndex}`,
      frTitle: `Étape ${stepIndex}`,
      exercises: [],
    },
  };
}

// The screen reads the fight to draw its boss panel. Mocked to null — this test is about which
// CTA a *fresh* campaign shows, and a campaign nobody has started has no fight row yet.
jest.mock("@/db/bossFights", () => ({
  getBossFightByAdventure: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/db", () => ({
  Difficulty: { Easy: "easy", Medium: "medium", Hard: "hard" },
  getAdventureDetails: jest.fn().mockResolvedValue({
    adventure: {
      kind: "boss",
      enTitle: "The Golem",
      frTitle: "Le Golem",
      enDescription: "",
      frDescription: "",
      imagePath: null,
    },
    steps: [mockStep(0), mockStep(1)],
  }),
  getActiveAdventureRun: jest.fn().mockResolvedValue(null),
  getFinishedRunCountsByAdventure: jest.fn().mockResolvedValue(new Map()),
  listExercises: jest.fn().mockResolvedValue([]),
  getRecentSessionHistory: jest.fn().mockResolvedValue([]),
  startAdventureRun: jest.fn(),
  suggestDifficultyFromSessions: jest.fn().mockReturnValue("medium"),
  estimateQuestTemplateSeconds: jest.fn().mockReturnValue(300),
  adventureWeeks: jest.fn().mockReturnValue(1),
}));

test("boss adventure CTA reads Start Adventure on step 1, not Fight Boss", async () => {
  const { findByText, queryByText } = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <AdventureDetailsScreen />
    </TamaguiProvider>,
  );

  expect(await findByText("Start Adventure")).toBeVisible();
  expect(queryByText("Fight Boss")).toBeNull();
});

test("a completed adventure offers a replay and wears its stars", async () => {
  const db = require("@/db") as { getFinishedRunCountsByAdventure: jest.Mock };
  db.getFinishedRunCountsByAdventure.mockResolvedValue(new Map([[1, 2]]));

  const { findByText, getByText, queryByText } = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <AdventureDetailsScreen />
    </TamaguiProvider>,
  );

  expect(await findByText("Replay Adventure")).toBeVisible();

  // The stars live inside the details Card, which mounts with `enterStyle={{ opacity: 0, … }}`.
  // `findByText` resolves the moment the node joins the tree — sometimes mid-animation, while an
  // ancestor is still fully transparent — so asserting visibility straight off it failed about
  // one run in three. `waitFor` retries until the enter transition has settled, which keeps the
  // assertion (they must be *visible*, not merely rendered) instead of weakening it to a
  // truthiness check. The CTA above sits outside that Card and never raced.
  await waitFor(() => expect(getByText("★★")).toBeVisible());

  expect(queryByText("Start Adventure")).toBeNull();
});

// The difficulty tag is the suggestion made visible: `Difficulty` is now the same type as the
// stored code, so nothing converts between the two — the label has to come straight from it.
test.each([
  ["easy", "Easy"],
  ["hard", "Hard"],
])("the tag wears the suggested difficulty (%s)", async (suggested, label) => {
  const db = require("@/db") as { suggestDifficultyFromSessions: jest.Mock };
  db.suggestDifficultyFromSessions.mockReturnValue(suggested);

  const { findByText } = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <AdventureDetailsScreen />
    </TamaguiProvider>,
  );

  expect(await findByText(label)).toBeTruthy();
});
