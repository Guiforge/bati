import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { VillageScene } from "@/components/village/VillageScene";
import * as crestDb from "@/db/crest";
import * as village from "@/db/village";
import { i18n } from "@/i18n";
import { useUserStore } from "@/stores/user";
import config from "@/tamagui.config";

/**
 * The title block: a crest and the animal's sentence once the 8th session has revealed it, two
 * eyes and "something watches" before. The sentence rule runs for real; only the database is
 * stood in for.
 */
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/adventures", () => ({ listFinishedRunSummaries: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/completed", () => ({
  getRecentContributingSessions: jest.fn().mockResolvedValue([]),
}));
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
  useIsFocused: () => true,
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: jest.fn() }),
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
    evidence: { firstEight: tally, totals: tally, first: "bear", secondFromSessions: null },
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

  it("says since tonight on the day of the reveal", async () => {
    await mount(crestOf({ revealedAt: new Date() }));
    expect(await line()).toBe("A bear has watched over Brumeval since tonight.");
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
    expect(await line()).toBe("A boar watches over Brumeval, strength and running.");
  });

  it("while loading, nothing is asserted: no sentence, no glow, the name in its place", async () => {
    await mount(crestOf(), "Brumeval", true);
    expect(screen.getByText("Brumeval")).toBeTruthy();
    expect(screen.queryByTestId("village-crest-line")).toBeNull();
    expect(screen.queryByTestId("village-glow")).toBeNull();
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
