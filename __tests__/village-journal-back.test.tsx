import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider, Theme } from "tamagui";
import SessionDetailScreen from "@/app/(tabs)/journal/[id]";
import { BuildingFacts } from "@/components/village/VillageDetailSheet";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * A session opened from the village card comes back to the village, not to Home; one opened from
 * the Journal keeps the stack's own back. Both ends of the door: the row's href, the screen's back.
 */

const mockRouter = { back: jest.fn(), push: jest.fn(), dismissTo: jest.fn(), navigate: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => mockParams,
}));
jest.mock("@/components/journal/PastSessionSheet", () => ({ PastSessionSheet: () => null }));
jest.mock("@/components/journal/QuestLog", () => ({ QuestLog: () => null }));
jest.mock("@/components/journal/KillReport", () => ({ KillReport: () => null }));
jest.mock("@/components/journal/sessionLog", () => ({
  readSession: () =>
    Promise.resolve({
      status: "ready",
      log: {
        session: {
          id: 5,
          uuid: "u5",
          questId: null,
          userLevel: "medium",
          durationSeconds: 60,
          xpEarned: 1,
          notes: "",
          performedAt: new Date(),
          leaguesM: null,
          movingSeconds: null,
          ascentM: null,
          outing: null,
          byHand: null,
          label: null,
          exercises: [],
        },
      },
      kill: null,
    }),
}));

async function mountScreen() {
  await act(async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <Theme name="journal">
            <SessionDetailScreen />
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
}

beforeEach(() => jest.clearAllMocks());

describe("back from a session", () => {
  test("the village card's row opens the session marked from the village", async () => {
    mockParams = {};
    const building = {
      code: "archery_range",
      level: 2,
      driver: "muscle",
      relatedMuscle: "chest",
      metricValue: 10,
      nextTarget: 20,
      tier: 2,
      kept: false,
    };
    await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <BuildingFacts
          surCarte
          building={building as never}
          extra={{
            kind: "sessions",
            sessions: [
              {
                sessionId: 42,
                performedAt: new Date(),
                volume: 10,
                enTitle: "Push day",
                frTitle: "",
                deTitle: "",
                esTitle: "",
                ruTitle: "",
                zhTitle: "",
              },
            ],
          }}
          language="en"
          feeds={null}
          years={null}
          formatDate={() => ""}
          onClose={jest.fn()}
        />
      </TamaguiProvider>,
    );
    await fireEvent.press(screen.getByLabelText(/Open in the Journal: Push day/));
    expect(mockRouter.push).toHaveBeenCalledWith("/journal/42?from=village");
  });

  const base = {
    code: "archery_range",
    level: 2,
    driver: "muscle",
    relatedMuscle: "chest",
    metricValue: 10,
    nextTarget: 20,
    tier: 2,
    kept: false,
  };
  const extra = {
    kind: "sessions",
    sessions: [
      {
        sessionId: 42,
        performedAt: new Date(),
        volume: 10,
        enTitle: "Push day",
        frTitle: "",
        deTitle: "",
        esTitle: "",
        ruTitle: "",
        zhTitle: "",
      },
    ],
    exercises: [
      {
        exerciseId: 7,
        volume: 5,
        enName: "Bench press",
        frName: "",
        deName: "",
        esName: "",
        ruName: "",
        zhName: "",
      },
    ],
  };
  async function mountFacts(surCarte: boolean, onClose: () => void) {
    await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <BuildingFacts
          surCarte={surCarte}
          building={base as never}
          extra={extra as never}
          language="en"
          feeds={null}
          years={null}
          formatDate={() => ""}
          onClose={onClose}
        />
      </TamaguiProvider>,
    );
  }

  test("on the card, a linked row pushes without closing, so Back finds the panel open", async () => {
    const onClose = jest.fn();
    await mountFacts(true, onClose);
    await fireEvent.press(screen.getByLabelText(/Open in the Journal: Push day/));
    await fireEvent.press(screen.getByLabelText(/Bench press/));
    expect(mockRouter.push).toHaveBeenCalledWith("/journal/42?from=village");
    expect(mockRouter.push).toHaveBeenCalledWith("/exercises/7");
    expect(onClose).not.toHaveBeenCalled();
  });

  test("on the card the movements come before the sessions that raised it", async () => {
    await mountFacts(true, jest.fn());
    const flat = JSON.stringify(screen.toJSON());
    expect(flat.indexOf("Bench press")).toBeGreaterThan(-1);
    expect(flat.indexOf("Bench press")).toBeLessThan(flat.indexOf("Push day"));
  });

  test("from the village, the back arrow unwinds the tab and lands on the village", async () => {
    mockParams = { id: "5", from: "village" };
    await mountScreen();
    await fireEvent.scroll(screen.getByTestId("journal-detail-scroll"), {
      nativeEvent: { contentOffset: { y: 400 } },
    });
    await fireEvent.press(screen.getByTestId("journal-fixed-back"));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith("/journal");
    expect(mockRouter.navigate).toHaveBeenCalledWith("/(tabs)/village");
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
