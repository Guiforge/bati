import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import QuestDetails from "@/app/(tabs)/quests/[id]";
import "@/i18n";
import config from "@/tamagui.config";

// Regression coverage for the chevron in quests/[id].tsx: a quest opened from an adventure
// step must return to that adventure, everything else must fall back to the gallery — even
// a malformed adventureId, which is truthy but not a real destination.

const mockNavigate = jest.fn();
const mockDismissTo = jest.fn();
let mockParams: { id?: string; adventureId?: string } = { id: "5" };

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    navigate: mockNavigate,
    dismissTo: mockDismissTo,
  }),
  useLocalSearchParams: () => mockParams,
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
  useSettingsStore: (selector?: (s: { language: string }) => unknown) => {
    const state = { language: "en" };
    return selector ? selector(state) : state;
  },
}));

jest.mock("@/stores/session", () => ({
  useSessionStore: () => ({ startSession: jest.fn() }),
}));

jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: jest.fn(), showSuccess: jest.fn(), showInfo: jest.fn() }),
}));

// A function declaration, not a const: babel-plugin-jest-hoist moves the jest.mock() calls
// above every import, which in turn moves them above any `const` in this file — a `const`
// referenced from the factory would be read in its temporal dead zone. A function declaration
// is fully hoisted, so it is safe to call from inside the factory below.
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

jest.mock("@/db/preferences", () => ({
  preferences: { getOwnedEquipment: jest.fn().mockResolvedValue(null) },
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

describe("quests/[id] chevron", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockDismissTo.mockClear();
  });

  test("with an adventureId, the chevron navigates back to that adventure", async () => {
    mockParams = { id: "5", adventureId: "12" };
    const { getByLabelText } = await renderQuestDetails();

    await fireEvent.press(getByLabelText("Go back"));

    expect(mockNavigate).toHaveBeenCalledWith("/adventures/12");
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  test("with no adventureId, the chevron dismisses to the gallery", async () => {
    mockParams = { id: "5" };
    const { getByLabelText } = await renderQuestDetails();

    await fireEvent.press(getByLabelText("Go back"));

    expect(mockDismissTo).toHaveBeenCalledWith("/quests");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("a malformed adventureId falls back to the gallery instead of a dead-end screen", async () => {
    mockParams = { id: "5", adventureId: "undefined" };
    const { getByLabelText } = await renderQuestDetails();

    await fireEvent.press(getByLabelText("Go back"));

    expect(mockDismissTo).toHaveBeenCalledWith("/quests");
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
