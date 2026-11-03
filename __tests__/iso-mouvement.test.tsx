import { render, screen } from "@testing-library/react-native";
import { makeMutable } from "react-native-reanimated";
import { HorlogeContext } from "@/components/village/iso/horloge";
import { MouvementBld } from "@/components/village/iso/MouvementBld";
import { MOUVEMENTS } from "@/components/village/iso/motion";
import { GENRES, KINDS } from "@/components/village/iso/motion/types";
import {
  allumage,
  dureeAllumage,
  effetsAuRang,
  MOUVEMENT_NOEUDS_MAX,
  mouvementDeVague,
  noeudsDe,
  ordreAllumage,
  phaseBouffee,
} from "@/components/village/iso/mouvement";
import { type Veille, VeilleContext } from "@/components/village/iso/veilleuses";
import { buildingCodes } from "@/db/schema";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
let mockReduit = false;
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduit }));

const forge = MOUVEMENTS.forge?.effets ?? [];
const windmill = MOUVEMENTS.windmill?.effets ?? [];

describe("the motion files", () => {
  test("every entry is a known kind with whole anchors and a valid count", () => {
    for (const [code, m] of Object.entries(MOUVEMENTS)) {
      expect(buildingCodes).toContain(code);
      for (const e of m.effets) {
        expect(KINDS).toContain(e.kind);
        expect(e.at).toHaveLength(2);
        expect(e.fromRank).toBeGreaterThanOrEqual(1);
        if (e.kind === "particules") {
          expect(GENRES).toContain(e.genre);
          expect([1, 2, 3]).toContain(e.nb);
        }
      }
    }
  });

  test("19 buildings have a file (archery_range and dragon_lair none), and one wave of them fits the node budget", () => {
    expect(Object.keys(MOUVEMENTS)).toHaveLength(19);
    for (const m of Object.values(MOUVEMENTS)) {
      expect(m.effets.reduce((s, e) => s + noeudsDe(e), 0)).toBeLessThanOrEqual(
        MOUVEMENT_NOEUDS_MAX,
      );
    }
  });
});

describe("what a rank shows", () => {
  test("the forge's fires come in with their ranks, at night", () => {
    const fires = (rank: number, nuit = true) =>
      effetsAuRang(forge, rank, 0, nuit).filter((e) => e.kind === "lueur").length;
    expect([fires(4), fires(5), fires(7), fires(10)]).toEqual([0, 1, 2, 3]);
    // The smoke is the day's too, the lights are not.
    expect(effetsAuRang(forge, 10, 0, false).map((e) => e.kind)).toEqual(["particules"]);
  });

  test("an upgrade's effect waits for its base (fromBase)", () => {
    const e = [
      { kind: "miroitement", at: [0, 0], fromRank: 3, fromBase: 10, nb: 1, rayon: 5 },
    ] as const;
    expect(effetsAuRang(e, 3, 9, true)).toHaveLength(0);
    expect(effetsAuRang(e, 3, 10, true)).toHaveLength(1);
  });
});

describe("windows at dusk", () => {
  test("every window has its own turn, the same all day, a different order another day", () => {
    const a = ordreAllumage(5, "windmill:100");
    expect([...a].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(ordreAllumage(5, "windmill:100")).toEqual(a);
    expect(
      [101, 102, 103, 104].some((j) => ordreAllumage(5, `windmill:${j}`).join() !== a.join()),
    ).toBe(true);
  });

  test("a window is dark before its turn, lit after it, and they come one by one", () => {
    expect(allumage(0, 0)).toBe(0);
    expect(allumage(0, 2)).toBe(0);
    expect(allumage(dureeAllumage(5), 4)).toBe(1);
    const t = 2000;
    const lits = [0, 1, 2, 3, 4].map((tour) => allumage(t, tour));
    expect(lits).toEqual([...lits].sort((x, y) => y - x));
    expect(lits[0]).toBe(1);
    expect(lits[4]).toBe(0);
  });
});

describe("the wave's pick", () => {
  const tous = ["forge", "windmill", "fountain", "barn", "well"] as const;

  test("only buildings with a file, never over the node budget, the same for the same wave", () => {
    for (let n = 0; n < 40; n++) {
      const s = mouvementDeVague(tous, 20000, n);
      expect([...s].every((c) => MOUVEMENTS[c])).toBe(true);
      const noeuds = [...s].reduce(
        (sum, c) => sum + (MOUVEMENTS[c]?.effets.reduce((x, e) => x + noeudsDe(e), 0) ?? 0),
        0,
      );
      expect(noeuds).toBeLessThanOrEqual(MOUVEMENT_NOEUDS_MAX);
      expect(mouvementDeVague(tous, 20000, n)).toEqual(s);
    }
  });

  test("the windmill (7 nodes of 8) never shares a wave with the forge (5)", () => {
    for (let n = 0; n < 40; n++) {
      const s = mouvementDeVague(tous, 20000, n);
      expect(s.has("windmill") && s.has("forge")).toBe(false);
    }
  });

  test("puffs of a plume start apart, inside the cycle", () => {
    const a = phaseBouffee(0, 2, 0.7, 0);
    const b = phaseBouffee(1, 2, 0.7, 0);
    expect(b - a).toBeGreaterThan(0.05);
    expect(a).toBeGreaterThanOrEqual(0.02);
    expect(b + 0.7).toBeLessThanOrEqual(1);
  });
});

describe("MouvementBld", () => {
  const horloge = makeMutable(0);
  const veille = (mouvement: Veille["mouvement"]): Veille => ({
    c0: 0,
    fenetres: new Set(),
    portes: {},
    mouvement,
  });
  const monte = async (code: "forge" | "windmill", rank: number, enVague: boolean, nuit = true) => {
    await render(
      <HorlogeContext.Provider value={horloge}>
        <VeilleContext.Provider value={veille(enVague ? new Set([code]) : new Set())}>
          <MouvementBld
            code={code}
            stade="mythic"
            rank={rank}
            base={0}
            nuit={nuit}
            px={(p) => [p[0] / 8, p[1] / 8]}
            k={1 / 8}
          />
        </VeilleContext.Provider>
      </HorlogeContext.Provider>,
    );
  };
  const noeuds = () => screen.queryAllByTestId(/^iso-(flamme|fenetres|fumee|reflets|banniere)-/);

  beforeEach(() => {
    mockReduit = false;
  });

  test("in the wave: one animated node per fire and per puff, and no still light left over", async () => {
    await monte("forge", 10, true);
    expect(noeuds()).toHaveLength(5);
    expect(screen.queryAllByTestId("batiment-lueur-fire")).toHaveLength(3);
  });

  test("out of the wave: the still lights only, no animated node", async () => {
    await monte("forge", 10, false);
    expect(noeuds()).toHaveLength(0);
    expect(screen.queryAllByTestId("batiment-lueur-fire")).toHaveLength(3);
  });

  test("reduced motion: still, even in the wave", async () => {
    mockReduit = true;
    await monte("windmill", 10, true);
    expect(noeuds()).toHaveLength(0);
    expect(screen.queryAllByTestId("batiment-lueur-fenetre")).toHaveLength(5);
  });

  test("by day the windows are out and the smoke stays", async () => {
    await monte("windmill", 10, true, false);
    expect(screen.queryAllByTestId("batiment-lueur-fenetre")).toHaveLength(0);
    expect(noeuds()).toHaveLength(2);
  });

  test("a rank below the fires shows nothing", async () => {
    await monte("forge", 4, true);
    expect(noeuds()).toHaveLength(0);
    expect(screen.queryAllByTestId("batiment-lueur-fire")).toHaveLength(0);
  });
});
