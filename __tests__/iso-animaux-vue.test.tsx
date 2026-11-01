// L5-T10 A, on screen: in a wave an animal's three pose views carry the walk (a translation from
// the clock and a mirror), on the nodes they already had; at rest and after the wave the transform
// is the identity and no node has been added.
import assert from "node:assert/strict";
import { act, render, screen } from "@testing-library/react-native";
import * as Reanimated from "react-native-reanimated";
import {
  ANIMAUX,
  EMPRISES_ORDRE,
  elementsMontes,
  etatCarte,
  POSES_ANIMAL,
  stadeDemo,
} from "@/components/village/iso/carteDemo";
import {
  cibleVague,
  type Depart,
  DepartContext,
  HorlogeContext,
} from "@/components/village/iso/horloge";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import {
  type Carte,
  jourDe,
  planifierAnimaux,
  planifierVague,
  reposDuJour,
  viesSansMarche,
} from "@/components/village/iso/marcheurs";
import { poseVie } from "@/components/village/iso/vieAnimaux";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { opacity?: number; transform?: Record<string, number>[] };

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

const demarrer = (ms: number) =>
  act(() => {
    assert(horloge && depart);
    depart.set({ n: 1, c0: 0 });
    horloge.set(
      Reanimated.withTiming(cibleVague(0), {
        duration: cibleVague(0),
        easing: Reanimated.Easing.linear,
      }),
    );
    jest.advanceTimersByTime(ms);
  });
const passer = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

/** The transform of an animal's pose view, as {translateX, translateY, scaleX}. */
const transformee = (nom: string, pose: (typeof POSES_ANIMAL)[number] = "repos") => {
  const vue = screen.getByTestId(`iso-animal-${nom}-${pose}`).parent;
  assert(vue);
  return Object.assign({}, ...(getAnimatedStyle(vue as never).transform ?? [])) as {
    translateX: number;
    translateY: number;
    scaleX: number;
  };
};

/** The pose an animal shows now: the one of its three stacked views that is opaque. */
const poseVue = (nom: string) =>
  POSES_ANIMAL.findIndex((p) => {
    const vue = screen.getByTestId(`iso-animal-${nom}-${p}`).parent;
    assert(vue);
    return getAnimatedStyle(vue as never).opacity === 1;
  });

/** What the hook plans for the wave that starts at the fixed fake time. */
function attendu() {
  const { visible, montres } = etatCarte(12, true);
  const m = elementsMontes(visible, montres, (code) => stadeDemo(code, 12));
  const carte: Carte = {
    visible,
    montres,
    obstacles: ANIMAUX.map((a) => a.piece.case),
    occupees: [...m.figurines].map((f) => f.case),
    vues: m.indices.flatMap((i) => EMPRISES_ORDRE[i] ?? []),
    animaux: [...m.animaux].map((a) => ({ nom: a.nom, cellule: a.piece.case })),
  };
  const numero = Math.floor(Date.now() / 15000);
  const jour = jourDe(Date.now(), new Date().getTimezoneOffset());
  return planifierAnimaux(carte, planifierVague(carte, {}, jour, numero), jour, numero);
}

beforeEach(() => {
  jest.useFakeTimers();
  // A wave number whose plan walks at least one animal (the plan is the pure function's).
  jest.setSystemTime(15000 * 2_000_000);
});
afterEach(() => jest.useRealTimers());
jest.setTimeout(15_000);

describe("an animal walks in a wave (L5-T10)", () => {
  test("still, with the identity transform, before any wave", async () => {
    await render(<Hote />);
    for (const a of ANIMAUX)
      expect(transformee(a.nom)).toEqual({ translateX: 0, translateY: 0, scaleX: 1 });
  });

  test("mid-walk the pose views moved off their cell, together; back home at the end, no node added", async () => {
    const betes = attendu();
    const b = betes[0];
    assert(b, "the fixed wave must walk an animal");
    const aller = b.segments[1];
    assert(aller);
    await render(<Hote />);
    const vues = screen.queryAllByTestId(/^iso-animal-/).length;
    await demarrer(100);
    await passer(aller.t0 + aller.duree / 2 - 100);
    const milieu = POSES_ANIMAL.map((p) => transformee(b.nom, p));
    // Half way along one cell: about a quarter of a cell's width on screen, a mirror of 1 or -1.
    expect(
      Math.hypot(milieu[0]?.translateX ?? 0, (milieu[0]?.translateY ?? 0) * 2),
    ).toBeGreaterThan(5);
    expect(Math.abs(milieu[0]?.scaleX ?? 0)).toBe(1);
    // The three poses carry the same walk: the clock's pose only changes which one shows.
    expect(milieu[1]).toEqual(milieu[0]);
    expect(milieu[2]).toEqual(milieu[0]);
    // An animal that does not walk this wave stays put.
    for (const a of ANIMAUX.filter((x) => !betes.some((y) => y.nom === x.nom)))
      expect(transformee(a.nom)).toEqual({ translateX: 0, translateY: 0, scaleX: 1 });
    // The wave over (20 s), every animal is at rest: identity, and the views are the same ones.
    await passer(21_000);
    for (const a of ANIMAUX)
      expect(transformee(a.nom)).toEqual({ translateX: 0, translateY: 0, scaleX: 1 });
    expect(screen.queryAllByTestId(/^iso-animal-/).length).toBe(vues);
  });

  // The day seeds the plan: a map mounted the day before (the tab kept alive past midnight) must
  // plan today's wave, not keep the day it was mounted on.
  test("a wave plans with the day it starts on, not the day the map was mounted", async () => {
    await render(<Hote />);
    jest.setSystemTime(15000 * 2_000_000 + 86_400_000);
    const betes = attendu();
    const b = betes[0];
    assert(b, "the next day's wave must walk an animal");
    const aller = b.segments[1];
    assert(aller);
    await demarrer(100);
    await passer(aller.t0 + aller.duree / 2 - 100);
    expect(transformee(b.nom)).not.toEqual({ translateX: 0, translateY: 0, scaleX: 1 });
    for (const a of ANIMAUX.filter((x) => !betes.some((y) => y.nom === x.nom)))
      expect(transformee(a.nom)).toEqual({ translateX: 0, translateY: 0, scaleX: 1 });
  });
});

describe("an animal's pose follows its plan (T31)", () => {
  test("fixed before the wave, the plan's image all across it for every animal, fixed again after", async () => {
    const marcheuses = attendu();
    const jour = jourDe(Date.now(), new Date().getTimezoneOffset());
    const { visible, montres } = etatCarte(12, true);
    const m = elementsMontes(visible, montres, (code) => stadeDemo(code, 12));
    const carte: Carte = {
      visible,
      montres,
      obstacles: ANIMAUX.map((a) => a.piece.case),
      occupees: [...m.figurines].map((f) => f.case),
      vues: m.indices.flatMap((i) => EMPRISES_ORDRE[i] ?? []),
      animaux: [...m.animaux].map((a) => ({ nom: a.nom, cellule: a.piece.case })),
    };
    const numero = Math.floor(Date.now() / 15000);
    const tous = [...marcheuses, ...viesSansMarche(carte, marcheuses, jour, numero)];
    expect(tous).toHaveLength(ANIMAUX.length);
    await render(<Hote />);
    for (const a of ANIMAUX) expect(poseVue(a.nom)).toBe(reposDuJour(jour, a.nom));
    const vues = screen.queryAllByTestId(/^iso-animal-/).length;
    await demarrer(100);
    let t = 100;
    let vusJouer = 0;
    // Mid-image samples (an image lasts 125 ms), so a frame of timing slack never straddles one.
    for (let cible = 185; cible < 14_000; cible += 250) {
      await passer(cible - t);
      t = cible;
      for (const b of tous) {
        const attendue = poseVie(b.vie, t, b.repos);
        if (attendue !== b.repos) vusJouer++;
        expect([b.nom, t, poseVue(b.nom)]).toEqual([b.nom, t, attendue]);
      }
    }
    expect(vusJouer).toBeGreaterThan(0);
    await passer(21_000 - t);
    for (const a of ANIMAUX) expect(poseVue(a.nom)).toBe(reposDuJour(jour, a.nom));
    // No node was added by any of it.
    expect(screen.queryAllByTestId(/^iso-animal-/).length).toBe(vues);
  });
});

describe("the day is not read at render (T31)", () => {
  test("a render of the map after the first reads the clock of the wall no more", async () => {
    await render(<Hote />);
    const lu = jest.spyOn(Date, "now");
    await screen.rerender(<Hote />);
    expect(lu).not.toHaveBeenCalled();
    lu.mockRestore();
  });
});
