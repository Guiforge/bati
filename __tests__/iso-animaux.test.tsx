import assert from "node:assert/strict";
import { render, screen } from "@testing-library/react-native";
import * as Reanimated from "react-native-reanimated";
import {
  ANIMAUX,
  animalMontre,
  cleAnimal,
  ecranXY,
  etatCarte,
  FIGURINES,
  ORDRE_CARTE,
  ombresPiece,
  POSES_ANIMAL,
  poseCentre,
} from "@/components/village/iso/carteDemo";
import { CYCLE_MS, HorlogeContext } from "@/components/village/iso/horloge";
import { Animal, IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import { emplacements, ileVisible, sol, TAILLE } from "@/components/village/iso/isoLayout";
import { MAQUETTES } from "@/components/village/iso/maquettes";
import { casesSousOmbre } from "@/components/village/iso/pieces";
import { type BuildingCode, buildingCodes } from "@/db/schema";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { opacity?: number };

const casesDe = (a: (typeof ANIMAUX)[number]) => a.piece.case.join(",");

describe("the small animals' places (L4-T08c)", () => {
  test("two fixed places, on grass, off every footprint, each in its own cell", () => {
    expect(ANIMAUX.map((a) => [a.nom, casesDe(a)])).toEqual([
      ["poule", "5,6"],
      ["chat", "7,12"],
    ]);
    expect(new Set(ANIMAUX.map(casesDe)).size).toBe(2);
    for (const a of ANIMAUX) {
      const [gx, gy] = a.piece.case;
      expect([a.nom, sol[gy]?.[gx]]).toEqual([a.nom, "herbe"]);
      expect(
        buildingCodes.filter((c) => emplacements[c].cases.some(([x, y]) => x === gx && y === gy)),
      ).toEqual([]);
    }
  });

  test("the shadow of every pose stays in the animal's own cell, so it reaches no building, path or decor", () => {
    for (const a of ANIMAUX) {
      for (const pose of POSES_ANIMAL) {
        const s = MAQUETTES[cleAnimal(a.nom, pose)];
        assert(s);
        const hulls = ombresPiece({ ...a.piece, cle: cleAnimal(a.nom, pose) });
        expect(hulls.length).toBeGreaterThan(0);
        expect([a.nom, pose, casesSousOmbre(hulls)]).toEqual([a.nom, pose, [a.piece.case]]);
      }
    }
  });

  test("the three poses of an animal are the same size with the same anchor", () => {
    for (const a of ANIMAUX) {
      const [r, ...autres] = POSES_ANIMAL.map((p) => MAQUETTES[cleAnimal(a.nom, p)]);
      assert(r);
      for (const s of autres)
        expect([s?.size, s?.anchor, s?.pxScale]).toEqual([r.size, r.anchor, 2]);
    }
  });

  test("they sort in depth with the rest, and show only with their building and their cell", () => {
    expect(ORDRE_CARTE.filter((e) => e.type === "animal")).toHaveLength(2);
    const plein = ileVisible(12, buildingCodes);
    const [poule, chat] = ANIMAUX;
    assert(poule && chat);
    expect(animalMontre(poule, plein, [])).toBe(false);
    expect(animalMontre(poule, plein, ["farm"])).toBe(true);
    expect(animalMontre(chat, plein, ["farm"])).toBe(false);
    expect(animalMontre(chat, plein, ["well"])).toBe(true);
    const vide = Array.from({ length: TAILLE }, () => Array.from({ length: TAILLE }, () => false));
    expect(ANIMAUX.some((a) => animalMontre(a, vide, buildingCodes))).toBe(false);
  });
});

describe("sprites of the villager canvas stand on the centre of their cell", () => {
  test("figurines and animals: the anchor lands on the cell's centre, where the shadow is computed", () => {
    for (const p of [...FIGURINES, ...ANIMAUX.map((a) => a.piece)]) {
      const s = MAQUETTES[p.cle];
      assert(s);
      const r = poseCentre(p.case, s);
      const k = r.w / s.size[0];
      const [cx, cy] = ecranXY([p.case[0] + 0.5, p.case[1] + 0.5]);
      expect([p.cle, r.x + s.anchor[0] * k, r.y + s.anchor[1] * k]).toEqual([
        p.cle,
        expect.closeTo(cx, 5),
        expect.closeTo(cy, 5),
      ]);
    }
  });
});

// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
function Scene({ c, set }: { c: number; set?: jest.Mock }) {
  const horloge = Reanimated.useSharedValue(c);
  if (set) horloge.set = set;
  const chat = ANIMAUX.find((a) => a.nom === "chat");
  assert(chat);
  return (
    <HorlogeContext.Provider value={horloge}>
      <Animal a={chat} />
    </HorlogeContext.Provider>
  );
}

const opacites = () =>
  POSES_ANIMAL.map((p) => {
    const vue = screen.getByTestId(`iso-animal-chat-${p}`).parent;
    assert(vue);
    return getAnimatedStyle(vue as never).opacity;
  });

describe("the animal view", () => {
  test("three images stacked, the rest one opaque whatever the clock says when no wave plans a life", async () => {
    for (const c of [3 * CYCLE_MS + 130, 3 * CYCLE_MS + 510, 3 * CYCLE_MS + 640]) {
      await render(<Scene c={c} />);
      expect(opacites()).toEqual([1, 0, 0]);
      await screen.unmount();
    }
  });

  test("is never a tap target and writes nothing to the clock", async () => {
    const set = jest.fn();
    await render(<Scene c={CYCLE_MS + 130} set={set} />);
    for (const p of POSES_ANIMAL) {
      const vue = screen.getByTestId(`iso-animal-chat-${p}`).parent;
      expect(vue?.props.pointerEvents).toBe("none");
    }
    expect(set).not.toHaveBeenCalled();
  });

  test("without a clock (reduced motion, unfocused) only the rest pose is mounted", async () => {
    const chat = ANIMAUX.find((a) => a.nom === "chat");
    assert(chat);
    await render(<Animal a={chat} />);
    expect(screen.queryAllByTestId(/^iso-animal-chat/).map((n) => n.props.testID)).toEqual([
      "iso-animal-chat",
    ]);
  });
});

describe("the animals on the map", () => {
  const sans = (code: string) => buildingCodes.filter((c) => c !== code);
  const montes = (visible: boolean[][], montres: readonly BuildingCode[]) =>
    render(<IsoCarte visible={visible} montres={montres} stade={() => "solid"} />).then(
      () =>
        new Set(
          screen.queryAllByTestId(/^iso-animal-/).map((n) => String(n.props.testID).split("-")[2]),
        ),
    );

  test("mount only the ones whose place is shown", async () => {
    expect(await montes(ileVisible(12, buildingCodes), sans("farm"))).toEqual(new Set(["chat"]));
    await screen.unmount();
    expect(await montes(etatCarte(1, false).visible, [])).toEqual(new Set());
  });
});
