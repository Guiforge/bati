import { render } from "@testing-library/react-native";
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
  listExercises: jest.fn().mockResolvedValue([]),
  getRecentSessionHistory: jest.fn().mockResolvedValue([]),
  startAdventureRun: jest.fn(),
  suggestDifficultyFromSessions: jest.fn().mockReturnValue("medium"),
  estimateQuestTemplateSeconds: jest.fn().mockReturnValue(300),
  formatDuration: jest.fn().mockReturnValue("5 min"),
}));

test("boss adventure CTA reads Start Adventure on step 1, not Fight Boss", async () => {
  const { findByText, queryByText } = await render(
    <TamaguiProvider config={config}>
      <AdventureDetailsScreen />
    </TamaguiProvider>,
  );

  expect(await findByText("Start Adventure")).toBeVisible();
  expect(queryByText("Fight Boss")).toBeNull();
});
