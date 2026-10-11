import assert from "node:assert/strict";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { BackHandler, StyleSheet } from "react-native";
import { withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import BigFeastScreen from "@/app/big-feast";
import { BigFeastView } from "@/components/session/BigFeastView";
import {
  BEAT,
  revealBody,
  revealColors,
  revealShield,
  revealTitle,
  TEXT_FADE,
} from "@/components/session/bigFeastText";
import type { Feast } from "@/components/session/feasts";
import { NO_CREST_EVENTS } from "@/db/crestEvents";
import { crestAnimals } from "@/db/crestRules";
import { getXpForLevel } from "@/db/userLevel";
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

const mockStackScreen = jest.fn();
const mockShown = jest.fn();
const mockReport = jest.fn();
jest.mock("@/src/reportError", () => ({ reportError: (...a: unknown[]) => mockReport(...a) }));
const mockSetCrestAnimal = jest.fn().mockResolvedValue(undefined);
jest.mock("@/components/common/FormSheet", () => ({
  FormSheet: (p: { open: boolean; title: string; children: React.ReactNode }) => {
    const { Text, View } = require("react-native");
    return p.open ? (
      <View>
        <Text testID="sheet-title">{p.title}</Text>
        {p.children}
      </View>
    ) : null;
  },
}));
const mockMark = jest.fn().mockResolvedValue(undefined);
jest.mock("@/db/preferences", () => ({
  preferences: {
    markBigFeastShown: (...a: unknown[]) => mockMark(...a),
    getBigFeastsShown: () => mockShown(),
    setCrestAnimal: (...a: unknown[]) => mockSetCrestAnimal(...a),
    // The session store clears its saved copy when a run ends.
    clearSavedSession: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("@/db/completed", () => ({ countSessions: jest.fn().mockResolvedValue(118) }));

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();
let mockCanGoBack = true;
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
    push: mockPush,
    canGoBack: () => mockCanGoBack,
  }),
  Stack: {
    Screen: (p: unknown) => {
      mockStackScreen(p);
      return null;
    },
  },
}));

const mockTierAsset = jest.fn();
jest.mock("@/constants/assetMap", () => ({
  ...jest.requireActual("@/constants/assetMap"),
  getVillageTierAsset: (tier: number) => {
    mockTierAsset(tier);
    return 0;
  },
}));

const mockCrestDrawn = jest.fn();
jest.mock("@/components/village/Crest", () => ({
  Crest: (p: { crest: unknown }) => {
    mockCrestDrawn(p.crest);
    return null;
  },
}));

const mockGetCrest = jest.fn();
jest.mock("@/db/crest", () => ({ getCrest: (...a: unknown[]) => mockGetCrest(...a) }));

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
      "Depuis ta 8e séance. 5 de tes 8 premières étaient de la force.",
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
      "Tes 8 séances se partagent : force 3, endurance 3, yoga 2.",
    );
    expect(revealBody(t(), { ...boar, late: true })).toBe(
      "Depuis ta 8e séance. Tes 8 premières se partagent : force 3, endurance 3, yoga 2.",
    );
    expect(revealColors(t(), boar)).toBe(
      "Les couleurs de l'écu : force et endurance, tes deux pratiques en tête.",
    );
    expect(revealColors(t(), bear)).toBe("");
    // The order of the counts is the order the journal gave: most done first, as `firstEight` is.
    const swapped = { ...boar, firstEight: [...boar.firstEight].reverse() };
    expect(revealBody(t(), swapped)).toContain("yoga 2, endurance 3, force 3");
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
          crest={null}
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

  test("the reveal's last image links to the sheet 'Why the Bear?', and only the reveal", async () => {
    mockReduced = true; // the storyboard keeps the link inert until its text shows
    const onWhy = jest.fn();
    await render(
      wrap(
        <BigFeastView
          feast={bear as never}
          crest={null}
          tier={9}
          villageName="Brumeval"
          sessions={118}
          onSeeVillage={mockSee}
          onWhy={onWhy}
        />,
      ),
    );
    expect(screen.getByText("Pourquoi l'Ours ?")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("big-feast-why"));
    expect(onWhy).toHaveBeenCalledTimes(1);
  });

  test("while the storyboard has not shown the text the link takes no press and TalkBack skips it", async () => {
    jest.useFakeTimers();
    try {
      await render(
        wrap(
          <BigFeastView
            feast={bear as never}
            crest={null}
            tier={9}
            villageName="Brumeval"
            sessions={118}
            onSeeVillage={mockSee}
            onWhy={jest.fn()}
          />,
        ),
      );
      const link = () => screen.getByTestId("big-feast-why", { includeHiddenElements: true });
      expect(link().props.pointerEvents).toBe("none");
      expect(link().props.accessibilityElementsHidden).toBe(true);
      expect(link().props.importantForAccessibility).toBe("no-hide-descendants");
      await act(() => {
        jest.advanceTimersByTime(2 * BEAT + TEXT_FADE - 1);
      });
      expect(link().props.pointerEvents).toBe("none");
      await act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(link().props.pointerEvents).toBe("auto");
      expect(link().props.accessibilityElementsHidden).toBeFalsy();
    } finally {
      jest.useRealTimers();
    }
  });

  test("leaving before the text has shown clears the link's timer", async () => {
    jest.useFakeTimers();
    const set = jest.spyOn(global, "setTimeout");
    const clear = jest.spyOn(global, "clearTimeout");
    try {
      await render(
        wrap(
          <BigFeastView
            feast={bear as never}
            crest={null}
            tier={9}
            villageName="Brumeval"
            sessions={118}
            onSeeVillage={mockSee}
            onWhy={jest.fn()}
          />,
        ),
      );
      const at = set.mock.calls.findIndex(([, ms]) => ms === 2 * BEAT + TEXT_FADE);
      expect(at).toBeGreaterThanOrEqual(0);
      const id = set.mock.results[at]?.value;
      await screen.unmount();
      expect(clear).toHaveBeenCalledWith(id);
    } finally {
      jest.useRealTimers();
    }
  });

  test("under reduced motion the link is touchable at once", async () => {
    mockReduced = true;
    await render(
      wrap(
        <BigFeastView
          feast={bear as never}
          crest={null}
          tier={9}
          villageName="Brumeval"
          sessions={118}
          onSeeVillage={mockSee}
          onWhy={jest.fn()}
        />,
      ),
    );
    expect(screen.getByTestId("big-feast-why").props.pointerEvents).toBe("auto");
  });

  test("the boar's count is the fact and its colors a separate, paler line", async () => {
    const boar = {
      ...bear,
      animal: "boar",
      quarters: ["strength", "run"],
      firstEight: [
        ["strength", 3],
        ["run", 3],
        ["yoga", 2],
      ],
    } as Feast;
    const v = await view(boar);
    expect(v.getByTestId("big-feast-body")).toHaveTextContent(
      "Tes 8 séances se partagent : force 3, endurance 3, yoga 2.",
    );
    expect(v.getByTestId("big-feast-colors")).toHaveTextContent(/^Les couleurs de l'écu/);
    const color = (id: string) => StyleSheet.flatten(v.getByTestId(id).props.style)?.color;
    expect(color("big-feast-colors")).not.toBe(color("big-feast-body"));
    expect((await view(bear)).queryByTestId("big-feast-colors")).toBeNull();
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

  test("a title with a digit is not set in Alegreya, one without is", async () => {
    const font = (v: Awaited<ReturnType<typeof view>>) =>
      StyleSheet.flatten(v.getAllByTestId("big-feast-title").at(-1)?.props.style)?.fontFamily;
    const first = await view(bear, "Brumeval");
    expect(font(first)).toBe(config.fonts.heading.face[700].normal);
    const second = await view(bear, "Brumeval 2");
    expect(font(second)).not.toBe(config.fonts.heading.face[700].normal);
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

  test("an unnamed village's tier is the bare name, the kicker already says it is a new tier", async () => {
    const v = await view(tier, "");
    expect(v.getByText("NOUVEAU PALIER")).toBeTruthy();
    expect(v.getByText("Cité florissante")).toBeTruthy();
    expect(v.queryByText("Nouveau palier : Cité florissante")).toBeNull();
  });

  test("the last tier has no next one, and a session count that failed to load says no figure", async () => {
    const v = await view({ ...tier, tier: 12 }, "Brumeval", null);
    expect(v.getByText("Le village change d'allure.")).toBeTruthy();
    expect(v.queryByTestId("big-feast-level")).toBeNull();
  });

  test.each([true, false])(
    "a tier puts its words at the bottom, on the dark, the reveal keeps its middle (reduced %s)",
    async (reduced) => {
      mockReduced = reduced;
      const justify = (v: Awaited<ReturnType<typeof view>>) =>
        StyleSheet.flatten(v.getByTestId("big-feast-scroll").props.contentContainerStyle)
          .justifyContent;
      expect(justify(await view(tier))).toBe("flex-end");
      expect(justify(await view(bear))).toBe("center");
    },
  );

  test("under reduced motion a tier is the same image, still", async () => {
    mockReduced = true;
    const v = await view(tier);
    expect(withSpring).not.toHaveBeenCalled();
    expect(v.getByText("Niveau 20, après 118 séances.")).toBeTruthy();
  });
});

describe("the reveal's shield", () => {
  // 8 strength then 20 rides: the bear, and the horse as its border since the 28th session.
  const journal = [
    ...Array.from({ length: 8 }, () => ({ outing: null, strength: 1 })),
    ...Array.from({ length: 20 }, () => ({ outing: "ride" as const, strength: 0 })),
  ].map((s, i) => ({
    ...s,
    uuid: String(i).padStart(6, "0"),
    calisthenics: 0,
    yoga: 0,
    cardio: 0,
  }));
  const crestWith = (picked: Parameters<typeof crestAnimals>[1], sessions = journal) => {
    const animals = crestAnimals(sessions, picked);
    assert(animals);
    return { ...animals, longestFlame: 3 as const, rings: 2, revealedAt: new Date("2020-01-01") };
  };
  const SESSIONS_SHIELD = {
    animal: "bear",
    quarters: null,
    manual: false,
    second: { animal: "horse" },
    longestFlame: 3,
    rings: 2,
  };

  test.each(["auto", "stag", "ermine", "boar", "horse", "bear"] as const)(
    "a hero who chose %s before the feast sees the sessions' shield",
    (picked) => {
      expect(revealShield(bear, crestWith(picked))).toEqual(SESSIONS_SHIELD);
    },
  );

  test("a boar of the sessions has no border (no second animal exists for it), whatever was chosen", () => {
    // 2 sessions of each of four practices: no practice reaches 40 % of the first eight, a boar.
    const mixed = (["strength", "calisthenics", "yoga", "cardio"] as const).flatMap((p, k) =>
      [0, 1].map((i) => ({
        uuid: `${k}${i}`.padStart(6, "0"),
        outing: null,
        strength: 0,
        calisthenics: 0,
        yoga: 0,
        cardio: 0,
        [p]: 1,
      })),
    );
    const crest = crestWith("stag", mixed);
    const boar: typeof bear = { ...bear, animal: "boar", quarters: crest.evidence.boarQuarters };
    expect(crest.evidence.secondFromSessions).toBeNull();
    expect(revealShield(boar, crest)).toMatchObject({ animal: "boar", second: null });
  });

  test("is the bare animal when the crest could not be read", () => {
    expect(revealShield(bear, null)).toEqual({
      animal: "bear",
      quarters: null,
      manual: false,
      second: null,
      longestFlame: 0,
      rings: 0,
    });
  });
});

describe("the big-feast route", () => {
  const quit = jest.fn();
  const base = {
    levelUp: null,
    tierUp: null,
    villageGrowth: [{ code: "forge", oldLevel: 1, newLevel: 2 }],
    newRecords: [],
    standing: null,
    newRungs: [],
    newAchievements: [],
    fulfilledOath: null,
    oathBonusXp: 0,
    crestEvents: NO_CREST_EVENTS,
    crestReveal: null,
    bigFeastsShown: [] as string[] | undefined,
    heroXp: { before: 0, after: 4000 },
    campaign: {
      adventureId: 3,
      runId: 1,
      isFinished: false,
      nextRunStepId: 4,
      nextQuestId: 9,
    },
  };
  const finish = (over: object = {}, status = "finished") =>
    useSessionStore.setState({
      status,
      savedResult: { ...base, ...over },
      quitSession: quit,
    } as never);
  const { kind: _k, size: _s, id: _i, ...revealFacts } = bear;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockReduced = true;
    mockCanGoBack = true;
    mockGetCrest.mockResolvedValue(null);
    mockShown.mockResolvedValue([]);
    await lang("fr");
    useUserStore.setState({ villageName: "Brumeval" } as never);
    finish({ crestReveal: revealFacts });
  });
  const mount = () => render(wrap(<BigFeastScreen />));

  test("marks the reveal as shown the moment it opens", async () => {
    await mount();
    expect(mockMark).toHaveBeenCalledWith("reveal");
  });

  test("a legendary animal opens under its practice's key, in its words", async () => {
    const horse = { animal: "horse", stage: "legendary", n: 500, practice: "ride" } as const;
    finish({
      crestReveal: null,
      crestEvents: { ...NO_CREST_EVENTS, stageUp: [horse] },
      crestLegendary: [horse],
    });
    await mount();
    expect(mockMark).toHaveBeenCalledWith("legendary:ride");
    expect(await screen.findByText("Ton cheval entre dans la légende.")).toBeTruthy();
    expect(screen.getByText("Ta 500e sortie à vélo, ce soir.")).toBeTruthy();
    expect(screen.getByTestId("big-feast-kicker").props.children).toBe("LÉGENDAIRE");
  });

  test("a hero past 500 at the update gets the feast once, with a body that is true of them", async () => {
    finish({
      crestReveal: null,
      crestLegendary: [{ animal: "bear", stage: "legendary", n: 500, practice: "strength" }],
    });
    await mount();
    expect(mockMark).toHaveBeenCalledWith("legendary:strength");
    expect(await screen.findByText("Ton ours entre dans la légende.")).toBeTruthy();
    expect(screen.getByText("Au moins 500 séances de force.")).toBeTruthy();
    expect(screen.queryByText(/ce soir/)).toBeNull();
  });

  test("marks a tier under its own key, so the next tier can still open", async () => {
    finish({ tierUp: { oldTier: 8, newTier: 9 }, levelUp: { oldLevel: 19, newLevel: 20 } });
    await mount();
    expect(mockMark).toHaveBeenCalledWith("tier:9");
  });

  test("paints the tier the hero's XP is in, not the first", async () => {
    finish({ crestReveal: revealFacts, heroXp: { before: 0, after: getXpForLevel(20) } });
    await mount();
    expect(mockTierAsset).toHaveBeenCalledWith(9);
    expect(mockTierAsset).not.toHaveBeenCalledWith(1);
  });

  test("draws the crest the hero has now, flame included", async () => {
    mockGetCrest.mockResolvedValue({
      animal: "bear",
      manual: false,
      second: null,
      quarters: null,
      longestFlame: 3,
      rings: 1,
      evidence: { secondFromSessions: null },
    });
    await mount();
    expect(mockCrestDrawn).toHaveBeenCalledWith(
      expect.objectContaining({ animal: "bear", longestFlame: 3, rings: 1 }),
    );
  });

  test("the button pops the feast and pushes the village by the victory screen's road", async () => {
    const v = await mount();
    await fireEvent.press(v.getByText("Voir Brumeval"));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/village?grown=forge:1:2");
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
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(quit).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/quests/9?runStepId=4&adventureId=3", {
      withAnchor: true,
    });
    spy.mockRestore();
  });

  test("a forged link marks nothing, quits nothing and closes: no finished session", async () => {
    useSessionStore.setState({ status: "idle", savedResult: null, quitSession: quit } as never);
    await mount();
    expect(mockMark).not.toHaveBeenCalled();
    expect(quit).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test("a session under way is not quit by the link", async () => {
    finish({ crestReveal: revealFacts }, "running");
    await mount();
    expect(mockMark).not.toHaveBeenCalled();
    expect(quit).not.toHaveBeenCalled();
  });

  test("the shown list is read live: a feast marked since the result was saved never reopens", async () => {
    mockShown.mockResolvedValue(["reveal"]);
    await mount();
    expect(mockMark).not.toHaveBeenCalled();
    expect(quit).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  describe("when the shown list cannot be read", () => {
    beforeEach(() => mockShown.mockRejectedValue(new Error("db")));

    test("a tier, which exists only in this session, still opens and is marked", async () => {
      finish({ tierUp: { oldTier: 8, newTier: 9 }, levelUp: { oldLevel: 19, newLevel: 20 } });
      const v = await mount();
      expect(v.getByTestId("big-feast")).toBeTruthy();
      expect(mockMark).toHaveBeenCalledWith("tier:9");
      expect(mockBack).not.toHaveBeenCalled();
    });

    test("a feast already in the frozen list does not reopen", async () => {
      finish({ crestReveal: revealFacts, bigFeastsShown: ["reveal"] });
      await mount();
      expect(mockMark).not.toHaveBeenCalled();
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    test("the failure is reported", async () => {
      await mount();
      expect(mockReport).toHaveBeenCalledWith("bigFeast.shown", expect.any(Error));
    });

    test("a result without a list still opens its feast", async () => {
      finish({ crestReveal: revealFacts, bigFeastsShown: undefined });
      const v = await mount();
      expect(v.getByTestId("big-feast")).toBeTruthy();
    });
  });

  test("the no-slide option is set on the very first render, before any figure has arrived", async () => {
    mockGetCrest.mockReturnValue(new Promise(() => {}));
    const v = await mount();
    expect(v.queryByTestId("big-feast")).toBeNull();
    expect(mockStackScreen).toHaveBeenCalledWith(
      expect.objectContaining({ options: { animation: "none" } }),
    );
  });

  test("a crest that cannot be read still shows the animal alone, not an empty screen", async () => {
    mockGetCrest.mockRejectedValue(new Error("db"));
    const v = await mount();
    expect(v.getByTestId("big-feast")).toBeTruthy();
    expect(mockCrestDrawn).toHaveBeenCalledWith(expect.objectContaining({ animal: "bear" }));
  });

  describe("the crest sheet", () => {
    const bearCrest = () => {
      const strength = { uuid: "", outing: null, strength: 1, calisthenics: 0, yoga: 0, cardio: 0 };
      const sessions = Array.from({ length: 8 }, (_, i) => ({
        ...strength,
        uuid: String(i).padStart(6, "0"),
      }));
      const animals = crestAnimals(sessions, "auto");
      return { ...animals, longestFlame: 0, rings: 0, revealedAt: new Date("2020-01-01") };
    };

    test("M9: the link opens 'Why the Bear?', not the choice", async () => {
      mockGetCrest.mockResolvedValue(bearCrest());
      const v = await mount();
      await fireEvent.press(v.getByTestId("big-feast-why"));
      expect((await v.findByTestId("sheet-title")).props.children).toBe("Pourquoi l'Ours ?");
      expect(v.getByTestId("crest-why-pick")).toBeTruthy();
      expect(v.queryByTestId("crest-pick-stag")).toBeNull();
    });

    test("a chosen animal hides the link: the sheet would be titled for another animal", async () => {
      const strength = { outing: null, strength: 1, calisthenics: 0, yoga: 0, cardio: 0 };
      const sessions = Array.from({ length: 8 }, (_, i) => ({
        ...strength,
        uuid: String(i).padStart(6, "0"),
      }));
      const animals = crestAnimals(sessions, "stag");
      mockGetCrest.mockResolvedValue({ ...animals, longestFlame: 0, rings: 0 });
      const v = await mount();
      expect(await v.findByTestId("big-feast-title")).toBeTruthy();
      expect(v.queryByTestId("big-feast-why")).toBeNull();
    });

    test("an unreadable crest hides the link too: it would open nothing", async () => {
      mockGetCrest.mockResolvedValue(null);
      const v = await mount();
      expect(await v.findByTestId("big-feast-title")).toBeTruthy();
      expect(v.queryByTestId("big-feast-why")).toBeNull();
    });

    test("hardware back closes the open sheet first, and the feast stays", async () => {
      mockGetCrest.mockResolvedValue(bearCrest());
      const spy = jest.spyOn(BackHandler, "addEventListener");
      const v = await mount();
      await fireEvent.press(v.getByTestId("big-feast-why"));
      await v.findByTestId("sheet-title");
      const press = spy.mock.calls.at(-1)?.[1] as () => boolean;
      await act(() => {
        expect(press()).toBe(true);
      });
      expect(v.queryByTestId("sheet-title")).toBeNull();
      expect(mockBack).not.toHaveBeenCalled();
      expect(quit).not.toHaveBeenCalled();
      expect(v.getByTestId("big-feast-title")).toBeTruthy();
      spy.mockRestore();
    });

    test("no back listener outlives the route, or the sheet it opened and closed", async () => {
      mockGetCrest.mockResolvedValue(bearCrest());
      const live = new Set<object>();
      const spy = jest.spyOn(BackHandler, "addEventListener").mockImplementation(() => {
        const sub = {
          remove: () => {
            live.delete(sub);
          },
        };
        live.add(sub);
        return sub;
      });
      const v = await mount();
      expect(live.size).toBe(1);
      await fireEvent.press(v.getByTestId("big-feast-why"));
      await v.findByTestId("sheet-title");
      const press = spy.mock.calls.at(-1)?.[1] as () => boolean;
      await act(() => {
        press();
      });
      expect(live.size).toBe(1);
      await v.unmount();
      expect(live.size).toBe(0);
      spy.mockRestore();
    });

    test("M10: a choice reads the crest again and leaves for the village by the button's road", async () => {
      mockGetCrest.mockResolvedValue(bearCrest());
      const v = await mount();
      await fireEvent.press(v.getByTestId("big-feast-why"));
      await fireEvent.press(await v.findByTestId("crest-why-pick"));
      await fireEvent.press(await v.findByTestId("crest-pick-stag"));
      await waitFor(() => expect(mockGetCrest).toHaveBeenCalledTimes(2));
      expect(mockSetCrestAnimal).toHaveBeenCalledWith("stag");
      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/(tabs)/village?grown=forge:1:2");
      expect(quit).not.toHaveBeenCalled();
    });
  });

  test("two taps on the button push the village once", async () => {
    const v = await mount();
    await fireEvent.press(v.getByText("Voir Brumeval"));
    await fireEvent.press(v.getByText("Voir Brumeval"));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  test("the back gesture pressed twice leaves once, even when quitting empties the store", async () => {
    // The real quit empties what the screen reads, so only the guard stops the second leave.
    quit.mockImplementation(() =>
      useSessionStore.setState({ status: "idle", savedResult: null } as never),
    );
    const spy = jest.spyOn(BackHandler, "addEventListener");
    await mount();
    const press = spy.mock.calls.at(-1)?.[1] as () => boolean;
    await act(() => {
      press();
      press();
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(quit).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  test("with nothing to go back to, it lands on Home", async () => {
    mockCanGoBack = false;
    useSessionStore.setState({ status: "idle", savedResult: null } as never);
    await mount();
    expect(mockReplace).toHaveBeenCalledWith("/");
  });
});
