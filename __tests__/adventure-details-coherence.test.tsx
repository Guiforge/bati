import { render, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";

import AdventureDetailsScreen from "@/app/(tabs)/adventures/[id]";
import { rawColors } from "@/constants/rawColors";
import "@/i18n";
import config from "@/tamagui.config";

// Colour roles on the adventure screen; mocks as adventure-details-cta. (Regression note from the original: 6ed496a): a "boss" adventure is a multi-step campaign that
// culminates in a boss fight on its final step — the CTA must not claim
// "Fight Boss" while step 1 (a regular warm-up step) is what's actually next.

const mockPush = jest.fn();

// The hero's reminder days set the weeks chip's pace (adventure-weeks-label.test.ts); none here.
jest.mock("@/db/reminders", () => ({ getReminderDays: async () => ({}) }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
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

function mockStep(stepIndex: number, questId = 100 + stepIndex) {
  return {
    stepIndex,
    questId,
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
  suggestDifficultyFromSessions: jest.fn().mockReturnValue({ level: "hard", adjusted: false }),
  previewQuest: jest.fn().mockReturnValue({ seconds: 300, xp: 60 }),
}));

// The screen reads the hero's ladder and records once for every step, so the head card prices a
// step the way the quest screen behind the CTA will. Neither is what these tests are about.
jest.mock("@/db/quests", () => ({
  QUEST_AS_WRITTEN: { served: new Map(), history: new Map() },
  loadSlotJournal: jest.fn().mockResolvedValue({ served: new Map(), history: new Map() }),
}));

async function mount() {
  const view = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <AdventureDetailsScreen />
    </TamaguiProvider>,
  );
  await view.findByText("The Golem");
  return view;
}

test("the per-step XP chip reads in gold", async () => {
  const view = await mount();
  const xp = await view.findByText(/\+60 XP/);
  expect(StyleSheet.flatten(xp.props.style).color).toBe(rawColors.resourceGold);
});

test("the level tag takes its difficulty colour", async () => {
  const view = await mount();
  const tag = within(view.getByTestId("adventure-level-tag")).getByText("Hard");
  expect(StyleSheet.flatten(tag.props.style).color).toBe(rawColors.error);
});
