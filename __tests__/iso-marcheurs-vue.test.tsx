import assert from "node:assert/strict";
import { act, render, screen } from "@testing-library/react-native";
import * as Reanimated from "react-native-reanimated";
import {
  etatCarte,
  ORDRE_CARTE,
  ombreSocleDe,
  stadeDemo,
} from "@/components/village/iso/carteDemo";
import {
  cibleVague,
  type Depart,
  DepartContext,
  HorlogeContext,
} from "@/components/village/iso/horloge";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import { MARCHEURS_PAR_VAGUE, planifierVague, ROLES } from "@/components/village/iso/marcheurs";

let mockReduit = false;
jest.mock("@/components/village/iso/carteDemo", () => {
  const actual = jest.requireActual("@/components/village/iso/carteDemo");
  return { ...actual, ombreSocleDe: jest.fn(actual.ombreSocleDe) };
});
jest.mock("@/components/village/iso/marcheurs", () => {
  const actual = jest.requireActual("@/components/village/iso/marcheurs");
  return { ...actual, planifierVague: jest.fn(actual.planifierVague) };
});
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduit }));

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { transform?: Record<string, number>[] };

let horloge: Reanimated.SharedValue<number> | undefined;
let depart: Reanimated.SharedValue<Depart> | undefined;
// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
function Hote() {
  const c = Reanimated.useSharedValue(0);
  horloge = c;
  const d = Reanimated.useSharedValue<Depart>({ n: 0, c0: 0 });
  depart = d;
  const { visible, montres } = etatCarte(12, true);
  return (
    <HorlogeContext.Provider value={c}>
      <DepartContext.Provider value={d}>
        <IsoCarte visible={visible} montres={montres} stade={(code) => stadeDemo(code, 12)} />
      </DepartContext.Provider>
    </HorlogeContext.Provider>
  );
}

const noeuds = () => screen.queryAllByTestId(/^iso-marcheur-.*-noeud$/);
/** The translation of every walking villager, by role. */
const decalages = () =>
  Object.fromEntries(
    noeuds().map((n) => [
      String(n.props.testID),
      JSON.stringify(getAnimatedStyle(n as never).transform),
    ]),
  );
/** Starts a wave the way horloge.ts `touche` does (a start signal, a bounded linear timing to the next rest), then lets `ms` pass. */
const demarrer = (ms: number) => {
  assert(horloge && depart);
  return act(() => {
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
  jest.mocked(planifierVague).mockClear();
  jest.mocked(ombreSocleDe).mockClear();
});
afterEach(() => jest.useRealTimers());

// Each test renders the whole map through a wave: past jest's 5 s default when the full suite loads the machine.
jest.setTimeout(15_000);

describe("the villagers on the map", () => {
  test("every role whose building stands is mounted once, still, before any wave", async () => {
    await render(<Hote />);
    for (const r of ROLES)
      expect([r, screen.queryAllByTestId(`iso-marcheur-${r}`).length]).toEqual([r, 1]);
    expect(noeuds()).toHaveLength(0);
  });

  test("a wave puts three of them in motion, on one animated node each, and the others stay plain", async () => {
    await render(<Hote />);
    await demarrer(100);
    expect(noeuds()).toHaveLength(MARCHEURS_PAR_VAGUE);
    for (const r of ROLES)
      expect([r, screen.queryAllByTestId(`iso-marcheur-${r}`).length]).toEqual([r, 1]);
    const style = getAnimatedStyle(noeuds()[0] as never);
    expect(Object.keys(style)).toEqual(expect.arrayContaining(["transform"]));
    expect(
      Object.keys(style).filter(
        // transformOrigin is static: the feet a strike leans the villager about (T02b).
        (k) =>
          !["position", "left", "top", "width", "height", "transform", "transformOrigin"].includes(
            k,
          ),
      ),
    ).toEqual([]);
  });

  test("T03: at a work stop a walker gestures on its own node, and is upright again when it leaves", async () => {
    await render(<Hote />);
    await demarrer(100);
    const vague = jest.mocked(planifierVague).mock.results[0]?.value as ReturnType<
      typeof planifierVague
    >;
    const travail = vague.marcheurs.flatMap((m) =>
      m.segments.filter((x) => x.travail).map((x) => ({ role: m.role, x })),
    )[0];
    assert(travail);
    const { role, x } = travail;
    const pose = () => {
      const n = screen.getByTestId(`iso-marcheur-${role}-noeud`);
      const t = getAnimatedStyle(n as never).transform ?? [];
      return {
        rotate: t.find((e) => "rotate" in e)?.rotate,
        scaleY: t.find((e) => "scaleY" in e)?.scaleY,
      };
    };
    const vus: string[] = [];
    let t = 100;
    for (const cible of [0.3, 0.45, 0.6, 0.75].map((f) => x.t0 + f * x.duree)) {
      await passer(cible - t);
      t = cible;
      vus.push(JSON.stringify(pose()));
    }
    // Something other than upright and full height during the stop.
    expect(vus.some((v) => v !== JSON.stringify({ rotate: "0deg", scaleY: 1 }))).toBe(true);
    await passer(x.t0 + x.duree + 5 - t);
    expect(pose()).toEqual({ rotate: "0deg", scaleY: 1 });
  });

  test("at every rest pose after the wave, a walker is where it will stay, with no bounce", async () => {
    await render(<Hote />);
    await demarrer(100);
    await passer(7903);
    const milieu = JSON.stringify(decalages());
    // A touch at 8 s extends the wave from where the clock stands (horloge.ts `touche`): to 25 s.
    await act(() => {
      const c = horloge?.get() ?? 0;
      horloge?.set(
        Reanimated.withTiming(cibleVague(c), {
          duration: cibleVague(c) - c,
          easing: Reanimated.Easing.linear,
        }),
      );
    });
    // Past the plan's end (14 s), the wave's first end (15 s) and each later rest pose: the same.
    const reposes: string[] = [];
    for (const ms of [7000, 5000, 5000]) {
      await passer(ms);
      reposes.push(JSON.stringify(decalages()));
    }
    expect(Object.keys(decalages())).toHaveLength(MARCHEURS_PAR_VAGUE);
    expect(reposes).toEqual([reposes[0], reposes[0], reposes[0]]);
    expect(milieu).not.toBe(reposes[0]);
  }, 30000);

  test("AUDIT-DA: a walker's shadow node stays on the ground while its body is lifted, shrinking and fading", async () => {
    await render(<Hote />);
    await demarrer(100);
    expect(screen.queryAllByTestId(/^iso-marcheur-.*-ombre$/)).toHaveLength(MARCHEURS_PAR_VAGUE);
    const lire = (id: string) => {
      const n = screen.getByTestId(id);
      const st = getAnimatedStyle(n as never) as { opacity?: number; transform?: object[] };
      return { opacity: st.opacity ?? 1, t: Object.assign({}, ...(st.transform ?? [])) };
    };
    const vus: { haut: number; echelle: number; opacite: number; ecartX: number }[] = [];
    for (let k = 0; k < 120; k++) {
      await passer(100);
      for (const n of noeuds()) {
        const corps = lire(String(n.props.testID));
        const ombre = lire(String(n.props.testID).replace(/-noeud$/, "-ombre"));
        vus.push({
          haut: ombre.t.translateY - corps.t.translateY,
          echelle: ombre.t.scale,
          opacite: ombre.opacity,
          ecartX: ombre.t.translateX - corps.t.translateX,
        });
      }
    }
    // The same place on the grid: the shadow never takes the body's bounce or lift.
    expect(vus.every((v) => Math.abs(v.ecartX) < 1e-6)).toBe(true);
    // The body is lifted past the first notch at least once (the walk bounce reaches 2 dp): the shadow shrank and faded.
    const hauts = vus.filter((v) => v.haut > 1.6);
    expect(hauts.length).toBeGreaterThan(0);
    expect(hauts.every((v) => v.echelle < 1 && v.opacite < 1)).toBe(true);
    // On the ground it is whole; never past two notches.
    expect(vus.filter((v) => v.haut < 1.5).every((v) => v.echelle === 1 && v.opacite === 1)).toBe(
      true,
    );
    expect(vus.every((v) => v.echelle > 0.7)).toBe(true);
  }, 30000);

  test("the walkers sit in the depth order: the map's own order is untouched by them", async () => {
    await render(<Hote />);
    await demarrer(100);
    await passer(6900);
    const ids: string[] = [];
    const parcourir = (n: unknown) => {
      if (typeof n !== "object" || n === null) return;
      const { props, children } = n as { props?: { testID?: string }; children?: unknown[] };
      const id = props?.testID;
      if (id && /^iso-(maquette|marcheur)-/.test(id) && !id.endsWith("-noeud")) ids.push(id);
      for (const c of children ?? []) parcourir(c);
    };
    parcourir(screen.toJSON());
    const marcheurs = ids.filter((i) => /^iso-marcheur-[a-z]+$/.test(i));
    expect(marcheurs).toHaveLength(ROLES.length);
    const batiments = ids.filter((i) => i.startsWith("iso-maquette-")).map((i) => i.slice(13));
    const attendu = ORDRE_CARTE.flatMap((e) => (e.type === "batiment" ? [e.code] : []));
    expect(batiments).toEqual(attendu.filter((c) => batiments.includes(c)));
    // A walker is among the buildings, not all lined up at one end of the map.
    const places = marcheurs.map((m) => ids.indexOf(m));
    expect(Math.min(...places)).toBeGreaterThan(0);
    expect(Math.max(...places)).toBeLessThan(ids.length - 1);
  });

  test("a late frame in the middle of a wave, or a long silence of the clock, plans nothing", async () => {
    await render(<Hote />);
    await demarrer(100);
    const plans = jest.mocked(planifierVague).mock.calls.length;
    const avant = JSON.stringify(Object.keys(decalages()).sort());
    await passer(3000);
    // The frame stalls (a blocked thread, the app in the background): the clock stops, then moves again.
    await act(() => {
      Reanimated.cancelAnimation(horloge as Reanimated.SharedValue<number>);
      jest.advanceTimersByTime(30000);
    });
    const c = horloge?.get() ?? 0;
    await act(() => {
      horloge?.set(
        Reanimated.withTiming(cibleVague(c), {
          duration: cibleVague(c) - c,
          easing: Reanimated.Easing.linear,
        }),
      );
      jest.advanceTimersByTime(500);
    });
    expect(jest.mocked(planifierVague).mock.calls).toHaveLength(plans);
    expect(JSON.stringify(Object.keys(decalages()).sort())).toBe(avant);
  });

  test("at rest, the clock moving with no start signal plans nothing; a start signal plans once", async () => {
    await render(<Hote />);
    await demarrer(100);
    await passer(20000);
    const plans = jest.mocked(planifierVague).mock.calls.length;
    expect(plans).toBe(1);
    await passer(30000);
    await act(() => {
      horloge?.set(
        Reanimated.withTiming(40000, { duration: 5000, easing: Reanimated.Easing.linear }),
      );
      jest.advanceTimersByTime(300);
    });
    expect(jest.mocked(planifierVague).mock.calls).toHaveLength(plans);
    await act(() => {
      depart?.set({ n: (depart?.get().n ?? 0) + 1, c0: 40000 });
      jest.advanceTimersByTime(100);
    });
    expect(jest.mocked(planifierVague).mock.calls).toHaveLength(plans + 1);
  });

  test("the segment changes of a wave do not render the buildings", async () => {
    await render(<Hote />);
    await demarrer(100);
    const rendus = jest.mocked(ombreSocleDe).mock.calls.length;
    expect(rendus).toBeGreaterThan(0);
    const avant = JSON.stringify(decalages());
    // Fourteen seconds: about ten segments for each of the three walkers.
    for (let i = 0; i < 14; i++) await passer(1000);
    expect(JSON.stringify(decalages())).not.toBe(avant);
    expect(jest.mocked(ombreSocleDe).mock.calls).toHaveLength(rendus);
  }, 30000);

  test("with reduced motion, or off focus, the villagers stand: no wave, no animated node", async () => {
    mockReduit = true;
    await render(<Hote />);
    await demarrer(100);
    expect(noeuds()).toHaveLength(0);
    for (const r of ROLES)
      expect([r, screen.queryAllByTestId(`iso-marcheur-${r}`).length]).toEqual([r, 1]);
  });
});
