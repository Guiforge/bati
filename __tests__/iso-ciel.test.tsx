// RNGH mocks its native module and host detector; it must load before the component does.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  createGestureController,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import * as Reanimated from "react-native-reanimated";
import {
  CROISSANCE_CAMERA_MS,
  HAUTEUR,
  LARGEUR,
  stadeReel,
} from "@/components/village/iso/carteDemo";
import { perchoirDe } from "@/components/village/iso/creatures";
import { BANNIERES_MAX, ECLATS_ANIMES } from "@/components/village/iso/fierte";
import { FigeContext } from "@/components/village/iso/fige";
import { type Croissance, IsoVillage } from "@/components/village/iso/IsoVillage";
import { MARCHEURS_PAR_VAGUE } from "@/components/village/iso/marcheurs";
import { STADE_MS } from "@/components/village/iso/moment";
import { NOEUDS_RECLAMABLES } from "@/components/village/iso/reclame";
import { ONDE_MS } from "@/components/village/iso/revelation";
import { buildingStage } from "@/constants/buildingLevels";
import { buildingCodes } from "@/db/schema";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

configure({ defaultIncludeHiddenElements: true });

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { opacity?: number; transform?: Record<string, number>[] };

/** The most animated nodes a wave may hold for the whole map (DECISIONS 29/10). */
// Raised 64 to 68 in the "sublime" loop (E1, Guillaume): the three banners sway at rest.
const PLAFOND_NOEUDS = 68;
/** Exact counts at tier 12, every building at level 5 (L5-T02, then L5-T09: the 18 water glints in 5 nodes, -13; L5-T03: +5 flames, +10 smoke puffs; a growing building hides its fire, so growth adds 3 + 6; T23: the sky and its 5 nodes, 3 stars and 2 mist bands, are gone): to raise on purpose, never to chase. */
const NOEUDS_SANS_VILLAGEOIS = 32;
/** Two growths played at most, 6 nodes each. A growing campfire or forge hides its fire: -2 flames, -4 puffs. */
const NOEUDS_CROISSANCE_MAX = 12; // the moment (moment.ts): per growth 6 (light and its ground pool, old stage and its ink, new stage and its ink, dust)
const NOEUDS_FEU_MASQUE = 6;
/** Once the moment is over only each new body stays mounted (its scale, held on 1). */
const NOEUDS_APRES_MOMENT = 2;
/**
 * The villagers (L5-T04): each role whose building stands has one animated node, standing or walking, so its image is
 * never mounted again when a wave starts (7 roles at tier 12). A wave adds none.
 */
const NOEUDS_VILLAGEOIS = 7;
/** The small lives (L5-T05, T08, LIFE C3 to C7): the fireflies (two groups, out of step), the two mice stations and the wall's cat (a node moves each, one slides its frames), mounted whatever the day and hidden when it has them out; the roof birds fly by day only, so none at night (NOEUDS_OISEAUX_JOUR). */
const NOEUDS_PETITS_DETAILS = 2 + 2 * 2 + 2;
/** By day the two roof birds (farm and forge) are mounted too: 2 nodes each, hidden between their visits. */
const NOEUDS_OISEAUX_JOUR = 4;
/** The moon's glitter on the sea (L6-T10): one node, at rest invisible; the world around the island is still drawings. */
const NOEUDS_MONDE = 1;
/** Glints left of the 17 water cells once the ones a later sprite covers are dropped (L5-T09b): 12 on the FIN-DIS plan, its farm, barn and mill a cell off the river. */
const RESTE = 12;
/** E1: each flying banner is one swaying node, on the clock. */
const NOEUDS_BANNIERES = BANNIERES_MAX;
const NOEUDS_REPOS =
  NOEUDS_SANS_VILLAGEOIS +
  NOEUDS_VILLAGEOIS +
  NOEUDS_PETITS_DETAILS +
  NOEUDS_MONDE +
  NOEUDS_BANNIERES;
/**
 * The night lights (L5-T07b), mounted for the length of a wave only: windows on 2 buildings (one
 * node each) and a door glow on up to 2 where a villager stands. The worst case adds 4.
 */
const NOEUDS_FENETRES_VAGUE = 2;
const NOEUDS_PORTES_MAX = 2;
const NOEUDS_VEILLES_MAX = NOEUDS_FENETRES_VAGUE + NOEUDS_PORTES_MAX;
/**
 * T03: the glints of the legendary banners twinkle in a wave, one node each on ECLATS_ANIMES
 * buildings (fewer when a growing one hides its banner); still drawings at rest.
 */
const NOEUDS_ECLATS = ECLATS_ANIMES;
/**
 * The worst case without ready glows: rest map 48, 2 growths 4, night lights 4, glints 2 = 58.
 * With the ready glows (VillageScene passes a growth and the ready list together) the glints give
 * way: 48 + 4 + 4 + 4 glows = 60 at most (a growing building hides its glow).
 * Before T23 (the sky's 5 nodes): rest 48, worst 61.
 */
/** AUDIT-DA lot 1: each of the 3 walkers of a wave takes a shadow node of its own (the shadow stays on the ground), so +3 in a wave: 58 and 60. */
const NOEUDS_OMBRES_MARCHEURS = MARCHEURS_PAR_VAGUE;
/** T27: with no ready glow the two glints leave two places of the signal seat to the effects. */
const NOEUDS_EFFETS_MAX = NOEUDS_RECLAMABLES - ECLATS_ANIMES;
const NOEUDS_PIRE_SANS_PRETS = 60 + NOEUDS_BANNIERES + NOEUDS_OMBRES_MARCHEURS + NOEUDS_EFFETS_MAX;
const NOEUDS_PIRE_ABSOLU_ATTENDU = 62 + NOEUDS_BANNIERES + NOEUDS_OMBRES_MARCHEURS;
/**
 * T27 point 4: the building effects of a wave, one node each, in the signal seat (familles.ts),
 * which holds NOEUDS_RECLAMABLES nodes: glows + glints + effects never pass it, so the worst cases
 * below are the ones they had before (effets.ts `effetsPermis`).
 */
const effetsEtSignal = () => screen.queryAllByTestId(/^iso-(effet-|lueur-|eclat-anime-)/).length;
/** Between the windows alone and every light and glint: what a wave holds above the rest map. */
const dansLaVague = (n: number, base: number) => {
  expect(n).toBeGreaterThanOrEqual(base + NOEUDS_FENETRES_VAGUE);
  expect(n).toBeLessThanOrEqual(
    base + NOEUDS_VEILLES_MAX + NOEUDS_ECLATS + NOEUDS_OMBRES_MARCHEURS + NOEUDS_EFFETS_MAX,
  );
};
/** Campfire and forge growing: the fire hidden under the new sprite. */
const NOEUDS_CROISSANCE_FEUX = NOEUDS_REPOS + NOEUDS_CROISSANCE_MAX - NOEUDS_FEU_MASQUE;
/** The worst case: two buildings without fire grow. */
const NOEUDS_CROISSANCE_PIRE = NOEUDS_REPOS + NOEUDS_CROISSANCE_MAX;
/** Static placement keys, written once; the clock never touches them. */
const PLACE = new Set(["position", "top", "left", "right", "bottom", "width", "height"]);

type Noeud = { props?: Record<string, unknown>; children?: unknown[] | null };
/** Host nodes carrying an animated style or animated props, in a rendered tree (Animated components under jest). */
const compte = (n: unknown): number => {
  if (typeof n !== "object" || n === null) return 0;
  const { props, children } = n as Noeud;
  const propre =
    props?.jestAnimatedStyle === undefined && props?.animatedProps === undefined ? 0 : 1;
  return (children ?? []).reduce<number>((a, c) => a + compte(c), propre);
};

/** The shadows of the walkers on a walk now: a node each, none for a villager that stands. */
const ombresDeMarche = () => screen.queryAllByTestId(/^iso-marcheur-.*-ombre$/).length;

/** A finger on a building's roof crow, through the real pan gesture and the camera as it stands. */
async function toucherToit(code: "farm" | "forge") {
  const t = getAnimatedStyle(screen.getByTestId("iso-camera") as never).transform ?? [];
  const v = Object.assign({}, ...t) as Record<string, number>;
  const p = perchoirDe(code, stadeReel(code, buildingStage(5)));
  if (!p) throw new Error(`no perch on ${code}`);
  await act(() => {
    createGestureController(getByGestureTestId("iso-geste-pan")).begin({
      x: (p[0] - LARGEUR / 2) * (v.scale ?? 1) + 195 + (v.translateX ?? 0) + 4,
      y: (p[1] - HAUTEUR / 2) * (v.scale ?? 1) + 195 + (v.translateY ?? 0),
    });
    jest.advanceTimersByTime(50);
  });
}

// Each test renders the whole map, a wave included: past the 5 s default when the full suite loads the machine.
// 60 s of fake time on the whole map costs gigabytes: the stop rule is tested at its real length in iso-horloge.
jest.mock("@/constants/isoPoc", () => ({
  ...jest.requireActual("@/constants/isoPoc"),
  DUREE_VIE_MS: 30000,
}));

// Weight, not a hang: each test mounts the whole map (every building, tier 12); alone it takes seconds, under a parallel full run tens of seconds.
jest.setTimeout(120_000);

describe("the whole map's animated nodes", () => {
  const buildings = buildingCodes.map((code) => ({ code, level: 5 }));
  const village = (
    croissance?: Croissance,
    reclamables?: typeof buildingCodes,
    lumiere?: "jour" | "nuit",
  ) => (
    <GestureHandlerRootView>
      <IsoVillage
        reclamables={reclamables}
        tier={12}
        buildings={buildings}
        width={390}
        height={390}
        croissance={croissance}
        lumiere={lumiere}
      />
    </GestureHandlerRootView>
  );

  test("a fully built village: no sky (T23), the animals mounted, 64 at most", async () => {
    // Fake timers: the clock does not run, so no wave is planned and nobody walks yet.
    jest.useFakeTimers();
    await render(village());
    // Animated components under jest carry `jestAnimatedStyle` / `animatedProps` on the host node.
    expect(screen.queryAllByTestId(/^iso-ciel-|^iso-monde-montagnes/)).toHaveLength(0);
    expect(screen.getAllByTestId("iso-lucioles")).toHaveLength(1);
    // LIFE: the two mice stations and the wall's cat are mounted (a node moves each, one slides its frames); no bird at night.
    expect(screen.getAllByTestId(/^iso-creature-souris-(?!.*-bande$)/)).toHaveLength(2);
    expect(screen.getAllByTestId("iso-creature-chat-rempart")).toHaveLength(1);
    expect(screen.queryAllByTestId(/^iso-creature-oiseau-/)).toHaveLength(0);
    // T26: twelve inhabitants stand at tier 12 and add no animated node (the count below is the same).
    expect(screen.getAllByTestId(/^iso-habitant-h\d+(-paire)?$/)).toHaveLength(12);
    expect(screen.queryAllByTestId(/^iso-animal-/).length).toBeGreaterThan(0);
    // The drawn fire (L5-T03): a node per hearth, two puffs per plume (four chimneys and the camp).
    expect(screen.getAllByTestId(/^iso-flamme-/)).toHaveLength(5);
    expect(screen.getAllByTestId(/^iso-fumee-/)).toHaveLength(10);
    // L5-T09: every water glint rides one of 5 staggered layers, not a node of its own.
    expect(screen.getAllByTestId(/^iso-reflets-/)).toHaveLength(5);
    // L6-T10: the forest and sea follow the camera in one layer, one node (the drawings in it are still).
    expect(screen.getAllByTestId("iso-monde-fond")).toHaveLength(1);
    // Audit 31/10: no veil over the trees.
    expect(screen.queryAllByTestId("iso-monde-fondu")).toHaveLength(0);
    const reflets = screen.getAllByTestId(/^iso-reflet-\d/);
    expect(reflets).toHaveLength(RESTE);
    // Each glint sits in the layer of its band of the canal: the layer index never falls as gy rises.
    const parGy = reflets
      .map(
        (r) =>
          [Number(String(r.props.testID).split("-")[3]), String(r.parent?.props.testID)] as const,
      )
      .toSorted((x, y) => x[0] - y[0]);
    const k = parGy.map(([, id]) => Number(id.replace("iso-reflets-", "")));
    expect(k).toEqual(k.toSorted((x, y) => x - y));
    // T03: the last stages fly their banners and light their windows, still drawings; at rest every
    // legendary glint is still too.
    // T24: three banners at most, on the legendary ones by importance.
    expect(screen.getAllByTestId(/^iso-banniere-/)).toHaveLength(BANNIERES_MAX);
    expect(screen.getAllByTestId(/^iso-vitres-/).length).toBeGreaterThan(5);
    expect(screen.queryAllByTestId(/^iso-eclat-anime-/)).toHaveLength(0);
    const n = compte(screen.toJSON());
    expect(n).toBeLessThanOrEqual(PLAFOND_NOEUDS);
    expect(n).toBe(NOEUDS_REPOS);
    jest.useRealTimers();
  });

  test("L6-T13: the ready-to-evolve glow adds nothing at rest, 4 nodes in a wave, 64 at most", async () => {
    jest.useFakeTimers();
    try {
      await render(village(undefined, buildingCodes));
      expect(compte(screen.toJSON())).toBe(NOEUDS_REPOS + ombresDeMarche());
      await act(() => jest.advanceTimersByTime(200));
      expect(screen.queryAllByTestId(/^iso-lueur-/)).toHaveLength(NOEUDS_RECLAMABLES);
      // Every ready building keeps its fixed hammer, a still drawing (no node).
      expect(screen.queryAllByTestId(/^iso-marteau-/).length).toBeGreaterThan(NOEUDS_RECLAMABLES);
      const n = compte(screen.toJSON());
      expect(n).toBeLessThanOrEqual(PLAFOND_NOEUDS);
      dansLaVague(n, NOEUDS_REPOS + NOEUDS_RECLAMABLES);
      await act(() => jest.advanceTimersByTime(35000));
      expect(screen.queryAllByTestId(/^iso-lueur-/)).toHaveLength(0);
      expect(compte(screen.toJSON())).toBe(NOEUDS_REPOS + ombresDeMarche());
    } finally {
      jest.useRealTimers();
    }
  });

  test("the first wave plans four walkers: no node added, still 64 at most", async () => {
    jest.useFakeTimers();
    try {
      await render(village());
      // Before the wave starts nobody walks: the villagers stand, each on its node.
      expect(compte(screen.toJSON())).toBe(NOEUDS_REPOS + ombresDeMarche());
      expect(screen.queryAllByTestId(/^iso-marcheur-.*-noeud$/)).toHaveLength(0);
      await act(() => jest.advanceTimersByTime(200));
      const n = compte(screen.toJSON());
      expect(screen.queryAllByTestId(/^iso-marcheur-/).length).toBeGreaterThan(MARCHEURS_PAR_VAGUE);
      expect(n).toBeLessThanOrEqual(PLAFOND_NOEUDS);
      // The walkers add their shadows (3); the night lights add 2 to 4.
      dansLaVague(n, NOEUDS_REPOS);
      expect(screen.getAllByTestId(/^iso-fenetres-/)).toHaveLength(NOEUDS_FENETRES_VAGUE);
      expect(screen.queryAllByTestId(/^iso-porte-/).length).toBeLessThanOrEqual(NOEUDS_PORTES_MAX);
      expect(screen.queryAllByTestId(/^iso-marcheur-.*-noeud$/)).toHaveLength(MARCHEURS_PAR_VAGUE);
      // T03: two legendary glints twinkle, the others stay still drawings.
      expect(screen.getAllByTestId(/^iso-eclat-anime-/)).toHaveLength(NOEUDS_ECLATS);
      // After the wave (20 s, 15 to 20 s of wave): no light node is mounted, the map is at rest again.
      await act(() => jest.advanceTimersByTime(35000));
      expect(screen.queryAllByTestId(/^iso-(fenetres|porte)-/)).toHaveLength(0);
      expect(compte(screen.toJSON())).toBe(NOEUDS_REPOS + ombresDeMarche());
    } finally {
      jest.useRealTimers();
    }
  });

  test("worst case, a growth of four buildings on top: still 64 at most", async () => {
    jest.useFakeTimers();
    try {
      const items = (["campfire", "forge", "windmill", "tent"] as const).map((code) => ({
        code,
        oldLevel: 1,
      }));
      await render(village({ cle: "a", items }));
      // 300 ms into the moment: every part of both growths is up, the village is quiet.
      await act(() => jest.advanceTimersByTime(300));
      // Only the first two growths play (L5-AUD I1): the other two show their new stage at once.
      expect(screen.queryAllByTestId(/^iso-croissance-nouveau-(?!image)/).length).toBe(2);
      // The campfire and the forge are growing: their fire waits for the new sprite.
      expect(screen.getAllByTestId(/^iso-flamme-/)).toHaveLength(3);
      expect(screen.getAllByTestId(/^iso-fumee-/)).toHaveLength(6);
      const n = compte(screen.toJSON());
      expect(n).toBeLessThanOrEqual(PLAFOND_NOEUDS);
      expect(n).toBeGreaterThanOrEqual(NOEUDS_CROISSANCE_FEUX);
    } finally {
      jest.useRealTimers();
    }
  });

  test("worst case by day: both roof birds are mounted over the growths and the total stays under the cap", async () => {
    jest.useFakeTimers();
    try {
      const items = (["tent", "well", "quarry", "watchtower"] as const).map((code) => ({
        code,
        oldLevel: 1,
      }));
      await render(village({ cle: "j", items }, undefined, "jour"));
      // The moment is over (a finger on a roof skips it anyway): the new bodies stay, one node each.
      await act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS + STADE_MS));
      // The village is quiet while the reveal plays: once the owner drops it, the birds are mounted.
      await screen.rerender(village(undefined, undefined, "jour"));
      expect(screen.getAllByTestId(/^iso-creature-oiseau-[a-z]+$/)).toHaveLength(2);
      const n = compte(screen.toJSON());
      // The birds sit in the rest count by day: nothing is added by a touch, and the clock is still.
      await toucherToit("farm");
      await toucherToit("forge");
      await act(() => jest.advanceTimersByTime(300));
      const pire = compte(screen.toJSON());
      expect(pire - NOEUDS_OISEAUX_JOUR).toBeLessThanOrEqual(n);
      expect(pire).toBeLessThan(PLAFOND_NOEUDS);
    } finally {
      jest.useRealTimers();
    }
  });

  test("worst case, four buildings without fire grow: two play, 47 with the rest map, up to 58 with the wave's lights and glints", async () => {
    jest.useFakeTimers();
    try {
      const items = (["tent", "well", "quarry", "watchtower"] as const).map((code) => ({
        code,
        oldLevel: 1,
      }));
      await render(village({ cle: "b", items }));
      // The moment is over (a finger on a roof skips it anyway): the new bodies stay, one node each.
      await act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS + STADE_MS));
      expect(screen.queryAllByTestId(/^iso-croissance-nouveau-(?!image)/).length).toBe(2);
      // Tent and well: no fire hidden, nothing else masked: the whole rest map, plus 2 nodes for each of the 2 growths played.
      expect(screen.getAllByTestId(/^iso-flamme-/)).toHaveLength(5);
      const n = compte(screen.toJSON());
      // The base: the rest map and the 2 new bodies; the village is quiet, no wave light.
      expect(n).toBeGreaterThanOrEqual(NOEUDS_REPOS + NOEUDS_APRES_MOMENT);
      expect(NOEUDS_REPOS).toBe(48 + NOEUDS_BANNIERES);
      // A finger on the farm's roof, then on the forge's: a wave starts, over the wave's night lights
      // (2 to 4) and glints (up to 2).
      await toucherToit("farm");
      await toucherToit("forge");
      await act(() => jest.advanceTimersByTime(300));
      // qa-audit3: the map is lit by night here: no roof bird.
      expect(screen.queryAllByTestId(/^iso-creature-oiseau-/)).toHaveLength(0);
      const pire = compte(screen.toJSON());
      expect(pire).toBe(n);
      expect(pire).toBeLessThanOrEqual(NOEUDS_PIRE_SANS_PRETS);
      // T26: the 4th walker adds its shadow; T27: the effects fill what the two glints leave of the signal seat. 63 at most, one under the cap, as the ready-glow case.
      expect(pire).toBeLessThan(PLAFOND_NOEUDS);
      // T27: the glints and the effects share the signal seat (4 nodes).
      expect(effetsEtSignal()).toBeLessThanOrEqual(NOEUDS_RECLAMABLES);
      expect(pire).toBeGreaterThanOrEqual(NOEUDS_REPOS + NOEUDS_APRES_MOMENT);
    } finally {
      jest.useRealTimers();
    }
  });
  test("at the reveal, two growths and every ready glow (VillageScene passes both), a wave: the glows keep quiet", async () => {
    jest.useFakeTimers();
    try {
      const items = (["tent", "well", "quarry", "watchtower"] as const).map((code) => ({
        code,
        oldLevel: 1,
      }));
      await render(village({ cle: "c", items }, buildingCodes));
      // The moment is over (a finger on a roof skips it anyway): the new bodies stay, one node each.
      await act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS + STADE_MS));
      await toucherToit("farm");
      await toucherToit("forge");
      await act(() => jest.advanceTimersByTime(300));
      // T41: the new stage is on, so the village is quiet: no ready glow shows (the burst and the
      // golden wave take their places, the case below).
      const lueurs = screen.queryAllByTestId(/^iso-lueur-/).length;
      expect(lueurs).toBe(0);
      // T03 review: the glints give way to the ready glows, so the two never add up.
      expect(screen.queryAllByTestId(/^iso-eclat-anime-/)).toHaveLength(0);
      const pire = compte(screen.toJSON());
      // Measured 56 on 30/10 (61 before T23); the doors lit follow the day's plan, so a bound, not an exact count.
      expect(pire).toBeGreaterThanOrEqual(NOEUDS_REPOS + NOEUDS_APRES_MOMENT + lueurs);
      expect(pire).toBeLessThanOrEqual(
        NOEUDS_CROISSANCE_PIRE + NOEUDS_VEILLES_MAX + NOEUDS_RECLAMABLES + NOEUDS_OMBRES_MARCHEURS,
      );
      expect(pire).toBeLessThanOrEqual(NOEUDS_PIRE_ABSOLU_ATTENDU);
      // T27: 4 ready glows fill the signal seat, so no effect plays; the worst case is the old one.
      expect(effetsEtSignal()).toBeLessThanOrEqual(NOEUDS_RECLAMABLES);
      expect(screen.queryAllByTestId(/^iso-effet-/)).toHaveLength(0);
      expect(pire).toBeLessThan(PLAFOND_NOEUDS);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("the reveal (T37)", () => {
  test("it mounts no node of its own: the worst case holds under 64 at its first frame and after the spring", async () => {
    jest.useFakeTimers();
    try {
      const items = (["tent", "well", "quarry", "watchtower"] as const).map((code) => ({
        code,
        oldLevel: 1,
      }));
      await render(
        <GestureHandlerRootView>
          <IsoVillage
            reclamables={buildingCodes}
            tier={12}
            buildings={buildingCodes.map((code) => ({ code, level: 5 }))}
            width={390}
            height={390}
            croissance={{ cle: "rev", items }}
          />
        </GestureHandlerRootView>,
      );
      await act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS + STADE_MS));
      await toucherToit("farm");
      await toucherToit("forge");
      for (const ms of [20, 100, 300]) {
        await act(() => jest.advanceTimersByTime(ms));
        expect(screen.queryAllByTestId(/^iso-croissance-nouveau-(?!image)/).length).toBe(2);
        expect(compte(screen.toJSON())).toBeLessThanOrEqual(PLAFOND_NOEUDS);
      }
    } finally {
      jest.useRealTimers();
    }
  });

  test("T41: the village is quiet, the pulse of light takes its places, 64 at most, nothing left after", async () => {
    jest.useFakeTimers();
    try {
      const items = (["tent", "well", "quarry", "watchtower"] as const).map((code) => ({
        code,
        oldLevel: 1,
      }));
      await render(
        <GestureHandlerRootView>
          <IsoVillage
            reclamables={buildingCodes}
            tier={12}
            buildings={buildingCodes.map((code) => ({ code, level: 5 }))}
            width={390}
            height={390}
            croissance={{ cle: "t41", items }}
          />
        </GestureHandlerRootView>,
      );
      await act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS + STADE_MS));
      await toucherToit("farm");
      await toucherToit("forge");
      await act(() => jest.advanceTimersByTime(300));
      // Quiet: no wave light, glow, glint, window or trade effect.
      expect(screen.queryAllByTestId(/^iso-(porte|lueur|eclat-anime|effet)-/)).toHaveLength(0);
      expect(screen.queryAllByTestId(/^iso-fenetres-/)).toHaveLength(0);
      const pire = compte(screen.toJSON());
      expect(pire).toBeLessThanOrEqual(PLAFOND_NOEUDS);
      // The worst case before T41 (the wave's lights, glows and glints on top of two growths) was 63.
      // Measured 62 (T41, 31/10), never above the 63 it was: the cap of 64 is untouched.
      expect(pire).toBeLessThanOrEqual(NOEUDS_PIRE_ABSOLU_ATTENDU + 1);
      // The silence ends with the pulse, even though the owner never drops the growth here: the
      // ready glows speak again.
      await act(() => jest.advanceTimersByTime(ONDE_MS + 100));
      expect(screen.queryAllByTestId(/^iso-lueur-/).length).toBeGreaterThan(0);
      expect(compte(screen.toJSON())).toBeLessThanOrEqual(PLAFOND_NOEUDS);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("the building site (L6-T02)", () => {
  const items = (["tent", "well", "quarry", "watchtower"] as const).map((code) => ({
    code,
    oldLevel: 1,
  }));

  const buildings = buildingCodes.map((code) => ({ code, level: 5 }));
  const village = (croissance?: Croissance) => (
    <GestureHandlerRootView>
      <IsoVillage
        tier={12}
        buildings={buildings}
        width={390}
        height={390}
        croissance={croissance}
      />
    </GestureHandlerRootView>
  );

  test("reduced motion or the frozen mode: no site, no dust, no pop", async () => {
    jest.useFakeTimers();
    try {
      await render(
        <FigeContext.Provider value>{village({ cle: "f", items })}</FigeContext.Provider>,
      );
      await act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS + STADE_MS + 1000));
      expect(
        screen.queryAllByTestId(/^iso-(echafaudage|poussiere|croissance-(?!ancien|nouveau))/),
      ).toHaveLength(0);
      expect(screen.queryAllByTestId(/^iso-poussiere-pop-/)).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });

  test("two sites stand, the node count stays under the growth worst case, and nothing is left after", async () => {
    jest.useFakeTimers();
    try {
      await render(village({ cle: "s", items }));
      await act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS));
      // From the tap: the moment's layers of the first two growths, each with its scaffold.
      expect(screen.queryAllByTestId(/^iso-croissance-echafaudage-/)).toHaveLength(2);
      expect(screen.queryAllByTestId(/^iso-croissance-nouveau-(?!image)/)).toHaveLength(2);
      const n = compte(screen.toJSON());
      dansLaVague(n, NOEUDS_REPOS + NOEUDS_CROISSANCE_MAX);
      expect(n).toBeLessThanOrEqual(PLAFOND_NOEUDS);
      await act(() => jest.advanceTimersByTime(STADE_MS));
      expect(screen.queryAllByTestId(/^iso-croissance-nouveau-(?!image)/)).toHaveLength(2);
      // The growth is over: the owner drops it and nothing of the site is mounted.
      await screen.rerender(village());
      expect(screen.queryAllByTestId(/^iso-croissance-/)).toHaveLength(0);
      await act(() => jest.advanceTimersByTime(35000));
      expect(compte(screen.toJSON())).toBe(NOEUDS_REPOS + ombresDeMarche());
    } finally {
      jest.useRealTimers();
    }
  }, 120_000);
});
