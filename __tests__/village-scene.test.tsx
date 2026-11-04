import "./helpers/gestureRuntime";
import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { Dimensions, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Reanimated from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import type { Ouverture } from "@/components/village/iso/bulle";
import { VillageScene } from "@/components/village/VillageScene";
import { getVillageTierAsset } from "@/constants/assetMap";
import { INTEGRATION } from "@/constants/isoPoc";
import * as crestDb from "@/db/crest";
import type { RecentFeeds } from "@/db/milestone";
import * as feedDb from "@/db/milestoneFeed";
import { type BuildingCode, buildingDefinitions } from "@/db/schema";
import * as village from "@/db/village";

// Reanimated 4.7 types `getAnimatedStyle` from its web stub (`(): void`); jest runs the native one.
const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { opacity?: unknown };

import { i18n } from "@/i18n";
import * as reporting from "@/src/reportError";
import { useChorusStore } from "@/stores/chorus";
import config from "@/tamagui.config";

/**
 * The village is read without a tap: what rises next and what it costs, then every building in the
 * family that feeds it, each on the ceiling it can really reach. A session that brought the hero
 * here plays once. Tapping a row still has to explain the level, the only place a bar is allowed.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
// The sheet fetches its deed list on open; the headline it renders comes from the building.
jest.mock("@/db/adventures", () => ({ listFinishedRunSummaries: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/completed", () => ({
  getRecentContributingSessions: jest.fn().mockResolvedValue([]),
}));
// The screen turns only with the iso map and the flag on (L6-T21); the flag is off here.
jest.mock("expo-screen-orientation", () => ({
  unlockAsync: jest.fn().mockResolvedValue(undefined),
  lockAsync: jest.fn().mockResolvedValue(undefined),
  OrientationLock: { PORTRAIT_UP: 1 },
}));
let mockParams: { grown?: string } = {};
let mockFocusTick = 0;
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb, mockFocusTick]),
  useIsFocused: () => true,
  usePathname: () => "/village",
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: jest.fn() }),
}));
// Reanimated needs a native worklets module jest-expo doesn't install.
jest.mock("@/components/common/FlameFlicker", () => ({ FlameFlicker: () => null }));
// The return card is up at once instead of 1.3 s in, and nothing on the painting loops forever.
jest.mock("@/hooks/useReducedMotion", () => ({
  ...jest.requireActual("@/hooks/useReducedMotion"),
  useReducedMotion: () => true,
}));

// Flag off, the iso map is never required (mock-up index, isoSpec.json): every read of the export is
// counted, so a test compares before and after and does not depend on the tests that ran earlier.
let mockIsoAcces = 0;
const mockIsoProps: {
  width?: number;
  height?: number;
  margeBas?: number;
  croissance?: { cle: string };
  onCroissanceFinie?: () => void;
  reclamables?: string[];
  niveauxReclames?: Record<string, number>;
  onBulle?: (o: Ouverture) => void;
  viseur?: { current: ((x: number, y: number) => Ouverture | null) | undefined };
}[] = [];
// Each mount of the map counts once: a rotation must not remount it (L6-T21).
let mockIsoMontages = 0;
jest.mock("@/components/village/iso/IsoVillage", () => {
  const { View } = require("react-native");
  const React = require("react");
  // One component for every read, as a real module export is: a fresh one per read remounts.
  const Carte = (props: (typeof mockIsoProps)[number]) => {
    mockIsoProps.push(props);
    React.useEffect(() => {
      mockIsoMontages++;
    }, []);
    return React.createElement(View, { testID: "iso-village" });
  };
  return {
    get IsoVillage() {
      mockIsoAcces++;
      return Carte;
    },
  };
});

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function building(
  code: BuildingCode,
  level: number,
  extra: Partial<village.VillageBuilding> = {},
): village.VillageBuilding {
  const def = buildingDefinitions[code];
  return {
    code,
    emoji: "",
    tier: def.tier,
    level,
    enName: code,
    frName: code,
    deName: code,
    esName: code,
    ruName: code,
    zhName: code,
    unlockCondition: "",
    relatedMuscle: def.relatedMuscle,
    driver: "tier",
    metricValue: 0,
    nextTarget: null,
    ...extra,
  };
}

const campfire = building("campfire", 4, { metricValue: 8, nextTarget: 10 });
const forge = building("forge", 1, { driver: "muscle", metricValue: 60, nextTarget: 100 });
// Further along in percent (65 against 60), further away in reps (350 against 40).
const farm = building("farm", 4, { driver: "muscle", metricValue: 650, nextTarget: 1000 });
const quarry = building("quarry", 0, { driver: "muscle", metricValue: 0, nextTarget: 1 });
const barn = building("barn", 2, { driver: "prereq", metricValue: 4, nextTarget: 5 });

function mockScene(buildings: village.VillageBuilding[], over: Partial<village.VillageScene> = {}) {
  jest.spyOn(village, "getVillageScene").mockResolvedValue({
    tier: 4,
    level: 8,
    title: {
      en: "Champion",
      fr: "Champion",
      de: "Champion",
      es: "Champion",
      ru: "Чемпион",
      zh: "Champion",
    },
    totalXp: 3180,
    flame: 0,
    streakDays: 0,
    dominantSport: null,
    buildings,
    ...over,
  });
}

/** What the latest sessions brought; empty by default, which is a hero nothing has fed. */
function mockFeeds(over: Partial<RecentFeeds> = {}) {
  jest
    .spyOn(feedDb, "getRecentFeeds")
    .mockResolvedValue({ muscle: {}, style: {}, outing: [], ...over });
}

function renderScene(iso?: boolean) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <GestureHandlerRootView>
          <VillageScene iso={iso} />
        </GestureHandlerRootView>
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

describe("VillageScene", () => {
  beforeEach(() => {
    jest.spyOn(crestDb, "getCrest").mockResolvedValue(null);
    mockFeeds();
  });
  // The window a rotation test turned is put back upright.
  const portrait = Dimensions.get("window");
  afterEach(() => {
    jest.restoreAllMocks();
    mockParams = {};
    mockFocusTick = 0;
    Dimensions.set({ window: portrait });
  });

  it("puts the closest rung first, in reps, with its unit at both ends of the bar", async () => {
    mockScene([campfire, forge, farm, quarry, barn]);
    mockFeeds({ muscle: { chest: [20, 20] } });

    const { findByTestId } = await renderScene();
    const next = within(await findByTestId("village-next"));

    expect(next.getByText("Forge")).toBeTruthy();
    // What is done and the two ends of the rung; never what is left to do.
    expect(next.getByText("60 reps done")).toBeTruthy();
    expect(next.getByText("0 reps")).toBeTruthy();
    expect(next.getByText("100 reps")).toBeTruthy();
    expect(next.getByText("Rank 2 in about 2 chest sessions.")).toBeTruthy();
    expect(next.queryByText(/to level|reps to go/)).toBeNull();
  });

  it("names the road for a runner: the soonest rank is in outings, whatever the reps left say", async () => {
    const road = building("high_road", 3, { driver: "leagues", metricValue: 18, nextTarget: 30 });
    mockScene([campfire, forge, road]);
    mockFeeds({ muscle: { chest: [10] }, outing: [3, 3, 6] });

    const { findByTestId } = await renderScene();
    const next = within(await findByTestId("village-next"));

    expect(next.getByText("Rank 4 in about 3 outings.")).toBeTruthy();
    expect(next.queryByText("Forge")).toBeNull();
  });

  it("sets the building's name in the chronicle's font, like its sheet", async () => {
    mockScene([campfire, forge, farm, quarry, barn]);

    const { findByTestId } = await renderScene();
    const name = within(await findByTestId("village-next")).getByText("Forge");

    expect(StyleSheet.flatten(name.props.style).fontFamily).toMatch(/Alegreya/i);
  });

  it("paints the tier's image, not the iso map, while INTEGRATION is off", async () => {
    mockScene([campfire, forge]);
    const avant = mockIsoAcces;

    const { findByTestId, queryByTestId, toJSON } = await renderScene();
    await findByTestId("village-next");

    expect(queryByTestId("iso-village")).toBeNull();
    expect(mockIsoAcces).toBe(avant);
    expect(JSON.stringify(toJSON())).toContain(JSON.stringify(getVillageTierAsset(4)));
  });

  it("flag off: no strip, no drawer, the list scrolls under the painting, as before T45", async () => {
    mockParams = { grown: "forge:2:3" };
    mockScene([campfire, forge]);
    const { findByTestId, queryByTestId, getByTestId } = await renderScene();
    expect(INTEGRATION).toBe(false);
    await findByTestId("village-next");
    expect(queryByTestId("village-drawer-open")).toBeNull();
    expect(queryByTestId("village-drawer")).toBeNull();
    expect(within(getByTestId("village-scroll")).getByTestId("village-hero")).toBeTruthy();
    expect(within(getByTestId("village-scroll")).getByTestId("village-next")).toBeTruthy();
    expect(within(getByTestId("village-scroll")).getByTestId("village-tier")).toBeTruthy();
    // The golden card still comes up over the painting.
    expect(await findByTestId("village-reward")).toBeTruthy();
    expect(queryByTestId("village-hero-room")).toBeNull();
  });

  describe("ready to improve (L6-T13)", () => {
    // The forge stands at rank 4 (solid) and was claimed at rank 2 (rough); the farm is as claimed.
    const forgeUp = building("forge", 4, { driver: "muscle", metricValue: 300, nextTarget: 500 });
    const farmUp = building("farm", 4, { driver: "muscle", metricValue: 650, nextTarget: 1000 });
    const last = () => mockIsoProps.at(-1);
    // The list is in the drawer on the iso page (T45): open it, as the hero does.
    const renderIsoDrawer = async () => {
      const scene = await renderScene(true);
      await fireEvent.press(await scene.findByTestId("village-drawer-open"));
      return scene;
    };

    it("flag off: the claimed stages are neither read nor written", async () => {
      mockScene([campfire, forgeUp]);
      const read = jest.spyOn(village, "getClaimedStages");
      const write = jest.spyOn(village, "claimStage");
      const { findByTestId, queryByText } = await renderScene();
      await findByTestId("village-next");
      expect(read).not.toHaveBeenCalled();
      expect(write).not.toHaveBeenCalled();
      expect(queryByText("Ready to evolve")).toBeNull();
    });

    it("says it on the row and to TalkBack, draws the claimed level, writes nothing yet", async () => {
      mockScene([campfire, forgeUp]);
      jest.spyOn(village, "getClaimedStages").mockResolvedValue({ forge: 2 });
      const write = jest.spyOn(village, "claimStage").mockResolvedValue({ forge: 4 });
      mockIsoProps.length = 0;
      const { findByText, findAllByTestId } = await renderIsoDrawer();
      await findByText("Ready to evolve");
      const labels = (await findAllByTestId("village-building-row")).map(
        (r) => r.props.accessibilityLabel as string,
      );
      expect(labels).toContain("Forge ready to evolve, rank 4");
      expect(last()?.reclamables).toEqual(["forge"]);
      expect(last()?.niveauxReclames).toEqual({ forge: 2 });
      expect(write).not.toHaveBeenCalled();
    });

    it("the sheet's button starts the site, and the key is written when the site is over", async () => {
      mockScene([campfire, forgeUp]);
      jest.spyOn(village, "getClaimedStages").mockResolvedValue({ forge: 2 });
      const write = jest.spyOn(village, "claimStage").mockResolvedValue({ forge: 4 });
      const { findByLabelText, findByTestId } = await renderIsoDrawer();
      await fireEvent.press(await findByLabelText("Forge ready to evolve, rank 4"));
      await fireEvent.press(await findByTestId("village-claim"));
      await waitFor(() => expect(last()?.croissance).toBeDefined());
      // The new stage shows from the first frame of the site; nothing is written before its end.
      expect(last()?.niveauxReclames).toEqual({ forge: 4 });
      expect(last()?.reclamables).toEqual([]);
      expect(write).not.toHaveBeenCalled();
      await act(async () => last()?.onCroissanceFinie?.());
      expect(write).toHaveBeenCalledTimes(1);
      expect(write).toHaveBeenCalledWith([forgeUp]);
    });

    it("a tap on the map opens the bubble, not the sheet; its Evolve starts the same site", async () => {
      mockScene([campfire, forgeUp]);
      jest.spyOn(village, "getClaimedStages").mockResolvedValue({ forge: 2 });
      jest.spyOn(village, "claimStage").mockResolvedValue({ forge: 4 });
      const scene = await renderIsoDrawer();
      await scene.findByText("Ready to evolve");
      const forgeTap: Ouverture = { cible: { type: "batiment", code: "forge" }, ancre: [195, 400] };
      await act(async () => last()?.onBulle?.(forgeTap));
      expect(scene.getByTestId("iso-bulle-nom").props.accessibilityLabel).toBe(
        "Forge ready to evolve, rank 4",
      );
      expect(scene.queryByTestId("village-detail")).toBeNull();
      await fireEvent.press(scene.getByTestId("village-claim"));
      await waitFor(() => expect(last()?.croissance).toBeDefined());
      // jest's window reads text at 200 %: this was the sheet, which keeps its words as it slides shut.
      expect(scene.queryByTestId("village-claim")).toBeNull();
    });

    it("the bubble's outside tap asks the map what lies there: the same building closes it", async () => {
      mockScene([campfire, forgeUp]);
      jest.spyOn(village, "getClaimedStages").mockResolvedValue({ forge: 2 });
      jest.spyOn(village, "claimStage").mockResolvedValue({ forge: 4 });
      // Text at 100 %, so the bubble is the framed one with its outside backdrop.
      Dimensions.set({ window: { ...portrait, fontScale: 1 } });
      const scene = await renderIsoDrawer();
      await scene.findByText("Ready to evolve");
      const forgeTap: Ouverture = { cible: { type: "batiment", code: "forge" }, ancre: [195, 400] };
      const viseur = last()?.viseur;
      await act(async () => last()?.onBulle?.(forgeTap));
      expect(scene.getByTestId("iso-bulle-nom")).toBeTruthy();
      const dehors = scene.getByTestId("iso-bulle-dehors", { includeHiddenElements: true });
      const ici = { nativeEvent: { pageX: 195, pageY: 420 } };
      const vise = jest.fn(() => forgeTap);
      if (viseur) viseur.current = vise;
      await fireEvent(dehors, "pressIn", ici);
      await fireEvent.press(dehors, ici);
      expect(vise).toHaveBeenCalledWith(195, 420);
      expect(scene.queryByTestId("iso-bulle-nom", { includeHiddenElements: true })).toBeNull();
    });

    it("while a building's panel is up the title, the scrim and the villager give way, then come back", async () => {
      mockScene([campfire, forgeUp]);
      jest.spyOn(village, "getClaimedStages").mockResolvedValue({ forge: 2 });
      jest.spyOn(village, "claimStage").mockResolvedValue({ forge: 4 });
      Dimensions.set({ window: { ...portrait, fontScale: 1 } });
      const scene = await renderScene(true);
      await scene.findByTestId("iso-village");
      const titre = () => scene.getByTestId("village-title", { includeHiddenElements: true });
      expect(titre().props.importantForAccessibility).toBe("auto");
      const forgeTap: Ouverture = { cible: { type: "batiment", code: "forge" }, ancre: [195, 150] };
      await act(async () => last()?.onBulle?.(forgeTap));
      await scene.findByTestId("iso-panneau");
      expect(titre().props.importantForAccessibility).toBe("no-hide-descendants");
      // Closed by the outside tap on the empty map, the title is back.
      const viseur = last()?.viseur;
      if (viseur) viseur.current = () => null;
      const dehors = scene.getByTestId("iso-bulle-dehors", { includeHiddenElements: true });
      const ici = { nativeEvent: { pageX: 10, pageY: 10 } };
      await fireEvent(dehors, "pressIn", ici);
      await fireEvent.press(dehors, ici);
      expect(scene.queryByTestId("iso-panneau")).toBeNull();
      expect(titre().props.importantForAccessibility).toBe("auto");
    });

    it("hides the title while a claim's growth plays, and brings it back after", async () => {
      mockScene([campfire, forgeUp]);
      jest.spyOn(village, "getClaimedStages").mockResolvedValue({ forge: 2 });
      jest.spyOn(village, "claimStage").mockResolvedValue({ forge: 4 });
      const { findByLabelText, findByTestId, getByTestId } = await renderIsoDrawer();
      await fireEvent.press(await findByLabelText("Forge ready to evolve, rank 4"));
      await fireEvent.press(await findByTestId("village-claim"));
      await waitFor(() => expect(last()?.croissance).toBeDefined());
      const titre = () => getByTestId("village-title", { includeHiddenElements: true });
      expect(titre().props.importantForAccessibility).toBe("no-hide-descendants");
      await act(async () => last()?.onCroissanceFinie?.());
      expect(titre().props.importantForAccessibility).toBe("auto");
    });

    describe("the end of a session opens the panel by itself (G8)", () => {
      const farmReady = building("farm", 4, {
        driver: "muscle",
        metricValue: 650,
        nextTarget: 1000,
      });
      const settle = () => act(async () => new Promise((r) => setTimeout(r, 20)));

      it("on the building the session raised, once, also after the screen remounts", async () => {
        // The forge and the farm are both ready; the farm is the one this session raised.
        mockParams = { grown: "farm:3:4" };
        mockScene([campfire, forgeUp, farmReady]);
        jest
          .spyOn(village, "getClaimedStages")
          .mockResolvedValue({ forge: 2, farm: 2, campfire: 4 });
        const write = jest.spyOn(village, "claimStage").mockResolvedValue({});
        const scene = await renderScene(true);
        const nom = await scene.findByTestId("iso-bulle-nom");
        expect(nom.props.accessibilityLabel).toBe("Farm ready to evolve, rank 4");
        // Only the player's tap upgrades.
        expect(write).not.toHaveBeenCalled();
        expect(last()?.croissance).toBeUndefined();
        await scene.unmount();
        const again = await renderScene(true);
        await again.findByTestId("iso-village");
        await waitFor(() => expect(last()?.reclamables).toEqual(["forge", "farm"]));
        await settle();
        expect(again.queryByTestId("iso-bulle-nom", { includeHiddenElements: true })).toBeNull();
      });

      it("falls back to the first ready building when the session raised none of them", async () => {
        mockParams = { grown: "campfire:3:4" };
        mockScene([campfire, forgeUp, farmReady]);
        jest
          .spyOn(village, "getClaimedStages")
          .mockResolvedValue({ forge: 2, farm: 2, campfire: 4 });
        jest.spyOn(village, "claimStage").mockResolvedValue({});
        const scene = await renderScene(true);
        expect((await scene.findByTestId("iso-bulle-nom")).props.accessibilityLabel).toBe(
          "Forge ready to evolve, rank 4",
        );
      });

      it("never on a plain visit, even with a building ready", async () => {
        mockScene([campfire, forgeUp]);
        jest.spyOn(village, "getClaimedStages").mockResolvedValue({ forge: 2 });
        const scene = await renderScene(true);
        await scene.findByTestId("iso-village");
        await waitFor(() => expect(last()?.reclamables).toEqual(["forge"]));
        await settle();
        expect(scene.queryByTestId("iso-bulle-nom", { includeHiddenElements: true })).toBeNull();
      });

      it("never when nothing is ready", async () => {
        mockParams = { grown: "campfire:3:5" };
        mockScene([campfire]);
        jest.spyOn(village, "getClaimedStages").mockResolvedValue({ campfire: 4 });
        const scene = await renderScene(true);
        await scene.findByTestId("iso-village");
        await settle();
        expect(last()?.reclamables).toEqual([]);
        expect(scene.queryByTestId("iso-bulle-nom", { includeHiddenElements: true })).toBeNull();
      });

      it("waits for the write of the session's stages: the building is ready only after", async () => {
        // Never written: the farm rose in the session, so it is written at its old level, then ready.
        mockParams = { grown: "farm:2:4" };
        mockScene([campfire, farmReady]);
        const mem: village.ClaimedStages = {};
        jest
          .spyOn(village, "getClaimedStages")
          .mockImplementation(() => Promise.resolve({ ...mem }));
        jest.spyOn(village, "claimStage").mockImplementation((items) => {
          for (const { code, level } of items) mem[code] = level;
          return Promise.resolve({ ...mem });
        });
        const scene = await renderScene(true);
        expect((await scene.findByTestId("iso-bulle-nom")).props.accessibilityLabel).toBe(
          "Farm ready to evolve, rank 4",
        );
      });

      it("published mode (iso off) never opens it", async () => {
        mockParams = { grown: "forge:3:4" };
        mockScene([campfire, forgeUp]);
        const scene = await renderScene(false);
        await scene.findByTestId("village-next");
        await settle();
        expect(scene.queryByTestId("iso-panneau")).toBeNull();
        expect(scene.queryByTestId("iso-bulle-nom", { includeHiddenElements: true })).toBeNull();
      });
    });

    it("unmounted during the site: nothing is written, the building is ready again", async () => {
      mockScene([campfire, forgeUp]);
      jest.spyOn(village, "getClaimedStages").mockResolvedValue({ forge: 2 });
      const write = jest.spyOn(village, "claimStage").mockResolvedValue({ forge: 4 });
      const first = await renderIsoDrawer();
      await fireEvent.press(await first.findByLabelText("Forge ready to evolve, rank 4"));
      await fireEvent.press(await first.findByTestId("village-claim"));
      await waitFor(() => expect(last()?.croissance).toBeDefined());
      await first.unmount();
      expect(write).not.toHaveBeenCalled();
      mockIsoProps.length = 0;
      await renderIsoDrawer();
      await waitFor(() => expect(last()?.reclamables).toEqual(["forge"]));
    });

    it("upgrade all from two ready buildings: one write for both", async () => {
      mockScene([campfire, forgeUp, farmUp]);
      jest.spyOn(village, "getClaimedStages").mockResolvedValue({ forge: 2, farm: 2 });
      const write = jest.spyOn(village, "claimStage").mockResolvedValue({ forge: 4, farm: 4 });
      const { findByTestId, queryByTestId } = await renderIsoDrawer();
      await fireEvent.press(await findByTestId("village-claim-all"));
      await waitFor(() => expect(last()?.croissance).toBeDefined());
      await act(async () => last()?.onCroissanceFinie?.());
      expect(write).toHaveBeenCalledTimes(1);
      expect(write.mock.calls[0]?.[0].map((b) => b.code).sort()).toEqual(["farm", "forge"]);
      expect(queryByTestId("village-claim-all")).toBeNull();
    });

    it("reduced motion plays no scene: a sentence says it, and the key is written", async () => {
      mockScene([campfire, forgeUp]);
      jest.spyOn(village, "getClaimedStages").mockResolvedValue({ forge: 2 });
      jest.spyOn(village, "claimStage").mockResolvedValue({ forge: 4 });
      const { findByLabelText, findByTestId } = await renderIsoDrawer();
      await fireEvent.press(await findByLabelText("Forge ready to evolve, rank 4"));
      await fireEvent.press(await findByTestId("village-claim"));
      await waitFor(() => expect(last()?.croissance).toBeDefined());
      await act(async () => last()?.onCroissanceFinie?.());
      expect((await findByTestId("village-evolved")).props.accessibilityLiveRegion).toBe("polite");
    });

    it("a counted session evolves nothing by itself: the ready building waits for its tap", async () => {
      // The forge was ready before the session (claimed 2, stood at 3); the farm rose to 4 in it, inside its stage.
      mockParams = { grown: "forge:3:4,farm:3:4" };
      mockScene([campfire, forgeUp, farmUp]);
      jest.spyOn(village, "getClaimedStages").mockResolvedValue({ forge: 2, farm: 3 });
      const write = jest.spyOn(village, "claimStage").mockResolvedValue({ forge: 3, farm: 3 });
      mockIsoProps.length = 0;
      await renderIsoDrawer();
      await waitFor(() => expect(last()?.reclamables).toEqual(["forge"]));
      expect(write).not.toHaveBeenCalled();
      expect(mockIsoProps.every((p) => p.croissance === undefined)).toBe(true);
    });

    it("a counted session with nothing ready before writes nothing", async () => {
      mockParams = { grown: "farm:4:5" };
      mockScene([
        campfire,
        building("farm", 5, { driver: "muscle", metricValue: 900, nextTarget: 1000 }),
      ]);
      jest.spyOn(village, "getClaimedStages").mockResolvedValue({ farm: 4 });
      const write = jest.spyOn(village, "claimStage").mockResolvedValue({});
      const { findAllByText } = await renderIsoDrawer();
      // In the drawer's row, and in the panel the end of the session opens by itself.
      expect((await findAllByText("Ready to evolve")).length).toBeGreaterThan(0);
      expect(write).not.toHaveBeenCalled();
    });

    it("end to end from a key that was never written: the session's gain is ready, then played and written", async () => {
      // Memory stands for the preference: the real reader and writer run on top of it.
      const mem: village.ClaimedStages = {};
      jest.spyOn(village, "getClaimedStages").mockImplementation(() => Promise.resolve({ ...mem }));
      const write = jest.spyOn(village, "claimStage").mockImplementation((items) => {
        for (const { code, level } of items) mem[code] = Math.max(mem[code] ?? 0, level);
        return Promise.resolve({ ...mem });
      });
      // The forge crossed into solid (2 -> 3) in the session just counted.
      mockParams = { grown: "forge:2:3" };
      mockScene([
        campfire,
        building("forge", 3, { driver: "muscle", metricValue: 300, nextTarget: 500 }),
      ]);
      mockIsoProps.length = 0;
      const { findByTestId } = await renderScene(true);
      // Seeded at the level it stood at before the session: nothing was ready, now the forge is.
      await waitFor(() => expect(last()?.reclamables).toEqual(["forge"]));
      expect(mem).toEqual({ forge: 2, campfire: 4 });
      expect(last()?.niveauxReclames).toEqual({ forge: 2, campfire: 4 });
      write.mockClear();
      // The end of the session opened the forge's panel by itself: the tap is the player's.
      expect(write).not.toHaveBeenCalled();
      await fireEvent.press(await findByTestId("village-claim"));
      await waitFor(() => expect(last()?.croissance).toBeDefined());
      expect(write).not.toHaveBeenCalled();
      await act(async () => last()?.onCroissanceFinie?.());
      expect(write).toHaveBeenCalledWith([expect.objectContaining({ code: "forge", level: 3 })]);
      expect(mem.forge).toBe(3);
    });

    it("the first time the flag is on, one write of the present levels changes nothing on screen", async () => {
      const mem: village.ClaimedStages = {};
      jest.spyOn(village, "getClaimedStages").mockImplementation(() => Promise.resolve({ ...mem }));
      const write = jest.spyOn(village, "claimStage").mockImplementation((items) => {
        for (const { code, level } of items) mem[code] = level;
        return Promise.resolve({ ...mem });
      });
      mockScene([campfire, forgeUp]);
      mockIsoProps.length = 0;
      await renderIsoDrawer();
      await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
      expect(mem).toEqual({ campfire: 4, forge: 4 });
      expect(last()?.reclamables).toEqual([]);
    });

    it("TalkBack: the row of a ready building carries an Evolve action, the sheet's handler", async () => {
      mockScene([campfire, forgeUp]);
      jest.spyOn(village, "getClaimedStages").mockResolvedValue({ forge: 2 });
      const write = jest.spyOn(village, "claimStage").mockResolvedValue({ forge: 4 });
      const { findByLabelText } = await renderIsoDrawer();
      const row = await findByLabelText("Forge ready to evolve, rank 4");
      expect(row.props.accessibilityActions).toEqual([{ name: "evolve", label: "Evolve" }]);
      await fireEvent(row, "accessibilityAction", { nativeEvent: { actionName: "evolve" } });
      await waitFor(() => expect(last()?.croissance).toBeDefined());
      await act(async () => last()?.onCroissanceFinie?.());
      expect(write).toHaveBeenCalledWith([forgeUp]);
    });

    it("a single ready building has no upgrade-all button", async () => {
      mockScene([campfire, forgeUp]);
      jest.spyOn(village, "getClaimedStages").mockResolvedValue({ forge: 2 });
      const { findByText, queryByTestId } = await renderIsoDrawer();
      await findByText("Ready to evolve");
      expect(queryByTestId("village-claim-all")).toBeNull();
    });
  });

  it("opens the painting's viewer on a press of the hero, and not when the iso map is up", async () => {
    mockScene([campfire, forge]);

    const painting = await renderScene();
    await fireEvent.press(await painting.findByTestId("village-hero"));
    expect(painting.queryByTestId("village-scene-viewer")).toBeTruthy();
    await painting.unmount();

    // The map's taps would also reach a press on the hero and cover the building's sheet.
    const iso = await renderScene(true);
    const hero = await iso.findByTestId("village-hero");
    expect(hero.props.onPress).toBeUndefined();
    await fireEvent.press(hero);
    expect(iso.queryByTestId("village-scene-viewer")).toBeNull();
  });

  it("reads the rank with the name on the rows and the next card", async () => {
    mockScene([campfire, forge]);

    const { findByTestId, findAllByTestId } = await renderScene();
    const rows = await findAllByTestId("village-building-row");
    const labels = rows.map((r) => r.props.accessibilityLabel as string);
    expect(labels).toContain("Forge, rank 1");
    expect(labels.every((l) => /, (rank \d+|Not built yet)$/.test(l))).toBe(true);
    const next = within(await findByTestId("village-next")).getByLabelText(/^Forge, /);
    expect(next).toBeTruthy();
  });

  it("lets the map under the title keep its touches in iso, as on the painting", async () => {
    mockScene([campfire, forge]);

    const painting = await renderScene();
    const titre = await painting.findByTestId("village-title");
    expect(titre.props.pointerEvents ?? StyleSheet.flatten(titre.props.style)?.pointerEvents).toBe(
      "box-none",
    );
    await painting.unmount();

    const iso = await renderScene(true);
    const titreIso = await iso.findByTestId("village-title");
    expect(
      titreIso.props.pointerEvents ?? StyleSheet.flatten(titreIso.props.style)?.pointerEvents,
    ).toBe("box-none");
  });

  it("fills the hero under the title and frames the island above it", async () => {
    mockScene([campfire, forge]);
    mockIsoProps.length = 0;
    await renderScene(true);
    const { height, margeBas } = mockIsoProps.at(-1) ?? {};
    expect(margeBas).toBeGreaterThanOrEqual(50);
    expect(height).toBeGreaterThan(margeBas ?? 0);
  });

  // RNGH's Android hit test makes a handlerless leaf (a gradient) or a backgrounded view the
  // touch target when it lies over the detector, so the map's gestures never started (qa, L3-T07a).
  it("lets the map's touches through every layer drawn over it", async () => {
    mockScene([campfire, forge]);
    const iso = await renderScene(true);
    const hero = await iso.findByTestId("village-hero");
    const enfants = (hero.children as unknown[]).filter(
      (k): k is Parameters<typeof within>[0] => typeof k !== "string",
    );
    const carte = enfants.findIndex(
      (k) => k.props.testID === "iso-village" || within(k).queryByTestId("iso-village") !== null,
    );
    expect(carte).toBeGreaterThanOrEqual(0);
    const dessus = enfants.slice(carte + 1);
    expect(dessus.length).toBeGreaterThan(2);
    for (const k of dessus) {
      const mode = k.props.pointerEvents ?? StyleSheet.flatten(k.props.style)?.pointerEvents;
      expect([k.props.testID ?? k.type, mode]).toEqual([
        k.props.testID ?? k.type,
        expect.stringMatching(/^(none|box-none)$/),
      ]);
    }
  });

  it("shows the iso map when the dev route asks for it, without touching the flag", async () => {
    mockScene([campfire, forge]);

    const { findByTestId } = await renderScene(true);

    await findByTestId("iso-village");
    expect(INTEGRATION).toBe(false);
  });

  it("never unlocks the orientation while INTEGRATION is off, even with the iso map up", async () => {
    mockScene([campfire, forge]);
    const orientation = jest.requireMock("expo-screen-orientation") as { unlockAsync: jest.Mock };
    orientation.unlockAsync.mockClear();

    await (await renderScene(true)).findByTestId("iso-village");

    expect(INTEGRATION).toBe(false);
    expect(orientation.unlockAsync).not.toHaveBeenCalled();
  });

  // The window turns first, then the screen's area is laid out again, as on a phone.
  const turn = async (scene: Awaited<ReturnType<typeof renderScene>>, w: number, h: number) => {
    await act(() => Dimensions.set({ window: { ...portrait, width: w, height: h + 60 } }));
    await act(() =>
      fireEvent(scene.getByTestId("village-screen"), "layout", {
        nativeEvent: { layout: { x: 0, y: 0, width: w, height: h } },
      }),
    );
  };

  it("lays the iso map over the whole width in landscape too, the title over it", async () => {
    mockScene([campfire, forge]);
    const scene = await renderScene(true);
    await scene.findByTestId("village-hero");

    await turn(scene, 850, 330);

    const side = scene.getByTestId("village-map-side");
    expect(within(side).getByTestId("iso-village")).toBeTruthy();
    // The page less the drawer's strip (56).
    expect(StyleSheet.flatten(side.props.style)).toMatchObject({ width: 850, height: 274 });
    expect(scene.queryByTestId("village-hero")).toBeNull();
    expect(within(side).getByTestId("village-title")).toBeTruthy();
    expect(scene.queryByTestId("village-scroll")).toBeNull();
  });

  // A remount lost the dragged view on the way back to portrait and redrew the world without its
  // buildings (qa, T21). The same instance keeps its camera, and a resize keeps the view
  // (iso-camera, "keeps a zoomed view when the area turns").
  it("keeps the same map instance through a rotation and back, only its size changes", async () => {
    mockScene([campfire, forge]);
    const scene = await renderScene(true);
    await scene.findByTestId("iso-village");
    await turn(scene, 390, 760);
    const montages = mockIsoMontages;
    const taille = () => [mockIsoProps.at(-1)?.width, mockIsoProps.at(-1)?.height];
    const enPortrait = taille();

    await turn(scene, 850, 330);
    expect(scene.getByTestId("village-map-side")).toBeTruthy();
    expect(taille()).toEqual([850, 274]);
    await turn(scene, 390, 760);
    expect(scene.getByTestId("village-hero")).toBeTruthy();

    expect(mockIsoMontages).toBe(montages);
    expect(taille()).toEqual(enPortrait);
  });

  it("lays out the new orientation as soon as the window turns, before the area is measured", async () => {
    mockScene([campfire, forge]);
    const scene = await renderScene(true);
    await turn(scene, 390, 760);

    // The area still holds the portrait measure, which no longer fits the landscape window.
    await act(() => Dimensions.set({ window: { ...portrait, width: 850, height: 390 } }));

    expect(scene.getByTestId("village-map-side")).toBeTruthy();
  });

  // The map's layout in the window alone (area not yet measured) is the one the measured area
  // confirms: no second jump when onLayout arrives (T38 lot 3). Bar = 60 over the 34 dp inset.
  it.each([
    ["phone portrait", 390, 844],
    ["phone landscape", 844, 390],
    ["tablet portrait", 800, 1280],
    ["tablet landscape", 1280, 800],
  ])(
    "keeps the map's size when the area is measured after the window turned (%s)",
    async (_n, w, h) => {
      mockScene([campfire, forge]);
      const scene = await renderScene(true);
      await scene.findByTestId("iso-village");
      // The last area is the other orientation's, wider or taller than the new window: stale.
      await (w > h ? turn(scene, 300, 1500) : turn(scene, 1500, 300));
      await act(() => Dimensions.set({ window: { ...portrait, width: w, height: h } }));
      const taille = () => [mockIsoProps.at(-1)?.width, mockIsoProps.at(-1)?.height];
      const avant = taille();
      await act(() =>
        fireEvent(scene.getByTestId("village-screen"), "layout", {
          nativeEvent: { layout: { x: 0, y: 0, width: w, height: h - 60 - 34 } },
        }),
      );
      expect(taille()).toEqual(avant);
    },
  );

  // TalkBack reads in tree order, and Fabric reorders by zIndex: the strip is first in the tree and
  // nothing in the iso page carries a zIndex (T45).
  it("puts the drawer's strip first in the iso tree, then the title, with no zIndex anywhere", async () => {
    mockScene([campfire, forge]);
    const scene = await renderScene(true);
    await scene.findByTestId("village-drawer-open");
    const arbre = JSON.stringify(scene.toJSON());
    expect(arbre.indexOf('"village-drawer-open"')).toBeGreaterThan(-1);
    expect(arbre.indexOf('"village-drawer-open"')).toBeLessThan(arbre.indexOf('"village-title"'));
    expect(
      StyleSheet.flatten(scene.getByTestId("village-hero").props.style).zIndex,
    ).toBeUndefined();
    expect(arbre).not.toContain('"zIndex"');
  });

  it("is a single button with the tier, no badge, that the list answers to", async () => {
    mockScene([campfire, forge]);
    const scene = await renderScene(true);
    const strip = await scene.findByTestId("village-drawer-open");
    expect(strip.props.accessibilityRole).toBe("button");
    expect(strip.props.accessibilityLabel).toMatch(/^Your village, tier \d+$/);
    // Nothing of the list is on the page until the drawer opens.
    expect(scene.queryByTestId("village-next")).toBeNull();
    expect(scene.queryByTestId("village-scroll")).toBeNull();
    await fireEvent.press(strip);
    expect(await scene.findByTestId("village-next")).toBeTruthy();
    expect((await scene.findAllByTestId("village-building-row")).length).toBeGreaterThan(0);
    expect(scene.getByTestId("village-tier")).toBeTruthy();
  });

  it("leaves the drawer when one of its rows opens a building", async () => {
    Dimensions.set({ window: { ...portrait, fontScale: 1 } });
    mockScene([campfire, forge]);
    const scene = await renderScene(true);
    await fireEvent.press(await scene.findByTestId("village-drawer-open"));
    const rows = await scene.findAllByTestId("village-building-row");
    await fireEvent.press(rows[0] as (typeof rows)[number]);
    // Iso: the building's panel on the map, not the old sheet (text at 100 %, so the panel and not its sheet).
    expect(await scene.findByTestId("iso-panneau")).toBeTruthy();
    expect(scene.getByTestId("iso-bulle-nom").props.accessibilityLabel).toBe("Forge, rank 1");
    expect(scene.queryByTestId("village-detail")).toBeNull();
    // No anchor from a list: the bottom dock, no halo.
    expect(scene.queryByTestId("iso-halo", { includeHiddenElements: true })).toBeNull();
  });

  // The shield's press stays on the title, and the title is read as it stands: no hidden copy.
  it("speaks the iso title where it stands, with the shield as a button", async () => {
    mockScene([campfire, forge]);
    jest.spyOn(crestDb, "getCrest").mockResolvedValue({
      animal: "bear",
      stage: "young",
      manual: false,
      picked: "auto",
      second: null,
      quarters: null,
      revealedIndex: 7,
      evidence: {
        firstEight: { strength: 0, calisthenics: 0, yoga: 0, run: 0, ride: 0 },
        firstEightOrder: [],
        totals: { strength: 0, calisthenics: 0, yoga: 0, run: 0, ride: 0 },
        first: "bear",
        secondFromSessions: null,
        boarQuarters: null,
      },
      longestFlame: 0,
      rings: 0,
      revealedAt: new Date(2020, 0, 1),
    });
    const scene = await renderScene(true);
    const crest = await scene.findByTestId("village-crest");
    expect(crest.props.accessibilityRole).toBe("button");
    expect(crest.props.accessibilityLabel).toBe("Why the Bear?");

    // A one-word name is never split mid-word: one line, shrunk to fit.
    const word = within(await scene.findByTestId("village-name-cartouche")).getByText(/./);
    expect(word.props.children).not.toMatch(/[\s-]/);
    expect(word.props.numberOfLines).toBe(1);
    expect(word.props.adjustsFontSizeToFit).toBe(true);
    const titre = scene.getByTestId("village-title");
    expect(titre.props.importantForAccessibility).toBe("auto");
    expect(scene.queryByTestId("village-hero-room")).toBeNull();
    expect(within(titre).getByText(/Level\s8\s·\sChampion/)).toBeTruthy();
    expect(scene.getByTestId("village-crest-line").props.children).toBeTruthy();

    await fireEvent.press(crest);
    expect(await scene.findByText("Why the Bear?")).toBeTruthy();
  });

  it("keeps the painting's title plain and spoken where it stands", async () => {
    mockScene([campfire, forge]);
    const scene = await renderScene();
    await scene.findByTestId("village-title");
    expect(scene.queryByTestId("village-name-cartouche")).toBeNull();
    expect(scene.getByTestId("village-title").props.importantForAccessibility).toBe("auto");
  });

  it("says nothing of when for a building nothing has fed", async () => {
    mockScene([campfire, forge, farm, quarry, barn]);

    const { findByTestId } = await renderScene();
    const next = within(await findByTestId("village-next"));

    expect(next.getByText("60 reps done")).toBeTruthy();
    expect(next.queryByText(/Rank 2/)).toBeNull();
  });

  it("says nothing of when at the top rank", async () => {
    mockScene([
      campfire,
      building("forge", 5, { driver: "muscle", metricValue: 9000, nextTarget: null }),
      farm,
    ]);
    mockFeeds({ muscle: { chest: [20, 20] } });

    const { findByTestId, queryByText } = await renderScene();
    await findByTestId("village-next");

    expect(queryByText(/Rank 6/)).toBeNull();
  });

  it.each([
    [70, 30, true],
    [69, 31, false],
  ])(
    "Next to rise at %i reps done is %i sessions away: the line is said: %s",
    async (done, count, said) => {
      mockScene([
        campfire,
        building("forge", 1, { driver: "muscle", metricValue: done, nextTarget: 100 }),
      ]);
      mockFeeds({ muscle: { chest: [1] } });

      const { findByTestId } = await renderScene();
      const next = within(await findByTestId("village-next"));

      // The card stays: only the sentence goes quiet past MILESTONE_QUIET_AFTER.
      expect(next.getByText("Forge")).toBeTruthy();
      const line = next.queryByText(`Rank 2 in about ${count} chest sessions.`);
      expect(line !== null).toBe(said);
      expect(next.queryByText(/chest sessions/) !== null).toBe(said);
    },
  );

  it("counts a road in outings, and its bar is what was walked", async () => {
    const road = building("high_road", 3, { driver: "leagues", metricValue: 18, nextTarget: 30 });
    mockScene([campfire, building("farm", 5, { driver: "muscle", nextTarget: null }), road]);
    mockFeeds({ outing: [3, 3, 6] });

    const { findByTestId } = await renderScene();
    const next = within(await findByTestId("village-next"));

    expect(next.getByText("18 leagues covered beyond the walls")).toBeTruthy();
    expect(next.getByText("Rank 4 in about 3 outings.")).toBeTruthy();
  });

  it("files every building with what feeds it, unbuilt ones included, on its real ceiling", async () => {
    mockScene([campfire, forge, farm, quarry, barn]);

    const { findByTestId, getByTestId } = await renderScene();
    const muscles = within(await findByTestId("village-family-muscle"));

    // No locked drawer: the unbuilt Quarry sits with the muscles that feed it.
    expect(muscles.getByText("Quarry")).toBeTruthy();
    expect(muscles.getByText("Rises with your back")).toBeTruthy();
    // The six upgrades stop at 3; five pips under them promised a road that never came.
    expect(within(getByTestId("village-family-upgrade")).getByText("rank 2")).toBeTruthy();
    expect(within(getByTestId("village-family-starter")).getByText("rank 4")).toBeTruthy();
  });

  it("pins a status-bar-height scrim outside the scroll, so content never slides under the clock", async () => {
    mockScene([campfire, forge]);

    const { findByTestId } = await renderScene();
    await findByTestId("village-next");
    const scrim = await findByTestId("village-status-scrim");
    const style = StyleSheet.flatten(scrim.props.style);

    expect(style.height).toBe(METRICS.insets.top);
    expect(style.position).toBe("absolute");
  });

  // At rest the painting runs full-bleed under the status bar (its own top scrim keeps the clock
  // readable). The pinned scrim only has a job once something scrolls under the clock: drawn
  // always, it was an opaque band across the top of the painting (#153 regression).
  it("keeps the status scrim invisible at rest, and brings it in once the scene scrolls", async () => {
    mockScene([campfire, forge]);

    const { findByTestId, getByTestId } = await renderScene();
    await findByTestId("village-next");
    // The animated half of the style, as the UI thread last wrote it.
    const opacity = () => getAnimatedStyle(getByTestId("village-status-scrim")).opacity;

    expect(opacity()).toBe(0);

    await fireEvent.scroll(getByTestId("village-scroll"), {
      nativeEvent: {
        contentOffset: { x: 0, y: 400 },
        contentSize: { width: 390, height: 2000 },
        layoutMeasurement: { width: 390, height: 844 },
      },
    });
    await waitFor(() => expect(opacity()).toBe(1));
  });

  it("states the rule on day one, when nothing has been earned", async () => {
    mockScene([campfire, quarry], { tier: 1, level: 1 });

    const { findByText, getByTestId, queryByTestId } = await renderScene();

    expect(await findByText("Nothing has risen yet")).toBeTruthy();
    expect(getByTestId("village-family-unbuilt")).toBeTruthy();
    expect(queryByTestId("village-family-muscle")).toBeNull();
  });

  it("says a finished village is finished, and what still answers", async () => {
    mockScene(
      [
        building("campfire", 5),
        building("farm", 5, { driver: "muscle" }),
        building("barn", 3, { driver: "prereq" }),
        building("high_road", 4, { driver: "leagues", metricValue: 118, nextTarget: 200 }),
      ],
      { tier: 12, level: 44 },
    );

    const { findByTestId, getByTestId } = await renderScene();

    // One block for the end, not a "finished" card stacked on a tier card.
    const tier = within(await findByTestId("village-tier"));
    expect(tier.getByTestId("village-done")).toBeTruthy();
    expect(
      tier.getByText("Muscles, styles, upgrades and starters: all at their ceiling."),
    ).toBeTruthy();
    expect(
      tier.getByText("Last tier reached at level 40. The village will not change its look again."),
    ).toBeTruthy();
    expect(tier.getByText("The deeds are just below.")).toBeTruthy();
    expect(getByTestId("village-family-rest")).toBeTruthy();
  });

  it("says when the painting changes next, in hero levels and XP", async () => {
    mockScene([campfire, forge, farm]);

    const { findByTestId } = await renderScene();
    const tier = within(await findByTestId("village-tier"));

    expect(tier.getByText("tier 4 of 12")).toBeTruthy();
    expect(
      tier.getByText("The village changes its look at hero level 10, 2 levels away."),
    ).toBeTruthy();
    // Before the middle of the span it says what is done, with the two ends (no break inside a
    // part; the test's font scale stacks each end over two lines).
    expect(tier.getByText("380 XP done")).toBeTruthy();
    expect(tier.getByText("level\u00a08")).toBeTruthy();
    expect(tier.getByText("2,800\u00a0XP")).toBeTruthy();
    expect(tier.getByText("level\u00a010")).toBeTruthy();
    expect(tier.getByText("4,500\u00a0XP")).toBeTruthy();
    expect(tier.queryByText(/to go|sessions like/)).toBeNull();
  });

  it("names an unbuilt deed by what builds it, and its sheet says it once", async () => {
    const farmDone = building("farm", 5, { driver: "muscle" });
    const lair = building("dragon_lair", 5, { driver: "bosses", metricValue: 6 });
    const arena = building("champion_arena", 0, {
      driver: "rematches",
      metricValue: 0,
      nextTarget: 1,
    });
    mockScene([campfire, farmDone, lair, arena]);

    const { findByTestId } = await renderScene();
    const next = within(await findByTestId("village-next"));

    expect(next.getByText("NEXT TO BUILD")).toBeTruthy();
    expect(next.getByText("Built when you beat a boss a second time")).toBeTruthy();
    expect(next.getByText("Pick a boss to beat again")).toBeTruthy();
    // "0 rematches" and "1 rematch for level 1" would be the same zero, twice more.
    expect(next.queryByText("0 rematches")).toBeNull();
    expect(next.queryByText("1 rematch for level 1")).toBeNull();

    // The sheet says the condition once, instead of "0 rematches won" above it.
    await fireEvent.press(next.getByLabelText(/^Champion Arena, /));
    const sheet = within(await findByTestId("village-detail"));
    expect(sheet.getAllByText("Built when you beat a boss a second time")).toHaveLength(1);
    expect(sheet.queryByText("0 rematches won")).toBeNull();
  });

  it("a level kept from the old count says where it comes from", async () => {
    const farmDone = building("farm", 5, { driver: "muscle" });
    const hall = building("heroes_hall", 3, {
      driver: "routes",
      metricValue: 0,
      nextTarget: 7,
      kept: true,
    });
    mockScene([campfire, farmDone, hall]);

    const { findByTestId, findByText } = await renderScene();
    const deeds = within(await findByTestId("village-family-deed"));
    await fireEvent.press(deeds.getByLabelText(/^Hall of Heroes, /));

    expect(await findByText(/carries over from what you had done before/)).toBeTruthy();
    expect(within(await findByTestId("village-detail")).getByText("7 routes")).toBeTruthy();
  });

  it("keeps the answer of the last focus when an older one arrives after it", async () => {
    const answers: ((s: village.VillageScene) => void)[] = [];
    jest
      .spyOn(village, "getVillageScene")
      .mockImplementation(() => new Promise((resolve) => answers.push(resolve)));
    const scene = (name: string): village.VillageScene => ({
      tier: 4,
      level: 8,
      title: { en: name, fr: name, de: name, es: name, ru: name, zh: name },
      totalXp: 3180,
      flame: 0,
      streakDays: 0,
      dominantSport: null,
      buildings: [campfire],
    });
    const ui = () => (
      <SafeAreaProvider initialMetrics={METRICS}>
        <TamaguiProvider config={config} defaultTheme="dark">
          <VillageScene />
        </TamaguiProvider>
      </SafeAreaProvider>
    );
    const { rerender, findByText, queryByText } = await render(ui());
    mockFocusTick = 1;
    await rerender(ui());
    await waitFor(() => expect(answers).toHaveLength(2));

    await act(async () => answers[1]?.(scene("Newer")));
    await act(async () => answers[0]?.(scene("Older")));

    expect(await findByText(/Newer/)).toBeTruthy();
    expect(queryByText(/Older/)).toBeNull();
  });

  it("ignores an older answer that fails after a newer one succeeded", async () => {
    const answers: { ok: (s: village.VillageScene) => void; fail: (e: Error) => void }[] = [];
    jest
      .spyOn(village, "getVillageScene")
      .mockImplementation(() => new Promise((ok, fail) => answers.push({ ok, fail })));
    const reported = jest.spyOn(reporting, "reportError").mockImplementation(() => {});
    const ui = () => (
      <SafeAreaProvider initialMetrics={METRICS}>
        <TamaguiProvider config={config} defaultTheme="dark">
          <VillageScene />
        </TamaguiProvider>
      </SafeAreaProvider>
    );
    const { rerender, findByText, queryByText } = await render(ui());
    mockFocusTick = 1;
    await rerender(ui());
    await waitFor(() => expect(answers).toHaveLength(2));

    await act(async () =>
      answers[1]?.ok({
        tier: 4,
        level: 8,
        title: { en: "Newer", fr: "Newer", de: "Newer", es: "Newer", ru: "Newer", zh: "Newer" },
        totalXp: 3180,
        flame: 0,
        streakDays: 0,
        dominantSport: null,
        buildings: [campfire],
      }),
    );
    await act(async () => {
      answers[0]?.fail(new Error("stale failure"));
      // Promise.all, then the catch: let the rejection travel before the act closes.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(await findByText(/Newer/)).toBeTruthy();
    expect(queryByText(i18n.t("village.load_error"))).toBeNull();
    expect(queryByText(i18n.t("common.retry"))).toBeNull();
    // The stale failure is not even reported: it says nothing about the screen the hero sees.
    expect(reported).not.toHaveBeenCalledWith("village.scene", expect.anything());
  });

  it("tapping a row explains what raised it", async () => {
    mockScene([building("forge", 3, { driver: "muscle", metricValue: 350, nextTarget: 600 })]);

    const { findByTestId, findByText } = await renderScene();
    const muscles = within(await findByTestId("village-family-muscle"));
    await fireEvent.press(muscles.getByLabelText(/^Forge, /));

    // The driver, where it stands, and what the next level costs. In reps, with the one exchange
    // rate that is not one-to-one named on the same line.
    expect(
      await findByText("350 reps of chest training. A hold counts one rep every 3 seconds."),
    ).toBeTruthy();
    // In the sheet: the rung's own two ends, from where the level began.
    const sheet = within(await findByTestId("village-detail"));
    expect(sheet.queryByText("350 reps done")).toBeNull();
    expect(sheet.getByText("600 reps")).toBeTruthy();
  });

  it("the sheet says when the building next rises, and says nothing at the top rank", async () => {
    mockScene([building("forge", 3, { driver: "muscle", metricValue: 350, nextTarget: 600 })]);
    mockFeeds({ muscle: { chest: [100, 125] } });

    const { findByTestId, findByText } = await renderScene();
    const muscles = within(await findByTestId("village-family-muscle"));
    await fireEvent.press(muscles.getByLabelText(/^Forge, /));

    // (600 - 350) over the 112.5 a session brings, rounded up.
    expect(
      await within(await findByTestId("village-detail")).findByText(
        "Rank 4 in about 3 chest sessions.",
      ),
    ).toBeTruthy();
  });

  it("tapping an unbuilt row says what would build it", async () => {
    mockScene([campfire, forge, quarry]);

    const { findByTestId, findByText } = await renderScene();
    const muscles = within(await findByTestId("village-family-muscle"));
    await fireEvent.press(muscles.getByLabelText(/^Quarry, /));

    expect(await findByText("Built by training your back")).toBeTruthy();
  });

  it("plays the return from a session once, then gets out of the way", async () => {
    mockParams = { grown: "farm:3:4,barn:1:2" };
    mockScene([campfire, forge, farm, quarry, barn]);

    const { findByTestId, getByTestId, getAllByText, queryByTestId } = await renderScene();

    const reward = await findByTestId("village-reward");
    expect(within(reward).getByText("Farm, rank 4")).toBeTruthy();
    expect(within(reward).getByText(/Also rose: Barn\./)).toBeTruthy();
    expect(within(getByTestId("village-changes")).getByText("3 → 4")).toBeTruthy();
    expect(getAllByText("Risen")).toHaveLength(2);

    await fireEvent.press(reward);
    await waitFor(() => expect(queryByTestId("village-reward")).toBeNull());
  });

  it("a return from a session no longer plays the golden card over the iso map, nor the growth", async () => {
    // The ready-to-improve signal replaces the growth (L6-T13): the claim is the celebration. The
    // card was the painting's; the map's caption says it (T45, inventory point 12).
    mockParams = { grown: "forge:2:3" };
    mockScene([campfire, forge]);
    mockIsoProps.length = 0;

    const { findByTestId, queryByTestId } = await renderScene(true);
    await findByTestId("iso-village");
    await act(() => new Promise((done) => setTimeout(done, 1400)));
    expect(queryByTestId("village-reward")).toBeNull();
    expect(mockIsoProps.every((p) => p.croissance === undefined)).toBe(true);
  });

  it("hands nothing to the map for a plain visit", async () => {
    mockParams = {};
    mockScene([campfire, forge]);
    mockIsoProps.length = 0;
    await (await renderScene(true)).findByTestId("iso-village");
    expect(mockIsoProps.every((p) => p.croissance === undefined)).toBe(true);
  });

  it("caps the return card's text, so a long list of risen buildings never grows it off the screen", async () => {
    mockParams = { grown: "farm:3:4,barn:1:2,quarry:0:1" };
    mockScene([campfire, forge, farm, quarry, barn]);

    const { findByTestId } = await renderScene();
    const reward = within(await findByTestId("village-reward"));
    expect(reward.getByText("Farm, rank 4").props.numberOfLines).toBe(2);
    expect(reward.getByText(/Also rose: /).props.numberOfLines).toBe(4);
  });

  it("lays the return card under the title block, not over the shield and the name", async () => {
    mockParams = { grown: "farm:3:4" };
    mockScene([campfire, forge, farm]);

    const { findByTestId } = await renderScene();
    const reward = await findByTestId("village-reward");
    const title = await findByTestId("village-title");
    await act(() =>
      fireEvent(title, "layout", {
        nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 400 } },
      }),
    );
    const top = (node: typeof reward) => StyleSheet.flatten(node.props.style).top as number;
    expect(top(await findByTestId("village-reward"))).toBeGreaterThanOrEqual(top(title) + 400);
  });

  /**
   * The flame's day count is a number like any other on this screen, and it was the one that did
   * not go through `formatCount`: a five-year flame read "1822 d" beside a village whose XP reads
   * "3,180". The chip is the only rendered flame count a test can reach cheaply, so it stands for
   * the pair on Home and in the Journal that were fixed with it.
   */
  it("writes the flame's days with the language's thousands separator", async () => {
    mockScene([campfire, forge, farm], { flame: 3, streakDays: 1822 });

    const { findByText } = await renderScene();

    // The whole chip, not its tail: the flame's name is a key built from the level
    // (`village.flame_${n}`), which a dead-code sweep once deleted as "referenced nowhere" while
    // this test, matching only the day count, stayed green over "village.flame_3 · 1,822 d".
    expect(await findByText("Blaze · 1,822 d")).toBeTruthy();
  });

  it("a plain visit plays nothing", async () => {
    mockScene([campfire, forge, farm]);

    const { findByTestId, queryByTestId, queryByText } = await renderScene();

    await findByTestId("village-next");
    expect(queryByTestId("village-reward")).toBeNull();
    expect(queryByTestId("village-changes")).toBeNull();
    expect(queryByText("Risen")).toBeNull();
  });

  // The figure stands on the painting. Anchored to the window it sat on "Village tier" and "Next
  // to build" and covered their text (emulator pass, 2026-10-03).
  describe("the floating villager", () => {
    function speak() {
      useChorusStore.setState({
        current: {
          id: 1,
          owner: "village",
          moment: "rest",
          villager: "farmer",
          pose: "talk",
          line: "A line.",
        },
      });
    }

    it("is a child of the painting, not a window overlay, and the cards are outside it", async () => {
      mockScene([campfire, forge]);
      const { findByTestId } = await renderScene();
      await findByTestId("village-next");
      await act(() => {
        speak();
      });

      const hero = within(await findByTestId("village-hero"));
      expect(hero.getByTestId("villager-zone")).toBeTruthy();
      for (const card of ["village-tier", "village-next", "village-families"]) {
        expect(hero.queryByTestId(card)).toBeNull();
      }
    });

    it("leaves a zone that stops above the title block, so nothing under it is pressable", async () => {
      mockScene([campfire, forge]);
      const { findByTestId } = await renderScene();
      await findByTestId("village-next");
      await act(() => {
        speak();
      });

      const cameo = StyleSheet.flatten((await findByTestId("villager-cameo")).props.style);
      const hero = StyleSheet.flatten((await findByTestId("village-hero")).props.style);
      // Band bottom is above the hero's bottom title block: no card, and no title, lies under it.
      expect(cameo.top + cameo.height).toBeLessThanOrEqual(hero.height - 150);
      expect(cameo.top).toBeGreaterThanOrEqual(METRICS.insets.top);
    });
  });
});
