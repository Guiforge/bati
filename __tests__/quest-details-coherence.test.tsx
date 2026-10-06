import { render, waitFor, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";

import QuestDetails from "@/app/(tabs)/quests/[id]";
import { rawColors } from "@/constants/rawColors";
import "@/i18n";
import config from "@/tamagui.config";

// The second audit: "up to +N XP" is gold on the list card and was neutral here, and the
// difficulty tag ignored the palette every other difficulty marker uses.

jest.mock("@/hooks/useSetAside");

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    dismissTo: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: "5", level: "hard" }),
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

jest.mock("@/stores/session", () => ({
  useSessionStore: (select: (s: { startSession: unknown }) => unknown) =>
    select({ startSession: jest.fn() }),
  loadWarmupContext: () =>
    Promise.resolve({ enabled: false, totalSessions: 0, unavailable: new Set<string>() }),
}));

jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: jest.fn(), showSuccess: jest.fn(), showInfo: jest.fn() }),
}));

// A function declaration: jest.mock factories are hoisted above every `const`.
function mockQuest() {
  return {
    id: 5,
    enTitle: "Test Quest",
    frTitle: "Quête Test",
    enDescription: "",
    frDescription: "",
    imagePath: null,
    rounds: 3,
    restSeconds: 30,
    exercises: [] as unknown[],
  };
}

jest.mock("@/db", () => ({
  Difficulty: { Easy: "easy", Medium: "medium", Hard: "hard" },
  getQuestById: jest.fn().mockResolvedValue(mockQuest()),
  getQuestConfig: jest.fn().mockResolvedValue(null),
  applyQuestConfig: (quest: unknown) => quest,
  estimateQuestSeconds: jest.fn().mockReturnValue(300),
  estimateQuestXp: jest.fn().mockReturnValue(60),
  formatDurationEstimate: jest.fn().mockReturnValue("5 min"),
  indexExercises: jest.fn().mockReturnValue(new Map()),
  isUserQuest: jest.fn().mockReturnValue(false),
  saveQuestConfig: jest.fn().mockResolvedValue(undefined),
  hasQuestOverrides: jest.fn().mockReturnValue(false),
  ROUNDS_RANGE: { min: 1, max: 10 },
  REST_RANGE: { min: 0, max: 300 },
  TARGET_RANGE: { min: 1, max: 999 },
}));

jest.mock("@/db/exercises", () => ({
  listExercises: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/src/questFile", () => ({
  shareQuest: jest.fn(),
  importQuest: jest.fn(),
  pickQuestFile: jest.fn(),
  QuestFileError: class QuestFileError extends Error {},
}));

jest.mock("@/db/preferences", () => ({
  preferences: {
    getOwnedEquipment: jest.fn().mockResolvedValue(null),
    getSetAsideExercises: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("@/db/adventures-narrative", () => ({
  getAdventureStepNarrative: jest.fn().mockResolvedValue(null),
}));

async function renderQuestDetails() {
  const view = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <QuestDetails />
    </TamaguiProvider>,
  );
  await waitFor(() => expect(view.getByText("Test Quest")).toBeTruthy());
  return view;
}

describe("quests/[id] colour roles", () => {
  test("the XP estimate chip reads in gold", async () => {
    const view = await renderQuestDetails();
    const xp = view.getByText(/\+60 XP/);
    expect(StyleSheet.flatten(xp.props.style).color).toBe(rawColors.resourceGold);
  });

  test("the difficulty tag takes its difficulty colour", async () => {
    const view = await renderQuestDetails();
    const tag = within(view.getByTestId("quest-level-tag")).getByText("Hard");
    expect(StyleSheet.flatten(tag.props.style).color).toBe(rawColors.error);
  });
});
