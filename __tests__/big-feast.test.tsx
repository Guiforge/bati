import { act, fireEvent, render } from "@testing-library/react-native";
import { BackHandler } from "react-native";
import { withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import BigFeastScreen from "@/app/big-feast";
import { BigFeastView } from "@/components/session/BigFeastView";
import { revealBody, revealTitle } from "@/components/session/bigFeastText";
import type { Feast } from "@/components/session/feasts";
import { i18n } from "@/i18n";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

// A shared value is a plain box and every animation helper just records that it was asked for:
// what is checked is what the screen starts, not what the UI thread would draw.
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: { View },
    Easing: { linear: (t: number) => t },
    interpolate: () => 0,
    useAnimatedStyle: jest.fn((worklet: () => object) => worklet()),
    useSharedValue: (v: unknown) => require("react").useState(() => ({ value: v }))[0],
    withDelay: (_ms: number, animation: unknown) => animation,
    withRepeat: jest.fn(() => "loop"),
    withSpring: jest.fn(() => "spring"),
    withTiming: jest.fn(() => "timing"),
  };
});

let mockReduced = false;
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduced }));

const mockMark = jest.fn().mockResolvedValue(undefined);
jest.mock("@/db/preferences", () => ({
  preferences: { markBigFeastShown: (...a: unknown[]) => mockMark(...a) },
}));
jest.mock("@/db/completed", () => ({ countSessions: jest.fn().mockResolvedValue(118) }));

const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));

const bear: Extract<Feast, { kind: "reveal" }> = {
  kind: "reveal",
  size: "large",
  id: "reveal-0",
  animal: "bear",
  quarters: null,
  firstEight: [
    ["strength", 5],
    ["yoga", 3],
  ],
  late: false,
};
const tier: Extract<Feast, { kind: "tier" }> = {
  kind: "tier",
  size: "large",
  id: "tier-0",
  tier: 9,
  level: 20,
};

async function lang(l: "fr" | "en" | "de" | "es") {
  await i18n.changeLanguage(l);
  useSettingsStore.setState({ language: l });
}

const wrap = (node: React.ReactNode) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 360, height: 640 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    }}
  >
    <TamaguiProvider config={config} defaultTheme="dark">
      {node}
    </TamaguiProvider>
  </SafeAreaProvider>
);

afterEach(async () => {
  await act(() => i18n.changeLanguage("en"));
});

describe("the reveal's text", () => {
  const t = () => i18n.t.bind(i18n);

  test("on the 8th session it says 8 sessions, and for a hero at the update it says the first 8", async () => {
    await lang("fr");
    expect(revealBody(t(), bear)).toBe("5 de tes 8 séances étaient de la force.");
    expect(revealBody(t(), { ...bear, late: true })).toBe(
      "Cela remonte à ta 8e séance : 5 de tes 8 premières étaient de la force.",
    );
  });

  test("the boar names its quarters and the counts of the first 8", async () => {
    await lang("fr");
    const boar: typeof bear = {
      ...bear,
      animal: "boar",
      quarters: ["strength", "run"],
      firstEight: [
        ["strength", 3],
        ["run", 3],
        ["yoga", 2],
      ],
    };
    expect(revealBody(t(), boar)).toBe(
      "Aucune pratique ne passe 40 % : force 3, endurance 3, yoga 2. Ses couleurs : force et endurance, tes deux pratiques en tête.",
    );
    expect(revealBody(t(), { ...boar, late: true })).toMatch(
      /^Cela remonte à ta 8e séance\. Aucune/,
    );
  });

  test("the title names the village, or says your village before it has a name", async () => {
    await lang("fr");
    expect(revealTitle(t(), bear, "Brumeval")).toBe("Un ours veille sur Brumeval.");
    expect(revealTitle(t(), bear, "")).toBe("Un ours veille sur ton village.");
  });

  test.each(["en", "de", "es"] as const)(
    "%s has the late text and no forbidden word",
    async (l) => {
      await lang(l);
      const late = revealBody(t(), { ...bear, late: true });
      expect(late).toContain("5");
      expect(late).not.toMatch(/\{\{|undefined/);
    },
  );
});

describe("BigFeastView", () => {
  const view = (feast: Feast, villageName = "Brumeval", sessions: number | null = 118) =>
    render(
      wrap(
        <BigFeastView
          feast={feast as never}
          tier={9}
          villageName={villageName}
          sessions={sessions}
          onSeeVillage={mockSee}
        />,
      ),
    );
  const mockSee = jest.fn();

  beforeEach(async () => {
    mockReduced = false;
    jest.clearAllMocks();
    await lang("fr");
  });

  test("the reveal ends on the shield, its kicker, title and body, with the button from the start", async () => {
    const v = await view(bear);
    expect(v.getByText("BRUMEVAL A UN ANIMAL")).toBeTruthy();
    expect(v.getByText("Un ours veille sur Brumeval.")).toBeTruthy();
    expect(v.getByText("5 de tes 8 séances étaient de la force.")).toBeTruthy();
    expect(v.getByText("Quelque chose bouge dans la forêt.")).toBeTruthy();
    expect(v.getByText("Un ours sort de la forêt.")).toBeTruthy();
    await fireEvent.press(v.getByText("Voir Brumeval"));
    expect(mockSee).toHaveBeenCalledTimes(1);
  });

  test("without a name the village is yours", async () => {
    const v = await view(bear, "");
    expect(v.getByText("TON VILLAGE A UN ANIMAL")).toBeTruthy();
    expect(v.getByText("Voir ton village")).toBeTruthy();
  });

  test("it plays once: springs and a timing, no loop", async () => {
    await view(bear);
    expect(withSpring).toHaveBeenCalled();
    expect(withTiming).toHaveBeenCalled();
    expect(withRepeat).not.toHaveBeenCalled();
  });

  test("under reduced motion the last image is there and nothing is started", async () => {
    mockReduced = true;
    const v = await view(bear);
    expect(withSpring).not.toHaveBeenCalled();
    expect(withTiming).not.toHaveBeenCalled();
    expect(v.getByText("Un ours veille sur Brumeval.")).toBeTruthy();
    expect(v.queryByText("Quelque chose bouge dans la forêt.")).toBeNull();
    expect(v.getByText("Voir Brumeval")).toBeTruthy();
  });

  test("a tier says its level, its sessions and the next tier, digits in the body font", async () => {
    const v = await view(tier);
    expect(v.getByText("NOUVEAU PALIER")).toBeTruthy();
    expect(v.getByText("Brumeval devient une Cité florissante.")).toBeTruthy();
    expect(v.getByText("Niveau 20, après 118 séances.")).toBeTruthy();
    expect(
      v.getByText(/Le village change d'allure\. Le prochain palier arrive au niveau \d+\./),
    ).toBeTruthy();
    expect(withRepeat).not.toHaveBeenCalled();
  });

  test("the last tier has no next one, and a session count that failed to load says no figure", async () => {
    const v = await view({ ...tier, tier: 12 }, "Brumeval", null);
    expect(v.getByText("Le village change d'allure.")).toBeTruthy();
    expect(v.queryByTestId("big-feast-level")).toBeNull();
  });

  test("under reduced motion a tier is the same image, still", async () => {
    mockReduced = true;
    const v = await view(tier);
    expect(withSpring).not.toHaveBeenCalled();
    expect(v.getByText("Niveau 20, après 118 séances.")).toBeTruthy();
  });
});

describe("the big-feast route", () => {
  const quit = jest.fn();
  beforeEach(async () => {
    jest.clearAllMocks();
    mockReduced = true;
    await lang("fr");
    useUserStore.setState({ villageName: "Brumeval" } as never);
    useSessionStore.setState({ quitSession: quit } as never);
    mockParams = {
      feast: JSON.stringify(bear),
      next: "/quests/9?runStepId=4&adventureId=3",
      anchor: "1",
      village: "/(tabs)/village?grown=forge:1:2",
      tier: "9",
    };
  });
  const mount = () => render(wrap(<BigFeastScreen />));

  test("marks the reveal as shown the moment it opens", async () => {
    await mount();
    expect(mockMark).toHaveBeenCalledWith("reveal");
  });

  test("marks a tier under its own key, so the next tier can still open", async () => {
    mockParams = { ...mockParams, feast: JSON.stringify(tier) };
    await mount();
    expect(mockMark).toHaveBeenCalledWith("tier:9");
  });

  test("the button goes to the village by the victory screen's road, with the grown levels", async () => {
    const v = await mount();
    await fireEvent.press(v.getByText("Voir Brumeval"));
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/village?grown=forge:1:2");
    expect(quit).not.toHaveBeenCalled();
  });

  test("the back gesture ends the session and goes where Continue would have gone", async () => {
    const spy = jest.spyOn(BackHandler, "addEventListener");
    await mount();
    const press = spy.mock.calls.at(-1)?.[1] as () => boolean;
    let handled = false;
    await act(() => {
      handled = press();
    });
    expect(handled).toBe(true);
    expect(quit).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/quests/9?runStepId=4&adventureId=3", {
      withAnchor: true,
    });
    spy.mockRestore();
  });

  test("a feast it cannot read sends on to where Continue leads, and marks nothing", async () => {
    mockParams = { ...mockParams, feast: "not json" };
    await mount();
    expect(mockMark).not.toHaveBeenCalled();
    expect(quit).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/quests/9?runStepId=4&adventureId=3", {
      withAnchor: true,
    });
  });
});
