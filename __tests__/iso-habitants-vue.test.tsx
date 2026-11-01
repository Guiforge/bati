// RNGH mocks its native module and host detector; it must load before the component does.
import "react-native-gesture-handler/jestSetup";
import assert from "node:assert/strict";
import { act, configure, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  createGestureController,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import * as Reanimated from "react-native-reanimated";
import type { Ouverture } from "@/components/village/iso/bulle";
import { etatCarte, HAUTEUR, LARGEUR, stadeDemo } from "@/components/village/iso/carteDemo";
import {
  type CibleVillageois,
  nombreHabitants,
  villageoisAuPoint,
} from "@/components/village/iso/habitants";
import {
  cibleVague,
  type Depart,
  DepartContext,
  HorlogeContext,
} from "@/components/village/iso/horloge";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import { planifierVague } from "@/components/village/iso/marcheurs";
import { POSES_REPOS, type PoseRepos } from "@/components/village/iso/reposTable";
import { FETE_REDUITE_MS } from "@/components/village/iso/useMarcheurs";
import type { VillageTier } from "@/db/village";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
let mockReduit = false;
// The touch tests aim at the standing sprite's feet: no resting poses there (iso-repos.test.ts has them).
const TOUTES_LES_POSES = [...POSES_REPOS];
const sansPoses = (sans: boolean) => {
  (POSES_REPOS as PoseRepos[]).splice(0, POSES_REPOS.length, ...(sans ? [] : TOUTES_LES_POSES));
};
// A jest host never measures: the map sits at the window's top left.
jest.mock("@/components/village/iso/bulle", () => ({
  ...jest.requireActual("@/components/village/iso/bulle"),
  mesurerFenetre: (_v: unknown, cb: (x: number, y: number) => void) => cb(0, 0),
}));
jest.mock("@/components/village/iso/marcheurs", () => {
  const actual = jest.requireActual("@/components/village/iso/marcheurs");
  return { ...actual, planifierVague: jest.fn(actual.planifierVague) };
});
jest.mock("@/components/village/iso/habitants", () => {
  const actual = jest.requireActual("@/components/village/iso/habitants");
  return { ...actual, villageoisAuPoint: jest.fn(actual.villageoisAuPoint) };
});
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduit }));

configure({ defaultIncludeHiddenElements: true });

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { transform?: Record<string, number>[] };

let horloge: Reanimated.SharedValue<number> | undefined;
let depart: Reanimated.SharedValue<Depart> | undefined;
// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
function Hote({
  palier = 12,
  fete,
  sans = false,
}: {
  palier?: VillageTier;
  fete?: string;
  /** The map without its inhabitants (no tier given). */
  sans?: boolean;
}) {
  const c = Reanimated.useSharedValue(0);
  horloge = c;
  const d = Reanimated.useSharedValue<Depart>({ n: 0, c0: 0 });
  depart = d;
  const { visible, montres } = etatCarte(palier, true);
  return (
    <HorlogeContext.Provider value={c}>
      <DepartContext.Provider value={d}>
        <IsoCarte
          visible={visible}
          montres={montres}
          stade={(code) => stadeDemo(code, palier)}
          palier={sans ? undefined : palier}
          fete={fete}
        />
      </DepartContext.Provider>
    </HorlogeContext.Provider>
  );
}

const habitants = () => screen.queryAllByTestId(/^iso-habitant-h\d+$/);
/** The second halves of talking pairs: they draw nothing, the first draws both. */
const paires = () => screen.queryAllByTestId(/^iso-habitant-h\d+-paire$/).length;
const noeuds = () => screen.queryAllByTestId(/^iso-marcheur-.*-noeud$/);
/** Where each still image stands: its left and top, by test id. */
const places = () =>
  Object.fromEntries(
    [...habitants(), ...screen.queryAllByTestId(/^iso-marcheur-.*-fixe$/)].map((n) => {
      const st = StyleSheet.flatten(n.props.style);
      return [String(n.props.testID), `${st.left},${st.top}`];
    }),
  );
/** Host nodes carrying an animated style or animated props. */
type Noeud = { props?: Record<string, unknown>; children?: unknown[] | null };
const compte = (n: unknown): number => {
  if (typeof n !== "object" || n === null) return 0;
  const { props, children } = n as Noeud;
  const propre =
    props?.jestAnimatedStyle === undefined && props?.animatedProps === undefined ? 0 : 1;
  return (children ?? []).reduce<number>((a, c) => a + compte(c), propre);
};
const demarrer = (ms: number) => {
  assert(horloge && depart);
  return act(() => {
    horloge?.set(0);
    depart?.set({ n: (depart?.get().n ?? 0) + 1, c0: 0 });
    horloge?.set(
      Reanimated.withTiming(cibleVague(0), {
        duration: cibleVague(0),
        easing: Reanimated.Easing.linear,
      }),
    );
    jest.advanceTimersByTime(ms);
  });
};
const passer = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

beforeEach(() => {
  jest.useFakeTimers();
  mockReduit = false;
  sansPoses(false);
  jest.mocked(planifierVague).mockClear();
});
afterEach(() => jest.useRealTimers());
jest.setTimeout(15_000);

describe("the inhabitants on the map (T26)", () => {
  test("3 at tier 1 and 12 at tier 12, each one full-opacity sprite, none on an animated node", async () => {
    await render(<Hote palier={1} />);
    expect(habitants()).toHaveLength(nombreHabitants(1) - paires());
    await screen.unmount();
    await render(<Hote />);
    expect(habitants()).toHaveLength(12 - paires());
    // The same map without them holds exactly as many animated nodes.
    const avec = compte(screen.toJSON());
    await screen.unmount();
    await render(<Hote sans />);
    expect(habitants()).toHaveLength(0);
    expect(compte(screen.toJSON())).toBe(avec);
  });

  test("a wave moves four of the trades at most and leaves every inhabitant where it stands", async () => {
    await render(<Hote />);
    const avant = Object.fromEntries(Object.entries(places()).filter(([k]) => /habitant/.test(k)));
    await demarrer(100);
    expect(noeuds().length).toBeLessThanOrEqual(4);
    expect(noeuds().length).toBeGreaterThan(0);
    await passer(5000);
    const apres = Object.fromEntries(Object.entries(places()).filter(([k]) => /habitant/.test(k)));
    expect(apres).toEqual(avant);
  });

  test("the party plays in the first wave after a session and not in the next, a new session plays it again", async () => {
    await render(<Hote fete="s1" />);
    await demarrer(100);
    const options = () => jest.mocked(planifierVague).mock.calls.map((c) => c[4]?.fete ?? false);
    expect(options()).toEqual([true]);
    await passer(25000);
    await demarrer(100);
    expect(options()).toEqual([true, false]);
    await passer(25000);
    await screen.rerender(<Hote fete="s2" />);
    await demarrer(100);
    expect(options()).toEqual([true, false, true]);
    const vague = jest.mocked(planifierVague).mock.results[0]?.value as ReturnType<
      typeof planifierVague
    >;
    expect(vague.marcheurs.some((m) => m.segments.some((s) => s.joie))).toBe(true);
  });

  test("reduced motion: nobody walks to the party, they stand on the square for a while and then go back", async () => {
    mockReduit = true;
    await render(<Hote />);
    const repos = places();
    await screen.rerender(<Hote fete="s1" />);
    await passer(100);
    const fete = places();
    expect(Object.keys(fete).toSorted()).toEqual(Object.keys(repos).toSorted());
    expect(Object.keys(fete).filter((k) => fete[k] !== repos[k]).length).toBeGreaterThan(3);
    expect(noeuds()).toHaveLength(0);
    await passer(FETE_REDUITE_MS + 100);
    expect(places()).toEqual(repos);
    // The same session never plays it twice.
    await screen.rerender(<Hote fete="s1" />);
    await passer(100);
    expect(places()).toEqual(repos);
  });
});

describe("a touch on a villager (T26)", () => {
  const [w, h] = [390, 390];
  const camera = () => {
    const t = getAnimatedStyle(screen.getByTestId("iso-camera") as never).transform ?? [];
    return Object.assign({}, ...t) as Record<string, number>;
  };

  beforeEach(() => {
    sansPoses(true);
  });

  /** A finger on inhabitant `h0`'s body, `decale` dp to the left of its feet; its bubble is asked for. */
  async function toucher(decale: number, fois = 1, ecart = 0) {
    const onBulle = jest.fn();
    await render(
      <GestureHandlerRootView>
        <IsoVillage
          tier={12}
          buildings={[{ code: "campfire", level: 1 }]}
          width={w}
          height={h}
          onBulle={onBulle}
        />
      </GestureHandlerRootView>,
    );
    const image = screen.getByTestId("iso-habitant-h0");
    const st = StyleSheet.flatten(image.props.style);
    // The sprite's feet are at 704/768 of its box, in the middle (its anchor).
    const [px, py] = [st.left + st.width / 2 - decale, st.top + st.height * (704 / 768) - 18];
    const v = camera();
    const x = (px - LARGEUR / 2) * (v.scale ?? 1) + w / 2 + (v.translateX ?? 0);
    const y = (py - HAUTEUR / 2) * (v.scale ?? 1) + h / 2 + (v.translateY ?? 0);
    for (let i = 0; i < fois; i++)
      await act(() => {
        const tap = createGestureController(getByGestureTestId("iso-geste-tap"));
        tap.begin({ x, y });
        tap.activate({ x, y });
        tap.end({ x, y });
        jest.advanceTimersByTime(i < fois - 1 ? ecart : 300);
      });
    return onBulle;
  }
  const retourne = () =>
    (StyleSheet.flatten(screen.getByTestId("iso-habitant-h0").props.style).transform ?? []).some(
      (t: { scaleX?: number }) => t.scaleX === -1,
    );

  test("it turns towards the finger, then its bubble opens with a villager as subject", async () => {
    const onBulle = await toucher(8);
    expect(retourne()).toBe(true);
    await passer(300);
    expect(onBulle).toHaveBeenCalledTimes(1);
    const o: Ouverture = onBulle.mock.calls[0]?.[0];
    expect(o.cible.type).toBe("villageois");
  });

  test("two taps 50 ms apart open the bubble once: the second replaces the first one's pending bubble", async () => {
    const onBulle = await toucher(8, 2, 50);
    expect(onBulle).toHaveBeenCalledTimes(1);
  });

  test("reduced motion: no turn, the bubble opens at once", async () => {
    mockReduit = true;
    const onBulle = await toucher(8);
    expect(retourne()).toBe(false);
    expect(onBulle).toHaveBeenCalledTimes(1);
    expect(onBulle.mock.calls[0]?.[0].cible.type).toBe("villageois");
  });
  /** A tap on the map point `p` (map dp); the map's targets are read from the tap itself. */
  async function toucherEn(p: readonly [number, number] | null) {
    const v = camera();
    const [px, py] = p ?? [0, 0];
    const x = (px - LARGEUR / 2) * (v.scale ?? 1) + w / 2 + (v.translateX ?? 0);
    const y = (py - HAUTEUR / 2) * (v.scale ?? 1) + h / 2 + (v.translateY ?? 0);
    await act(() => {
      const tap = createGestureController(getByGestureTestId("iso-geste-tap"));
      tap.begin({ x, y });
      tap.activate({ x, y });
      tap.end({ x, y });
      jest.advanceTimersByTime(300);
    });
  }
  /** The map's villagers as the last tap saw them. */
  const cibles = (): CibleVillageois[] => {
    const appels = jest.mocked(villageoisAuPoint).mock.calls;
    return [...(appels[appels.length - 1]?.[1] ?? [])];
  };
  async function monter(jour: number) {
    sansPoses(false);
    jest.setSystemTime(new Date(Date.UTC(2026, 0, 1 + jour, 12)));
    const onBulle = jest.fn();
    await render(
      <GestureHandlerRootView>
        <IsoVillage
          tier={12}
          buildings={[{ code: "campfire", level: 1 }]}
          width={w}
          height={h}
          onBulle={onBulle}
        />
      </GestureHandlerRootView>,
    );
    return onBulle;
  }
  /** Taps the villager `id` on its body and returns who the bubble was opened for. */
  async function toucherCible(id: string, onBulle: jest.Mock) {
    await toucherEn(null);
    const c = cibles().find((x) => x.id === id);
    assert(c);
    onBulle.mockClear();
    // On the figure's own box when it rests (T40), else on the standing body.
    const [x0, y0, x1, y1] = c.boite ?? [0, 0, 0, 0];
    await toucherEn(c.boite ? [(x0 + x1) / 2, (y0 + y1) / 2] : [c.pied[0], c.pied[1] - 18]);
    return onBulle.mock.calls[0]?.[0]?.cible;
  }

  test("with its resting pose on, a tap on a seated inhabitant opens its bubble", async () => {
    const onBulle = await monter(0);
    const cible = await toucherCible("h0", onBulle);
    expect(cible).toMatchObject({ type: "villageois", id: "h0", habitant: true });
  });

  test("a tap in the air above a resting inhabitant, where its standing box stood, opens nothing of it", async () => {
    const onBulle = await monter(0);
    await toucherEn(null);
    const c = cibles().find((x) => x.boite && x.pied[1] - x.h + 2 < x.boite[1] - 1);
    assert(c);
    onBulle.mockClear();
    await toucherEn([c.pied[0], c.pied[1] - c.h + 2]);
    expect(onBulle.mock.calls[0]?.[0]?.cible?.id).not.toBe(c.id);
  });

  test("the second of a talking pair draws nothing but its tap opens its own bubble", async () => {
    let onBulle = await monter(0);
    for (let j = 1; paires() === 0 && j < 20; j++) {
      await screen.unmount();
      onBulle = await monter(j);
    }
    expect(paires()).toBeGreaterThan(0);
    const second = /^iso-habitant-(h\d+)-paire$/.exec(
      String(screen.queryAllByTestId(/^iso-habitant-h\d+-paire$/)[0]?.props.testID),
    )?.[1];
    assert(second);
    expect(screen.queryByTestId(`iso-habitant-${second}`)).toBeNull();
    const cible = await toucherCible(second, onBulle);
    expect(cible).toMatchObject({ type: "villageois", id: second, habitant: true });
  });
});
