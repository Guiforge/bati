import { act, fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { PainStopView } from "@/components/session/PainStopView";
import { useSessionStore } from "@/stores/session";
import config from "@/tamagui.config";

/**
 * What a hero reads after stopping because it hurts: the one line and the Safety page, no figure and
 * no failure word. And the sets reach the journal before anything says nothing was lost.
 */
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/quests", () => ({}));
jest.mock("@/db/preferences", () => ({
  preferences: {
    setSavedSession: jest.fn().mockResolvedValue(undefined),
    clearSavedSession: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("@/db", () => ({ preferences: {} }));
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn(), t: (key: string) => key } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, dismissTo: mockDismissTo }),
}));

const SET = { exerciseId: 1, sortOrder: 0, result: { type: "reps" as const, value: 10 } };
const saveSession = jest.fn();
const quitSession = jest.fn();

async function mount(results: (typeof SET)[]) {
  useSessionStore.setState({ results, saveSession, quitSession, stopReason: "pain" });
  let view!: ReturnType<typeof render>;
  await act(() => {
    view = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 360, height: 640 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <PainStopView />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  return view;
}

beforeEach(() => {
  jest.clearAllMocks();
  saveSession.mockResolvedValue({ sessionId: 1 });
});

test("saves the sets, then says the line and offers the Safety page", async () => {
  const view = await mount([SET]);

  expect(saveSession).toHaveBeenCalledTimes(1);
  expect(view.getByTestId("villager-line-block").props.accessibilityLabel).toContain(
    "session.pain_stop_line",
  );

  await act(async () => fireEvent.press(view.getByTestId("pain-stop-safety")));
  expect(mockPush).toHaveBeenCalledWith("/safety");
  expect(quitSession).not.toHaveBeenCalled();
});

test("Continue goes home, past any next step of a campaign", async () => {
  const view = await mount([SET]);
  await act(async () => fireEvent.press(view.getByTestId("pain-stop-continue")));
  expect(quitSession).toHaveBeenCalledTimes(1);
  expect(mockDismissTo).toHaveBeenCalledWith("/");
  expect(mockPush).not.toHaveBeenCalled();
});

test("a stop before any set writes nothing and says the same line", async () => {
  const view = await mount([]);
  expect(saveSession).not.toHaveBeenCalled();
  expect(view.getByTestId("villager-line-block")).toBeTruthy();
});

test("nothing says 'nothing is lost' until it is true: a failed save offers Retry", async () => {
  saveSession.mockRejectedValueOnce(new Error("disk full"));
  const view = await mount([SET]);

  expect(view.queryByTestId("villager-line-block")).toBeNull();
  expect(view.queryByTestId("pain-stop-continue")).toBeNull();

  await act(async () => fireEvent.press(view.getByTestId("pain-stop-retry")));

  expect(saveSession).toHaveBeenCalledTimes(2);
  expect(view.getByTestId("villager-line-block")).toBeTruthy();
});
