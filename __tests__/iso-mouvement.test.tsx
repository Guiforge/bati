import { render, screen } from "@testing-library/react-native";
import { makeMutable } from "react-native-reanimated";
import { CYCLE_MS, HorlogeContext } from "@/components/village/iso/horloge";
import { MouvementBld } from "@/components/village/iso/MouvementBld";
import { MOUVEMENTS } from "@/components/village/iso/motion";
import { GENRES, KINDS } from "@/components/village/iso/motion/types";
import {
  allumage,
  dephasage,
  dureeAllumage,
  effetsAuRang,
  MOUVEMENT_NOEUDS_MAX,
  mouvementDeVague,
  noeudsBld,
  phaseBouffee,
  respirationFlamme,
  souffleLueur,
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
      expect(noeudsBld(m.effets)).toBeLessThanOrEqual(MOUVEMENT_NOEUDS_MAX);
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
      const noeuds = [...s].reduce((sum, c) => sum + noeudsBld(MOUVEMENTS[c]?.effets ?? []), 0);
      expect(noeuds).toBeLessThanOrEqual(MOUVEMENT_NOEUDS_MAX);
      expect(mouvementDeVague(tous, 20000, n)).toEqual(s);
    }
  });

  test("a building's windows are one node: the windmill costs 3 (windows, two puffs), the campfire 2", () => {
    expect(noeudsBld(windmill)).toBe(3);
    expect(noeudsBld(MOUVEMENTS.campfire?.effets ?? [])).toBe(2);
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

  test("at night the windmill's five windows are one node, with its two puffs", async () => {
    await monte("windmill", 10, true);
    expect(noeuds()).toHaveLength(3);
    expect(screen.queryAllByTestId("iso-fenetres-windmill")).toHaveLength(1);
    expect(screen.queryAllByTestId("batiment-lueur-fenetre")).toHaveLength(5);
  });
});

describe("the painted flame (campfire)", () => {
  // MouvementBld draws only the entry of the stage it wears: one zone per stage, never two on one.
  const flammes = (MOUVEMENTS.campfire?.effets ?? []).flatMap((e) =>
    e.kind === "flamme" ? [e] : [],
  );

  test("one entry per stage, the pivot on the zone's bottom edge", () => {
    expect(flammes.map((e) => e.stade)).toEqual(["legendary", "mythic"]);
    for (const {
      zone: [x, y, w, h],
      pivot,
    } of flammes) {
      expect(pivot[1]).toBe(y + h);
      expect(pivot[0]).toBeGreaterThanOrEqual(x);
      expect(pivot[0]).toBeLessThanOrEqual(x + w);
    }
  });
});

describe("one rhythm no more", () => {
  test("a building's phase is stable, in [0, 1), and the village's buildings do not share one", () => {
    expect(dephasage("forge")).toBe(dephasage("forge"));
    const phases = Object.keys(MOUVEMENTS).map(dephasage);
    for (const p of phases) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
    expect(new Set(phases.map((p) => p.toFixed(2))).size).toBeGreaterThan(12);
  });

  test("a light is the still light (1) on every boundary whatever its phase, and dips to half", () => {
    for (const phase of [0, 0.3, 0.77]) {
      for (const k of [0, 1, 4]) expect(souffleLueur(k * CYCLE_MS, phase, 1)).toBeCloseTo(1, 9);
      for (const k of [0, 1, 4]) expect(souffleLueur(k * CYCLE_MS, phase, 2)).toBeCloseTo(1, 9);
      const bas = Math.min(
        ...Array.from({ length: 200 }, (_, i) => souffleLueur((i * CYCLE_MS) / 200, phase, 2)),
      );
      expect(bas).toBeLessThan(0.6);
      expect(bas).toBeGreaterThanOrEqual(0.5 - 1e-9);
    }
  });

  test("two buildings' lights are out of step mid-cycle", () => {
    const [a, b] = [0, 0.5];
    const ecart = Array.from({ length: 50 }, (_, i) => {
      const c = ((i + 0.5) * CYCLE_MS) / 50;
      return Math.abs(souffleLueur(c, a, 1) - souffleLueur(c, b, 1));
    });
    expect(Math.max(...ecart)).toBeGreaterThan(0.15);
  });

  test("the painted flame only grows, and is its still self on every boundary", () => {
    for (const phase of [0, 0.4]) {
      for (let i = 0; i <= 100; i++) {
        const r = respirationFlamme((i * CYCLE_MS) / 100, phase);
        expect(r.y).toBeGreaterThanOrEqual(1);
        expect(r.x).toBeGreaterThanOrEqual(1);
      }
      expect(respirationFlamme(0, phase)).toEqual({ y: 1, x: 1 });
      expect(respirationFlamme(CYCLE_MS, phase).y).toBeCloseTo(1, 9);
    }
  });
});
