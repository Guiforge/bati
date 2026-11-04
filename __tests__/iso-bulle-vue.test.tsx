// The iso bubble's states (T14): placed once measured, the sheet beyond 130 %, closed by the
// outside tap and Back, replaced by another element, and its one action only when ready.

import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { useState } from "react";
import * as RN from "react-native";
import { BackHandler, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { Bulle, ContenuBatiment, ContenuVillageois } from "@/components/village/iso/Bulle";
import { apresTap, type Ouverture, QUEUE_BULLE } from "@/components/village/iso/bulle";
import type { BuildingCode } from "@/db/schema";
import type { VillageBuilding } from "@/db/village";
import { i18n } from "@/i18n";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/adventures", () => ({ listFinishedRunSummaries: jest.fn().mockResolvedValue([]) }));
let mockSessions: Promise<unknown[]> = Promise.resolve([]);
let mockExercices: unknown[] = [];
jest.mock("@/db/completed", () => ({
  getRecentContributingSessions: jest.fn(() => mockSessions),
  getContributingExercises: jest.fn(() => Promise.resolve(mockExercices)),
}));
let mockFocused = true;
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  // Focus is a flag the test flips; the effect re-runs on each render like the real hook on focus.
  useFocusEffect: (cb: () => undefined | (() => void)) =>
    require("react").useEffect(() => (mockFocused ? cb() : undefined)),
}));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => true }));

const METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 640 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

const batiment = (code: BuildingCode, over: Partial<VillageBuilding> = {}) =>
  ({
    code,
    emoji: "",
    tier: 2,
    level: 3,
    enName: `${code}-en`,
    frName: `${code}-fr`,
    deName: `${code}-de`,
    esName: `${code}-es`,
    unlockCondition: "default",
    relatedMuscle: "chest",
    driver: "muscle",
    metricValue: 120,
    nextTarget: 200,
    ...over,
  }) as VillageBuilding;

const BATIMENTS = [
  batiment("forge"),
  batiment("well"),
  batiment("farm"),
  batiment("barn", { driver: "prereq", relatedMuscle: null, metricValue: 4, nextTarget: 5 }),
  batiment("quarry", { level: 0, metricValue: 0, nextTarget: 1 }),
];
const ouverture = (code: BuildingCode, ancre: [number, number] = [180, 400]): Ouverture => ({
  cible: { type: "batiment", code },
  ancre,
});

/** A trade's bubble: the one shell still placed by `placerBulle`. Buildings have the panel. */
const forgeron = (ancre: [number, number] = [180, 400]): Ouverture => ({
  cible: { type: "villageois", id: "smith", role: "smith", habitant: false },
  ancre,
});

/** The owner's side, as VillageScene does it: one door, `apresTap` for the outside tap. */
// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
function Hote({
  depart,
  pret = [],
  viser = () => null,
  onClaim = jest.fn(),
}: {
  depart: Ouverture | null;
  pret?: BuildingCode[];
  viser?: (x: number, y: number) => Ouverture | null;
  onClaim?: (b: VillageBuilding) => void;
}) {
  const [bulle, setBulle] = useState<Ouverture | null>(depart);
  return (
    <>
      <RN.Text testID="hote-etat">
        {bulle && bulle.cible.type === "batiment" ? bulle.cible.code : "fermee"}
      </RN.Text>
      <Bulle
        ouverte={bulle}
        onClose={() => setBulle(null)}
        onDehors={(x, y) => setBulle(apresTap(bulle, viser(x, y)))}
        contenu={(o, nom) => {
          if (o.cible.type === "villageois")
            return (
              <ContenuVillageois
                id={o.cible.id}
                role={o.cible.role}
                habitant={o.cible.habitant}
                jour={20000}
                nom={nom}
              />
            );
          const b = BATIMENTS.find((x) => o.cible.type === "batiment" && x.code === o.cible.code);
          return b ? (
            <ContenuBatiment
              building={b}
              pret={pret.includes(b.code)}
              nom={nom}
              language="en"
              feeds={null}
              years={null}
              onClose={() => setBulle(null)}
              onClaim={onClaim}
              onSuivre={(code) => setBulle(ouverture(code, [180, 200]))}
            />
          ) : null;
        }}
      />
    </>
  );
}

function ecran(fontScale = 1) {
  jest.spyOn(require("react-native"), "useWindowDimensions").mockReturnValue({
    width: 360,
    height: 640,
    scale: 2,
    fontScale,
  });
}

async function monter(props: Parameters<typeof Hote>[0]) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <Hote {...props} />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

async function mesurer(w = 300, h = 200) {
  await act(() =>
    fireEvent(screen.getByTestId("iso-bulle"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: w, height: h } },
    }),
  );
}

const etat = () => screen.getByTestId("hote-etat").props.children;

/** A touch of the backdrop: down at (x0, y0), up at (x1, y1). */
async function toucher(x0: number, y0: number, x1 = x0, y1 = y0) {
  const fond = screen.getByTestId("iso-bulle-dehors", { includeHiddenElements: true });
  await fireEvent(fond, "pressIn", { nativeEvent: { pageX: x0, pageY: y0 } });
  await fireEvent.press(fond, { nativeEvent: { pageX: x1, pageY: y1 } });
}

afterEach(() => jest.restoreAllMocks());

describe("Bulle (T14)", () => {
  it("a villager's bubble opens hidden, then above its anchor once measured, its name first", async () => {
    ecran();
    await monter({ depart: forgeron() });
    await mesurer();
    const style = StyleSheet.flatten(screen.getByTestId("iso-bulle").props.style);
    // Above its anchor it hangs from its bottom edge, the tail's: 640 - (400 - tail - 200) - 200.
    expect([style.left, style.top, style.bottom]).toEqual([30, undefined, 640 - 400 + QUEUE_BULLE]);
    const nom = screen.getByTestId("iso-bulle-nom");
    expect(nom.props.accessibilityRole).toBe("header");
    expect(screen.queryByTestId("iso-panneau")).toBeNull();
  });

  it("a building is the parchment panel docked on the screen: no measure, no tail, its name first", async () => {
    ecran();
    await monter({ depart: ouverture("forge", [180, 200]) });
    // No Modal and no measure: it shows at once, a layer of the screen's own tree.
    expect(screen.queryByTestId("iso-bulle")).toBeNull();
    const panneau = StyleSheet.flatten(screen.getByTestId("iso-panneau").props.style);
    expect([panneau.left, panneau.right, panneau.bottom]).toEqual([0, 0, 0]);
    const nom = screen.getByTestId("iso-bulle-nom");
    expect(nom.props.accessibilityRole).toBe("header");
    expect(nom.props.accessibilityLabel).toBe("Forge, rank 3");
    expect(screen.getAllByTestId("iso-bulle-nom")).toHaveLength(1);
    // The halo marks the building, and is never tappable nor spoken.
    const halo = screen.getByTestId("iso-halo", { includeHiddenElements: true });
    expect(halo.props.pointerEvents).toBe("none");
    expect(halo.props.importantForAccessibility).toBe("no-hide-descendants");
  });

  it("docks at the top when the building would end under the bottom panel", async () => {
    ecran();
    await monter({ depart: ouverture("forge", [180, 450]) });
    const panneau = StyleSheet.flatten(screen.getByTestId("iso-panneau").props.style);
    expect([panneau.top, panneau.bottom]).toEqual([METRICS.insets.top, undefined]);
  });

  it("opened from a list (no anchor): the bottom dock, no halo", async () => {
    ecran();
    await monter({ depart: { ...ouverture("forge", [0, 0]), sansAncre: true } });
    expect(StyleSheet.flatten(screen.getByTestId("iso-panneau").props.style).bottom).toBe(0);
    expect(screen.queryByTestId("iso-halo")).toBeNull();
  });

  it("keeps the same panel from one building to the next, content changing in place", async () => {
    ecran();
    await monter({ depart: ouverture("forge"), viser: () => ouverture("well", [100, 100]) });
    const avant = screen.getByTestId("iso-panneau");
    await toucher(100, 100);
    expect(etat()).toBe("well");
    expect(screen.getByTestId("iso-panneau")).toBe(avant);
    expect(screen.getByTestId("iso-bulle-nom").props.accessibilityLabel).toMatch(/^Well/);
  });

  it("draws the halo still under reduced motion, and takes it away with the panel", async () => {
    ecran();
    await monter({ depart: ouverture("forge") });
    expect(
      StyleSheet.flatten(
        screen.getByTestId("iso-halo", { includeHiddenElements: true }).props.style,
      ).opacity,
    ).toBe(1);
    await toucher(20, 30);
    expect(screen.queryByTestId("iso-halo")).toBeNull();
  });

  it("is the bottom sheet above 130 % text, with the same content and no frame", async () => {
    ecran(1.5);
    await monter({ depart: ouverture("forge") });
    expect(screen.queryByTestId("iso-bulle")).toBeNull();
    const feuille = within(screen.getByTestId("iso-bulle-feuille"));
    expect(feuille.getByTestId("iso-bulle-nom")).toBeTruthy();
    expect(feuille.getByTestId("iso-bulle-chiffres")).toBeTruthy();
  });

  it("is placed once: the lines arriving grow it away from its tail, never move it nor make it a sheet", async () => {
    ecran();
    await monter({ depart: forgeron() });
    await mesurer();
    const avant = StyleSheet.flatten(screen.getByTestId("iso-bulle").props.style);
    await mesurer(300, 520);
    const apres = StyleSheet.flatten(screen.getByTestId("iso-bulle").props.style);
    expect([apres.left, apres.top, apres.bottom]).toEqual([avant.left, avant.top, avant.bottom]);
    expect(screen.getAllByTestId("iso-bulle-nom")).toHaveLength(1);
  });

  it("measures again when the window turns, so the old size never leaves the frame past an edge", async () => {
    ecran();
    await monter({ depart: forgeron([180, 600]) });
    await mesurer(300, 200);
    jest.spyOn(require("react-native"), "useWindowDimensions").mockReturnValue({
      width: 740,
      height: 360,
      scale: 2,
      fontScale: 1,
    });
    await screen.rerender(
      <SafeAreaProvider initialMetrics={METRICS}>
        <TamaguiProvider config={config} defaultTheme="dark">
          <Hote depart={forgeron([180, 600])} />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
    // Hidden again until its size in the new window is known: no stale placement.
    expect(StyleSheet.flatten(screen.getByTestId("iso-bulle").props.style).bottom).toBeUndefined();
    await mesurer(300, 100);
    const style = StyleSheet.flatten(screen.getByTestId("iso-bulle").props.style);
    // Anchor held on the 360 dp window, the bubble above it, inside the window.
    expect(style.bottom).toBeGreaterThanOrEqual(0);
    expect(360 - style.bottom - 100).toBeGreaterThanOrEqual(8);
  });

  it("a sheet closes by a tap on its overlay", async () => {
    ecran(1.5);
    await monter({ depart: ouverture("forge") });
    await fireEvent.press(screen.getByTestId("iso-bulle-voile", { includeHiddenElements: true }));
    expect(etat()).toBe("fermee");
  });

  it("a drag on the backdrop only closes, whatever lies where the finger lifts", async () => {
    ecran();
    const viser = jest.fn(() => ouverture("well"));
    await monter({ depart: ouverture("forge"), viser });
    await toucher(20, 300, 120, 300);
    expect(viser).not.toHaveBeenCalled();
    expect(etat()).toBe("fermee");
  });

  it("moves to the sheet when its first measure is too tall for the window", async () => {
    ecran();
    await monter({ depart: forgeron() });
    await mesurer(300, 500);
    expect(screen.queryByTestId("iso-bulle")).toBeNull();
    expect(
      within(screen.getByTestId("iso-bulle-feuille")).getByTestId("iso-bulle-nom"),
    ).toBeTruthy();
  });

  it("a building is the sheet in landscape, same content", async () => {
    jest.spyOn(require("react-native"), "useWindowDimensions").mockReturnValue({
      width: 740,
      height: 360,
      scale: 2,
      fontScale: 1,
    });
    await monter({ depart: ouverture("forge") });
    expect(screen.queryByTestId("iso-panneau")).toBeNull();
    expect(
      within(screen.getByTestId("iso-bulle-feuille")).getByTestId("iso-bulle-nom"),
    ).toBeTruthy();
  });

  it("a tap outside on nothing closes it, and swallows the tap", async () => {
    ecran();
    const viser = jest.fn(() => null);
    await monter({ depart: ouverture("forge"), viser });
    await toucher(20, 30, 24, 33);
    expect(viser).toHaveBeenCalledWith(20, 30);
    expect(etat()).toBe("fermee");
    expect(screen.queryByTestId("iso-bulle")).toBeNull();
  });

  it("a tap on another building replaces it, a tap on the same one closes it", async () => {
    ecran();
    let vise: Ouverture | null = ouverture("well", [100, 500]);
    await monter({ depart: ouverture("forge"), viser: () => vise });
    await toucher(100, 500);
    expect(etat()).toBe("well");
    expect(screen.getByTestId("iso-bulle-nom").props.accessibilityLabel).toMatch(/^Well/);
    vise = ouverture("well", [101, 499]);
    await toucher(101, 499);
    expect(etat()).toBe("fermee");
  });

  it("Back closes it and is not passed on to the router", async () => {
    ecran();
    const spy = jest.spyOn(BackHandler, "addEventListener");
    await monter({ depart: ouverture("forge") });
    const press = spy.mock.calls.at(-1)?.[1] as () => boolean;
    let pris = false;
    await act(() => {
      pris = press();
    });
    expect(pris).toBe(true);
    expect(etat()).toBe("fermee");
  });

  it("while the village is blurred (a screen pushed from the panel), Back is left to the router", async () => {
    ecran();
    mockFocused = false;
    const spy = jest.spyOn(BackHandler, "addEventListener");
    spy.mockClear();
    await monter({ depart: ouverture("forge") });
    mockFocused = true;
    expect(spy).not.toHaveBeenCalled();
    expect(etat()).not.toBe("fermee");
  });

  it("offers Evolve only when ready: hammer, words and a 48 dp button that closes and claims", async () => {
    ecran();
    await monter({ depart: ouverture("forge") });
    expect(screen.queryByTestId("village-claim")).toBeNull();
    expect(screen.queryByText("Ready to evolve")).toBeNull();
    await screen.unmount();

    const onClaim = jest.fn();
    await monter({ depart: ouverture("forge"), pret: ["forge"], onClaim });
    expect(screen.getByText("Ready to evolve")).toBeTruthy();
    expect(screen.getByTestId("iso-bulle-nom").props.accessibilityLabel).toBe(
      "Forge ready to evolve, rank 3",
    );
    const bouton = screen.getByTestId("village-claim");
    expect(StyleSheet.flatten(bouton.props.style).minHeight).toBeGreaterThanOrEqual(48);
    await fireEvent.press(bouton);
    expect(onClaim).toHaveBeenCalledWith(expect.objectContaining({ code: "forge" }));
    expect(etat()).toBe("fermee");
  });

  it("holds fixed blocks while the deeds load, then drops them", async () => {
    ecran();
    let finir: (v: unknown[]) => void = () => {};
    mockSessions = new Promise((r) => {
      finir = r;
    });
    await monter({ depart: ouverture("forge") });
    expect(screen.getByTestId("iso-bulle-chargement")).toBeTruthy();
    await act(async () => finir([]));
    expect(screen.queryByTestId("iso-bulle-chargement")).toBeNull();
    mockSessions = Promise.resolve([]);
  });

  it("a trade's bubble names it and says one of its existing lines (T26)", async () => {
    ecran();
    const forgeron: Ouverture = {
      cible: { type: "villageois", id: "smith", role: "smith", habitant: false },
      ancre: [180, 400],
    };
    await monter({ depart: forgeron });
    expect(screen.getByTestId("iso-bulle-nom").props.accessibilityLabel).toBe("The Smith");
    const ligne = screen.getByTestId("iso-bulle-replique").props.children;
    expect(i18n.t("villagers.smith.rest", { returnObjects: true })).toContain(ligne);
  });

  it("an inhabitant is a villager with a trade's lines, a second tap on it closes the bubble, a building replaces it (T26)", async () => {
    ecran();
    const habitant: Ouverture = {
      cible: { type: "villageois", id: "h3", role: "sage", habitant: true },
      ancre: [180, 400],
    };
    await monter({ depart: habitant, viser: (x) => (x === 1 ? habitant : ouverture("well")) });
    expect(screen.getByTestId("iso-bulle-nom").props.accessibilityLabel).toBe("Villager");
    const ligne = screen.getByTestId("iso-bulle-replique").props.children;
    expect(i18n.t("villagers.sage.rest", { returnObjects: true })).toContain(ligne);
    await mesurer();
    await toucher(1, 1);
    expect(etat()).toBe("fermee");
  });

  it("a ready building has its hammer, words and Evolve at the top, before the exercises", async () => {
    ecran();
    mockSessions = Promise.resolve([
      { sessionId: 1, performedAt: new Date(2026, 10, 4), volume: 39, enTitle: "Chop Wood" },
    ]);
    mockExercices = [{ exerciseId: 7, volume: 2140, enName: "Row" }];
    await monter({ depart: ouverture("forge", [180, 200]), pret: ["forge"] });
    await screen.findByTestId("iso-bulle-exercices");
    const arbre = JSON.stringify(screen.toJSON());
    const claim = arbre.indexOf('"village-claim"');
    expect(claim).toBeGreaterThan(-1);
    expect(claim).toBeLessThan(arbre.indexOf('"iso-bulle-exercices"'));
    expect(claim).toBeLessThan(arbre.indexOf("Chop Wood"));
    mockSessions = Promise.resolve([]);
    mockExercices = [];
  });

  it("a follower says it follows the Farm, one link that moves the panel to the Farm in place", async () => {
    ecran();
    await monter({ depart: ouverture("barn", [180, 200]) });
    const lien = screen.getByTestId("iso-bulle-suit");
    expect(lien.props.accessibilityRole).toBe("link");
    expect(screen.getByText("Follows the Farm")).toBeTruthy();
    const avant = screen.getByTestId("iso-panneau");
    await fireEvent.press(lien);
    expect(etat()).toBe("farm");
    expect(screen.getByTestId("iso-panneau")).toBe(avant);
  });

  it("a building never fed says what to do and shows no empty list", async () => {
    ecran();
    await monter({ depart: ouverture("quarry", [180, 200]) });
    expect(screen.getByText("Built by training your chest")).toBeTruthy();
    expect(screen.queryByTestId("iso-bulle-exercices")).toBeNull();
    expect(screen.queryByTestId("iso-bulle-suit")).toBeNull();
    // Unbuilt: no silhouette of a next stage.
    expect(screen.queryByTestId("iso-bulle-silhouette")).toBeNull();
  });

  it("has 12 tappable points at most, the backdrop included", async () => {
    ecran();
    await monter({ depart: ouverture("forge"), pret: ["forge"] });
    const tous = { includeHiddenElements: true };
    const tapables = [
      ...screen.queryAllByRole("button", tous),
      ...screen.queryAllByRole("link", tous),
    ];
    // The backdrop and Evolve at least.
    expect(tapables.length).toBeGreaterThanOrEqual(2);
    expect(tapables.length).toBeLessThanOrEqual(12);
  });
});
