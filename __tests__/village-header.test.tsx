import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { crestFootprint } from "@/components/village/crestGeometry";
import { VillageScene } from "@/components/village/VillageScene";
import * as crestDb from "@/db/crest";
import * as village from "@/db/village";
import { i18n } from "@/i18n";
import * as errors from "@/src/reportError";
import { useUserStore } from "@/stores/user";
import config from "@/tamagui.config";

/**
 * The title block: a crest and the animal's sentence once the 8th session has revealed it, two
 * eyes and "something watches" before. The sentence rule runs for real; only the database is
 * stood in for.
 */
// A revisit of the tab: the screen stays mounted and its focus callback runs again.
const mockFocusCallbacks = new Set<() => void>();
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/adventures", () => ({ listFinishedRunSummaries: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/completed", () => ({
  getRecentContributingSessions: jest.fn().mockResolvedValue([]),
}));
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => {
    mockFocusCallbacks.add(cb);
    require("react").useEffect(cb, [cb]);
  },
  useIsFocused: () => true,
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("@/components/village/VillageEmbers", () => ({
  VillageEmbers: (p: { heroHeight: number }) =>
    require("react").createElement(require("react-native").View, {
      testID: "village-embers",
      heroHeight: p.heroHeight,
    }),
}));
jest.mock("@/components/common/FlameFlicker", () => ({ FlameFlicker: () => null }));
jest.mock("@/hooks/useGameIcon", () => ({ useGameIcon: (name: string) => name }));
jest.mock("@/hooks/useReducedMotion", () => ({
  ...jest.requireActual("@/hooks/useReducedMotion"),
  useReducedMotion: () => true,
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const tally = { strength: 0, calisthenics: 0, yoga: 0, run: 0, ride: 0 };

function crestOf(over: Partial<crestDb.Crest> = {}): crestDb.Crest {
  return {
    animal: "bear",
    stage: "young",
    manual: false,
    second: null,
    quarters: null,
    revealedIndex: 7,
    evidence: {
      firstEight: tally,
      totals: tally,
      first: "bear",
      secondFromSessions: null,
      boarQuarters: null,
    },
    longestFlame: 1,
    rings: 0,
    revealedAt: new Date("2020-01-01T10:00:00Z"),
    ...over,
  };
}

function mount(crest: crestDb.Crest | null, name = "Brumeval", pending = false) {
  useUserStore.setState({ villageName: name });
  jest.spyOn(village, "getVillageScene").mockImplementation(() =>
    pending
      ? new Promise(() => {})
      : Promise.resolve({
          tier: 4,
          level: 8,
          title: { en: "Champion", fr: "Champion", de: "Champion", es: "Champion" },
          totalXp: 3180,
          xpPerSession: 370,
          flame: 1,
          streakDays: 4,
          dominantSport: null,
          buildings: [],
        }),
  );
  jest.spyOn(crestDb, "getCrest").mockResolvedValue(crest);
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <VillageScene />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

const line = async () => (await screen.findByTestId("village-crest-line")).props.children;

afterEach(() => jest.restoreAllMocks());

describe("the village header", () => {
  it("day one: two eyes and a sentence, no crest", async () => {
    await mount(null);
    expect(await line()).toBe("Something watches Brumeval.");
    expect(screen.getByTestId("village-glow")).toBeTruthy();
    expect(screen.queryByRole("image")).toBeNull();
  });

  it("names the village by 'your village' when it has no name", async () => {
    await mount(null, "");
    expect(await line()).toBe("Something watches your village.");
  });

  it("a crest drawn, the glow gone", async () => {
    await mount(crestOf());
    expect(await line()).toBe("A bear watches over Brumeval.");
    expect(screen.queryByTestId("village-glow")).toBeNull();
    expect(screen.getByLabelText("A bear.")).toBeTruthy();
  });

  it("says from today on the day of the reveal", async () => {
    await mount(crestOf({ revealedAt: new Date() }));
    expect(await line()).toBe("A bear watches over Brumeval from today.");
  });

  it("two animals, and the stage only when it is venerable", async () => {
    await mount(crestOf({ second: { animal: "stag", stage: "adult" } }));
    expect(await line()).toBe("A bear and a stag watch over Brumeval.");
    jest.restoreAllMocks();
    await mount(crestOf({ stage: "venerable", second: { animal: "stag", stage: "adult" } }));
    expect(
      await screen.findByText("A venerable bear and a stag watch over Brumeval."),
    ).toBeTruthy();
  });

  it("the boar names its two practices", async () => {
    await mount(crestOf({ animal: "boar", quarters: ["strength", "run"] }));
    expect(await line()).toBe("A boar watches over Brumeval: you blend strength and endurance.");
  });

  it("while loading, nothing is asserted: no sentence, no glow, the name in its place", async () => {
    await mount(crestOf(), "Brumeval", true);
    expect(screen.getByText("Brumeval")).toBeTruthy();
    expect(screen.queryByTestId("village-crest-line")).toBeNull();
    expect(screen.queryByTestId("village-glow")).toBeNull();
  });
});

describe("the header's rules", () => {
  it("a first animal that is only adult is not called venerable", async () => {
    await mount(crestOf({ stage: "adult" }));
    expect(await line()).toBe("A bear watches over Brumeval.");
    jest.restoreAllMocks();
    await mount(crestOf({ stage: "adult", second: { animal: "stag", stage: "adult" } }));
    expect(await screen.findByText("A bear and a stag watch over Brumeval.")).toBeTruthy();
  });

  it("a crest that cannot be read leaves its slot empty: the scene shows, nothing is asserted, the next visit retries", async () => {
    useUserStore.setState({ villageName: "Brumeval" });
    jest.spyOn(village, "getVillageScene").mockResolvedValue({
      tier: 4,
      level: 8,
      title: { en: "Champion", fr: "Champion", de: "Champion", es: "Champion" },
      totalXp: 3180,
      xpPerSession: 370,
      flame: 1,
      streakDays: 4,
      dominantSport: null,
      buildings: [],
    });
    const getCrest = jest.spyOn(crestDb, "getCrest").mockRejectedValue(new Error("db"));
    const report = jest.spyOn(errors, "reportError").mockImplementation(() => {});
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <TamaguiProvider config={config} defaultTheme="dark">
          <VillageScene />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
    expect(await screen.findByTestId("village-crest-empty")).toBeTruthy();
    expect(screen.queryByText(i18n.t("common.retry"))).toBeNull();
    expect(screen.queryByTestId("village-glow")).toBeNull();
    expect(screen.queryByTestId("village-crest-line")).toBeNull();
    expect(report).toHaveBeenCalledWith("village.crest", expect.any(Error));
    // The empty slot is the crest's own size, so the name does not move when the crest arrives.
    const empty = StyleSheet.flatten(screen.getByTestId("village-crest-empty").props.style);
    expect(empty).toMatchObject(crestFootprint(56, true));

    getCrest.mockResolvedValue(crestOf());
    await act(() => {
      for (const cb of mockFocusCallbacks) cb();
    });
    expect(await line()).toBe("A bear watches over Brumeval.");
    expect(screen.getByLabelText("A bear.")).toBeTruthy();
    expect(screen.queryByTestId("village-crest-empty")).toBeNull();
  });

  it.each([
    ["a drawn crest", crestOf()],
    ["a glow", null],
  ])("a failed read after %s keeps what was shown, and reports", async (_name, first) => {
    const getCrest = jest.spyOn(crestDb, "getCrest").mockResolvedValue(first);
    const report = jest.spyOn(errors, "reportError").mockImplementation(() => {});
    useUserStore.setState({ villageName: "Brumeval" });
    jest.spyOn(village, "getVillageScene").mockResolvedValue({
      tier: 4,
      level: 8,
      title: { en: "Champion", fr: "Champion", de: "Champion", es: "Champion" },
      totalXp: 3180,
      xpPerSession: 370,
      flame: 1,
      streakDays: 4,
      dominantSport: null,
      buildings: [],
    });
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <TamaguiProvider config={config} defaultTheme="dark">
          <VillageScene />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
    const shown = first ? "village-crest-line" : "village-glow";
    await screen.findByTestId(shown);
    getCrest.mockRejectedValue(new Error("db"));
    await act(() => {
      for (const cb of mockFocusCallbacks) cb();
    });
    expect(report).toHaveBeenCalledWith("village.crest", expect.any(Error));
    expect(screen.getByTestId(shown)).toBeTruthy();
    expect(screen.queryByTestId("village-crest-empty")).toBeNull();
  });

  it("the glow's eyes are 6 by 10 dp, upright", async () => {
    await mount(null);
    const eyes = (await screen.findByTestId("village-glow")).children;
    expect(eyes).toHaveLength(2);
    for (const eye of eyes) {
      const style = StyleSheet.flatten(typeof eye === "string" ? {} : eye.props.style);
      expect(style).toMatchObject({ width: 6, height: 10 });
    }
  });

  it("gives a long hyphenated name somewhere to wrap: a zero-width space after each hyphen", async () => {
    await mount(crestOf(), "Rochebrune-sur-Lande");
    expect(await screen.findByText("Rochebrune-\u200Bsur-\u200BLande")).toBeTruthy();
  });

  it("holds the glow in the crest's own slot, so the name does not move", async () => {
    await mount(null);
    await screen.findByTestId("village-glow");
    const slot = StyleSheet.flatten(screen.getByTestId("village-glow-slot").props.style);
    expect(slot).toMatchObject(crestFootprint(56, true));
  });

  it("while loading, the hero already grows to the title block, so it does not jump on arrival", async () => {
    await mount(crestOf(), "Brumeval", true);
    const hero = () => StyleSheet.flatten(screen.getByTestId("village-hero-loading").props.style);
    const before = hero().height as number;
    await fireEvent(screen.getByTestId("village-title"), "layout", {
      nativeEvent: { layout: { height: 600 } },
    });
    // The name's fixed top (the 520 dp column less 160) plus the block's height.
    expect(hero().height).toBe(360 + 600);
    expect(before).toBeLessThan(600);
  });

  // Both states pin the name at the same fixed top (the 520 dp column less 160) and neither
  // anchors it to the bottom, so a missing Focus line or a longer sentence cannot move it.
  it("pins the name from the top while loading", async () => {
    await mount(crestOf(), "Brumeval", true);
    const s = StyleSheet.flatten(screen.getByTestId("village-title").props.style);
    expect(s.top).toBe(360);
    expect(s.bottom).toBeUndefined();
  });

  it("pins the name from the same top once loaded", async () => {
    await mount(crestOf());
    await screen.findByTestId("village-crest-line");
    const s = StyleSheet.flatten(screen.getByTestId("village-title").props.style);
    expect(s.top).toBe(360);
    expect(s.bottom).toBeUndefined();
  });

  // The row is top-aligned with a fixed pad: a chip wrapping under the name (or absent) only
  // makes the row taller, it never moves the name.
  it.each([true, false])(
    "keeps the name's row top-aligned with a fixed pad (loading: %s)",
    async (pending) => {
      await mount(crestOf(), "Brumeval", pending);
      await screen.findByText("Brumeval");
      const row = StyleSheet.flatten(screen.getByTestId("village-name-row").props.style);
      expect(row.paddingTop).toBe((crestFootprint(56, true).height - 32) / 2);
      expect(row.alignItems).toBe("center");
      const outer = screen.getByTestId("village-name-row").parent;
      expect(StyleSheet.flatten(outer?.props.style).alignItems).toBe("flex-start");
    },
  );

  it("while loading, the crest's skeleton holds the crest's footprint, not a square", async () => {
    await mount(crestOf(), "Brumeval", true);
    const sk = StyleSheet.flatten(screen.getByTestId("village-crest-skeleton").props.style);
    expect(sk).toMatchObject(crestFootprint(56, true));
  });

  it("while loading, the flame chip's room is held", async () => {
    await mount(crestOf(), "Brumeval", true);
    const sk = StyleSheet.flatten(screen.getByTestId("village-chip-skeleton").props.style);
    expect(sk).toMatchObject({ width: 118, height: 24 });
  });

  it("keeps the embers above the title block: they get only the hero's height down to its top", async () => {
    await mount(crestOf());
    await screen.findByTestId("village-title");
    expect(screen.getByTestId("village-embers").props.heroHeight).toBe(360);
  });

  it("sets the level's number in bold, inside the one status line", async () => {
    await mount(crestOf());
    await screen.findByTestId("village-crest-line");
    const num = within(screen.getByTestId("village-title")).getByText("8");
    expect(StyleSheet.flatten(num.props.style).fontWeight).toBe("700");
    expect(screen.getByText(/Level .*8.* · Champion/)).toBeTruthy();
  });

  it.each(["fr", "en", "de", "es"])("%s level line carries the number exactly once", (lng) => {
    const parts = i18n.getFixedT(lng)("village.level_line", { level: "\u0001" }).split("\u0001");
    expect(parts).toHaveLength(2);
  });

  it("draws the embers under the title block, never over the crest", async () => {
    await mount(crestOf());
    await screen.findByTestId("village-title");
    const hero = screen.getByTestId("village-hero");
    const order = (hero.children as { props?: { testID?: string } }[]).map((c) => c.props?.testID);
    expect(order.indexOf("village-embers")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("village-embers")).toBeLessThan(order.indexOf("village-title"));
  });

  it("while loading, the name is in the title block, the same one the loaded header uses", async () => {
    await mount(crestOf(), "Brumeval", true);
    expect(within(screen.getByTestId("village-title")).getByText("Brumeval")).toBeTruthy();
  });
});

describe("the sentences, in every language", () => {
  const BANNED =
    /gardien|guardian|wächter|guardián|totem|lignée|chef|meuble|besant|annelet|écartelé|ancien|—|’/i;
  const KEYS = [
    "crest_place",
    ...["glow", "one", "one_t", "pair", "pair_t", "boar", "boar_t"].map((k) => `crest_line_${k}`),
    ...["bear", "stag", "horse", "salmon", "ermine", "boar"].map((a) => `crest_${a}_venerable`),
  ];
  it.each(["fr", "en", "de", "es"])("%s has them all, clean", (lng) => {
    const t = i18n.getFixedT(lng);
    for (const key of KEYS) {
      const text = t(`village.${key}`, { animal: "x", first: "x", second: "x", place: "x" });
      expect(text).not.toBe(`village.${key}`);
      expect(text).not.toMatch(BANNED);
    }
  });
});

describe("the reveal day and the boar's line, in every language", () => {
  const TODAY = { fr: "aujourd'hui", en: "from today", de: "seit heute", es: "desde hoy" } as const;
  const args = { animal: "x", first: "a", second: "b", place: "p" };
  it.each(["fr", "en", "de", "es"] as const)(
    "%s says today, and the boar names no apposition",
    (lng) => {
      const t = i18n.getFixedT(lng);
      for (const key of ["one_t", "pair_t", "boar_t"])
        expect(t(`village.crest_line_${key}`, args)).toContain(TODAY[lng]);
      // A colon, then what the hero does: "tu mêles a et b", not "…, a et b".
      for (const key of ["boar", "boar_t"]) {
        const line = t(`village.crest_line_${key}`, args);
        expect(line).toMatch(/p[^:]*: [^,]*a [^,]*b/);
        expect(line).not.toMatch(/, a /);
      }
    },
  );
});
