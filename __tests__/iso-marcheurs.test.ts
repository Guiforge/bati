import assert from "node:assert/strict";
import {
  ANIMAUX,
  EMPRISES_ORDRE,
  elementsMontes,
  etatCarte,
  FIGURINES,
  stadeDemo,
} from "@/components/village/iso/carteDemo";
import { CYCLE_MS, cibleVague, VAGUE_MIN_MS } from "@/components/village/iso/horloge";
import { type Case, emplacements, rempart, sol } from "@/components/village/iso/isoLayout";
import {
  AVANCE_MS,
  astar,
  type Carte,
  COUT_CHEMIN,
  COUT_HERBE,
  casesDuLieu,
  empriseSegment,
  grilleCouts,
  HORIZON_MS,
  indiceSegment,
  jourDe,
  LIEUX_COMMUNS,
  MARCHEURS_PAR_VAGUE,
  type Marcheur,
  orientation,
  orientationA,
  planifierVague,
  positionA,
  ROLE_DEF,
  ROLES,
  type Role,
  rangsMarcheurs,
  reposInitial,
  rolesPresents,
  type Segment,
  type Vague,
} from "@/components/village/iso/marcheurs";
import { derriere, type Emprise } from "@/components/village/iso/profondeur";
import type { BuildingCode } from "@/db/schema";
import type { VillageTier } from "@/db/village";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const cles = (cs: Iterable<Case>) => [...cs].map(([x, y]) => `${x},${y}`);
const cle1 = (c: Case) => `${c[0]},${c[1]}`;
const longueur = (s: { de: Case; vers: Case }) =>
  Math.abs(s.de[0] - s.vers[0]) + Math.abs(s.de[1] - s.vers[1]);

/** Islands to sweep: the whole village at four tiers, and the starters alone. */
const CARTES: [string, Carte][] = (
  [
    [3, true],
    [6, true],
    [9, true],
    [12, true],
    [6, false],
  ] as const
).map(([palier, tous]) => {
  const { visible, montres } = etatCarte(palier as VillageTier, tous);
  return [
    `tier ${palier}${tous ? "" : " starters"}`,
    {
      visible,
      montres,
      obstacles: ANIMAUX.map((a) => a.piece.case),
      occupees: FIGURINES.map((f) => f.case),
    },
  ];
});
const PLEINE: Carte = CARTES[3]?.[1] ?? { visible: [], montres: [] };

/** Waves chained the way the map does: each starts where the last one ended. */
function chaine(carte: Carte, jour: number, n: number): Vague[] {
  const vagues: Vague[] = [];
  let depart = {};
  for (let i = 0; i < n; i++) {
    const v = planifierVague(carte, depart, jour, i);
    vagues.push(v);
    depart = v.fins;
  }
  return vagues;
}

/** What a cell costs, from the layout alone. */
function coutAttendu(kind: string, gx: number, gy: number): number {
  const ferme =
    Object.values(emplacements).some((e) => e.cases.some(([x, y]) => x === gx && y === gy)) ||
    ANIMAUX.some((a) => a.piece.case[0] === gx && a.piece.case[1] === gy) ||
    // FIN-DIS: nobody walks through the wall, built or not.
    rempart.some(([x, y]) => x === gx && y === gy);
  if (ferme) return Infinity;
  if (kind === "chemin" || kind === "pont") return COUT_CHEMIN;
  return kind === "herbe" ? COUT_HERBE : Infinity;
}

describe("the cost grid", () => {
  test("a path costs 1, grass 3, and water, decor, footprints, obstacles and the sea are closed", () => {
    const couts = grilleCouts(PLEINE);
    const fautes = sol.flatMap((ligne, gy) =>
      ligne.flatMap((kind, gx) =>
        couts[gy]?.[gx] === coutAttendu(kind, gx, gy) ? [] : [`${gx},${gy} ${kind}`],
      ),
    );
    expect(fautes).toEqual([]);
    // A cell off the island is closed.
    const { visible, montres } = etatCarte(1, false);
    expect(visible[0]?.[0]).toBe(false);
    expect(grilleCouts({ visible, montres })[0]?.[0]).toBe(Infinity);
  });
});

describe("A*", () => {
  const ouvert = (w: number, h: number) => Array.from({ length: h }, () => Array(w).fill(1));

  test("the shortest route on an open grid, endpoints included, one step at a time", () => {
    const r = astar(ouvert(6, 5), [0, 0], [5, 4]);
    assert(r);
    expect(r).toHaveLength(1 + 5 + 4);
    expect(r[0]).toEqual([0, 0]);
    expect(r.at(-1)).toEqual([5, 4]);
    const pas = r.slice(1).map(([x, y], i) => {
      const [px = 0, py = 0] = r[i] ?? [];
      return Math.abs(x - px) + Math.abs(y - py);
    });
    expect(pas.every((p) => p === 1)).toBe(true);
    expect(astar(ouvert(3, 3), [1, 1], [1, 1])).toEqual([[1, 1]]);
  });

  test("it goes round what is closed, and gives up when there is no way", () => {
    const g = ouvert(5, 5);
    for (let y = 0; y < 4; y++) (g[y] as number[])[2] = Infinity;
    const r = astar(g, [0, 0], [4, 0]);
    assert(r);
    expect(cles(r)).not.toContain("2,0");
    expect(r).toContainEqual([2, 4]);
    (g[4] as number[])[2] = Infinity;
    expect(astar(g, [0, 0], [4, 0])).toBeNull();
    expect(astar(g, [0, 0], [2, 1])).toBeNull();
  });

  test("a longer path beats shorter grass", () => {
    // Row 0 is grass; row 1 is a path: down, across and up (6 steps, cost 6) beats 4 grass cells (12).
    const g = [Array(5).fill(COUT_HERBE), Array(5).fill(COUT_CHEMIN)];
    const r = astar(g, [0, 0], [4, 0]);
    assert(r);
    expect(r).toHaveLength(7);
    expect(r.filter(([, y]) => y === 1)).toHaveLength(5);
    // On the map: the farm to the well keeps to the street.
    const couts = grilleCouts(PLEINE);
    const route = astar(couts, [6, 7], [8, 14]);
    assert(route);
    expect(route.filter(([x, y]) => couts[y]?.[x] === COUT_HERBE).length).toBeLessThanOrEqual(1);
  });

  test("it is deterministic", () => {
    const couts = grilleCouts(PLEINE);
    expect(astar(couts, [8, 17], [15, 5])).not.toBeNull();
    expect(astar(couts, [8, 17], [15, 5])).toEqual(astar(couts, [8, 17], [15, 5]));
  });
});

describe("the places of interest", () => {
  test("every role has two places on the full island, each with path cells to stop on", () => {
    const vides = ROLES.flatMap((r) =>
      ROLE_DEF[r].lieux.filter((l) => casesDuLieu(l, PLEINE).length === 0).map((l) => `${r} ${l}`),
    );
    expect(vides).toEqual([]);
    expect(ROLES.map((r) => ROLE_DEF[r].lieux.length >= 2)).toEqual(ROLES.map(() => true));
    expect(ROLE_DEF.smith.lieux).toEqual(["forge", "armory"]);
    expect(ROLE_DEF.watcher.lieux).toEqual(["watchtower", "porte"]);
    expect(ROLE_DEF.champion.lieux).toEqual(["champion_arena", "heroes_hall"]);
  });

  test("only the roles whose building is built show", () => {
    expect(rolesPresents(["campfire", "tent"])).toEqual(["minstrel"]);
    expect(rolesPresents(["campfire", "forge", "watchtower"])).toEqual([
      "smith",
      "watcher",
      "minstrel",
    ]);
    expect(rolesPresents([])).toEqual([]);
    const { visible } = etatCarte(12, true);
    expect(planifierVague({ visible, montres: [] }, {}, 1, 0)).toEqual({
      numero: 0,
      marcheurs: [],
      fins: {},
    });
  });

  test("a stopping cell is a path cell on the island", () => {
    const fautes = CARTES.flatMap(([nom, carte]) =>
      rolesPresents(carte.montres).flatMap((r) =>
        ROLE_DEF[r].lieux.flatMap((l) =>
          casesDuLieu(l, carte)
            .filter(
              ([x, y]) => !["chemin", "pont"].includes(sol[y]?.[x] ?? "") || !carte.visible[y]?.[x],
            )
            .map((c) => `${nom} ${r} ${l} ${cle1(c)}`),
        ),
      ),
    );
    expect(fautes).toEqual([]);
  });
});

/** What is wrong with a walker's plan: continuity, straight runs, the wave's length, the speed. */
function fautesPlan(m: Marcheur): string[] {
  const fautes: string[] = [];
  const dernier = m.segments.at(-1);
  if (m.segments[0]?.t0 !== 0) fautes.push("does not start at 0");
  if (dernier?.etat !== "agir") fautes.push("does not end standing");
  if ((dernier?.t0 ?? 0) + (dernier?.duree ?? 0) > HORIZON_MS + 1e-6) fautes.push("past horizon");
  m.segments.forEach((s, i) => {
    const suite = m.segments[i + 1];
    if (suite && (Math.abs(suite.t0 - s.t0 - s.duree) > 1e-6 || cle1(suite.de) !== cle1(s.vers)))
      fautes.push(`gap after ${i}`);
    if (s.etat === "agir" && cle1(s.de) !== cle1(s.vers)) fautes.push(`stand ${i} moves`);
    if (s.etat === "marcher" && s.de[0] !== s.vers[0] && s.de[1] !== s.vers[1])
      fautes.push(`walk ${i} is not straight`);
    // A style's speed (0.9 to 2.1 cells a second) plus or minus 10 %.
    const v = (longueur(s) * 1000) / s.duree;
    if (s.etat === "marcher" && (v < 0.9 || v > 2.1 * 1.1 + 1e-9)) fautes.push(`speed ${v}`);
  });
  return fautes;
}

/** What is wrong with a wave's ends: roles, places, reservation. */
function fautesFin(nom: string, carte: Carte, v: Vague): string[] {
  const roles = rolesPresents(carte.montres);
  const fautes: string[] = [];
  const cellules = cles(Object.values(v.fins));
  if (new Set(cellules).size !== cellules.length) fautes.push(`${nom} two on one cell`);
  if (Object.keys(v.fins).sort().join() !== [...roles].sort().join()) fautes.push(`${nom} roles`);
  const figurines = cles(carte.occupees ?? []);
  for (const r of roles) {
    const fin = v.fins[r];
    const lieux = [...ROLE_DEF[r].lieux, ...LIEUX_COMMUNS].flatMap((l) =>
      cles(casesDuLieu(l, carte)),
    );
    if (!fin || !lieux.includes(cle1(fin))) fautes.push(`${nom} ${r} not in a place`);
    if (fin && figurines.includes(cle1(fin))) fautes.push(`${nom} ${r} on a figurine`);
  }
  for (const m of v.marcheurs)
    if (cle1(m.segments.at(-1)?.vers ?? [-1, -1]) !== cle1(v.fins[m.role] ?? [-2, -2]))
      fautes.push(`${nom} ${m.role} end differs`);
  return fautes;
}

/** How many times `role` ends a walk of these waves on a cell of the square or the fire. */
function finsCommunes(vagues: readonly Vague[], role: Role, carte: Carte): number {
  const communes = LIEUX_COMMUNS.flatMap((l) => cles(casesDuLieu(l, carte)));
  return vagues
    .flatMap((v) => v.marcheurs.filter((m) => m.role === role))
    .filter((m) => communes.includes(cle1(m.segments.at(-1)?.vers ?? [-1, -1]))).length;
}

describe("waves", () => {
  test("a seed per day and wave number: the same replay, a different wave from one to the next", () => {
    const a = planifierVague(PLEINE, {}, 20000, 3);
    expect(planifierVague(PLEINE, {}, 20000, 3)).toEqual(a);
    const autres = [0, 1, 2, 4, 5, 6].map((n) => planifierVague(PLEINE, {}, 20000, n));
    expect(autres.filter((v) => JSON.stringify(v) === JSON.stringify(a))).toEqual([]);
    expect(
      [1, 2, 3, 4].some(
        (j) => JSON.stringify(planifierVague(PLEINE, {}, 20000 + j, 3)) !== JSON.stringify(a),
      ),
    ).toBe(true);
    // Across waves the movers are not always the same villagers.
    const quiBouge = new Set(
      chaine(PLEINE, 20000, 12).flatMap((v) => v.marcheurs.map((m) => m.role)),
    );
    expect(quiBouge.size).toBeGreaterThanOrEqual(5);
  });

  test("the day is the hero's local day", () => {
    const midi = Date.UTC(2026, 9, 29, 12);
    expect(jourDe(midi, 0)).toBe(jourDe(midi + 3600000, 0));
    expect(jourDe(Date.UTC(2026, 9, 29, 23, 30), 0)).toBe(jourDe(Date.UTC(2026, 9, 29), 0));
    // 23:30 UTC is already the next day at UTC+2 (offset -120).
    expect(jourDe(Date.UTC(2026, 9, 29, 23, 30), -120)).toBe(jourDe(Date.UTC(2026, 9, 29), 0) + 1);
  });

  test("at most four walk; each plan is contiguous, straight, within the wave and at a style's speed", () => {
    const vagues = CARTES.flatMap(([nom, carte]) =>
      chaine(carte, 21000, 10).map((v) => [nom, v] as const),
    );
    expect(vagues.filter(([, v]) => v.marcheurs.length > MARCHEURS_PAR_VAGUE)).toEqual([]);
    expect(
      vagues.flatMap(([nom, v]) =>
        v.marcheurs.flatMap((m) => fautesPlan(m).map((f) => `${nom} ${m.role} ${f}`)),
      ),
    ).toEqual([]);
    expect(vagues.some(([, v]) => v.marcheurs.length === MARCHEURS_PAR_VAGUE)).toBe(true);
    // The plan fits the shortest wave, a second to spare.
    expect(HORIZON_MS).toBeLessThanOrEqual(VAGUE_MIN_MS - 1000);
  });

  test("the speed varies from walker to walker", () => {
    const vitesses = new Set(
      chaine(PLEINE, 22000, 12).flatMap((v) =>
        v.marcheurs.flatMap((m) =>
          m.segments
            .filter((s) => s.etat === "marcher")
            .map((s) => Math.round(((longueur(s) * 1000) / s.duree) * 100)),
        ),
      ),
    );
    expect(vitesses.size).toBeGreaterThan(5);
  });

  test("every role ends on a path cell of one of its places, and no two stand on the same cell", () => {
    const fautes = CARTES.flatMap(([nom, carte]) =>
      [21000, 21001].flatMap((jour) =>
        chaine(carte, jour, 12).flatMap((v) => fautesFin(nom, carte, v)),
      ),
    );
    expect(fautes).toEqual([]);
  });

  test("the reservation holds across waves, and the first placement is free of any other's cell", () => {
    const base = reposInitial(["minstrel", "sage", "smith"], PLEINE, 5);
    const posees = cles(Object.values(base));
    expect(new Set(posees).size).toBe(3);
    // A role placed later never lands on a cell already held.
    const plus = reposInitial(["minstrel", "sage", "smith", "farmer"], PLEINE, 5, base);
    expect(cles(Object.values(plus))).toEqual(expect.arrayContaining(posees));
    expect(new Set(cles(Object.values(plus))).size).toBe(4);
    expect(chaine(PLEINE, 5, 15).flatMap((v) => fautesFin("x", PLEINE, v))).toEqual([]);
  });

  test("a role with no second place of its own ends some walks at the square or the fire", () => {
    // Only the arena is built: the champion has nowhere of his own to go.
    const arene = { ...PLEINE, montres: ["campfire", "champion_arena"] as BuildingCode[] };
    const toutes = chaine(arene, 30000, 20);
    expect(finsCommunes(toutes, "champion", arene)).toBeGreaterThan(0);
  });

  test("a role with a single building still walks, to the square or the fire", () => {
    const { visible } = etatCarte(1, false);
    // The smith's armory is not built: the forge is his only place of his own.
    const montres: BuildingCode[] = ["campfire", "forge"];
    expect(
      finsCommunes(chaine({ visible, montres }, 1, 12), "smith", { visible, montres }),
    ).toBeGreaterThan(0);
  });

  test("a role with two places of its own ends 70 % of its walks in them, at tier 12", () => {
    const propres = (r: Role) => ROLE_DEF[r].lieux.flatMap((l) => cles(casesDuLieu(l, PLEINE)));
    const vagues = chaine(PLEINE, 31000, 40);
    // The minstrel's own places are the shared ones: nothing to measure.
    for (const role of ROLES.filter((r) => r !== "minstrel")) {
      const fins = vagues
        .flatMap((v) => v.marcheurs.filter((m) => m.role === role))
        .map((m) => m.segments.at(-1)?.vers ?? [-1, -1]);
      expect(fins.length).toBeGreaterThan(0);
      const siennes = fins.filter((c) => propres(role).includes(cle1(c as Case))).length;
      expect(`${role} ${siennes}/${fins.length}`).toMatch(/^/);
      if (siennes / fins.length < 0.7) throw new Error(`${role} ${siennes}/${fins.length}`);
    }
  });

  test("every wave moves 2 to 4 villagers, and not always the same, at tiers 3 and 12", () => {
    // Tier 3 as the hero sees it (three roles), and the full island.
    for (const [nom, carte, minRoles] of [
      ["tier 3", { ...etatCarte(3, false) }, 3],
      ["tier 12", PLEINE, 5],
    ] as const) {
      assert(carte);
      const vagues = [20000, 20001, 20002].map((jour) => chaine(carte, jour, 20));
      for (const suite of vagues) {
        expect(
          suite.map((v) => `${nom} ${v.marcheurs.length}`).filter((x) => !/ [234]$/.test(x)),
        ).toEqual([]);
        const roles = new Set(suite.flatMap((v) => v.marcheurs.map((m) => m.role)));
        expect(roles.size).toBeGreaterThanOrEqual(minRoles);
      }
    }
  });

  test("any three shown roles give 2 or 3 movers a wave, whichever buildings they come from", () => {
    const { visible } = etatCarte(12, true);
    const sets: BuildingCode[][] = [
      ["campfire", "forge", "farm"],
      ["campfire", "forge", "druid_grove"],
      ["campfire", "farm", "watchtower"],
      ["campfire", "forge", "armory", "watchtower"],
      ["campfire", "observatory", "champion_arena"],
    ];
    const fautes = sets.flatMap((montres) =>
      chaine({ visible, montres }, 20000, 12)
        .filter((v) => v.marcheurs.length < 2)
        .map((v) => `${montres} wave ${v.numero}`),
    );
    expect(fautes).toEqual([]);
  });
});

describe("the clock", () => {
  const vague = (() => {
    const v = chaine(PLEINE, 23000, 6).find((x) => x.marcheurs.length === MARCHEURS_PAR_VAGUE);
    assert(v);
    return v;
  })();

  test("the position is a function of the clock: still at the start, along the run", () => {
    const lus = vague.marcheurs.map((m) => {
      const debut = m.segments[0]?.de ?? [0, 0];
      const premiere = m.segments.find((s) => s.etat === "marcher");
      assert(premiere);
      const milieu = positionA(m.segments, premiere.t0 + premiere.duree / 2);
      return {
        debut: positionA(m.segments, 0),
        attenduDebut: { x: debut[0] + 0.5, y: debut[1] + 0.5, marche: false },
        milieu: [milieu.x, milieu.y, milieu.marche],
        attenduMilieu: [
          (premiere.de[0] + premiere.vers[0]) / 2 + 0.5,
          (premiere.de[1] + premiere.vers[1]) / 2 + 0.5,
          true,
        ],
      };
    });
    for (const l of lus) {
      expect(l.debut).toEqual(l.attenduDebut);
      expect(l.milieu).toEqual(l.attenduMilieu);
    }
  });

  test("at every cycle boundary the wave can end on, each walker is at rest on its final cell", () => {
    const lus = [0, CYCLE_MS, 7 * CYCLE_MS].flatMap((c0) => {
      // A wave started at a rest pose ends at cibleVague (horloge.ts) or any later boundary (a touch).
      const fin = cibleVague(c0);
      return [fin, fin + CYCLE_MS, fin + 3 * CYCLE_MS].flatMap((c) =>
        vague.marcheurs.map((m) => {
          const cible = vague.fins[m.role] ?? [-9, -9];
          return [
            (c - c0) % CYCLE_MS,
            positionA(m.segments, c - c0),
            { x: cible[0] + 0.5, y: cible[1] + 0.5, marche: false },
          ] as const;
        }),
      );
    });
    expect(lus.length).toBe(9 * vague.marcheurs.length);
    expect(
      lus.filter(
        ([reste, lu, attendu]) => reste !== 0 || JSON.stringify(lu) !== JSON.stringify(attendu),
      ),
    ).toEqual([]);
    expect(cibleVague(0)).toBeGreaterThanOrEqual(HORIZON_MS);
  });

  test("nothing walks outside a wave: no building, no walker; those that do not walk keep their cell", () => {
    expect(positionA([], 5000)).toEqual({ x: 0, y: 0, marche: false });
    const { visible } = etatCarte(12, true);
    expect(planifierVague({ visible, montres: [] }, {}, 1, 0).marcheurs).toEqual([]);
    const [v1, v2] = chaine(PLEINE, 23000, 2);
    assert(v1 && v2);
    const restes = ROLES.filter((r) => !v2.marcheurs.some((m) => m.role === r));
    expect(restes.map((r) => v2.fins[r])).toEqual(restes.map((r) => v1.fins[r]));
  });

  test("the segment index changes AVANCE_MS before a segment starts, and only forward", () => {
    const fautes = vague.marcheurs.flatMap((m) => {
      const lus = Array.from({ length: HORIZON_MS / 50 + 1 }, (_, i) =>
        indiceSegment(m.segments, i * 50),
      );
      const recule = lus.some((k, i) => i > 0 && k < (lus[i - 1] ?? 0));
      const tard = m.segments.flatMap((s, i) =>
        i > 0 && indiceSegment(m.segments, s.t0 - AVANCE_MS) < i ? [i] : [],
      );
      const tot = m.segments.flatMap((s, i) =>
        i > 0 && indiceSegment(m.segments, s.t0 - AVANCE_MS - 1) >= i ? [i] : [],
      );
      return [
        ...(recule ? ["goes back"] : []),
        ...tard.map((i) => `late ${i}`),
        ...tot.map((i) => `early ${i}`),
      ];
    });
    expect(fautes).toEqual([]);
  });

  test("the side it shows: back to the viewer going up the screen, mirrored by direction, kept while it stands", () => {
    expect(orientation({ de: [3, 3], vers: [6, 3] })).toEqual({ dos: false, miroir: false });
    expect(orientation({ de: [3, 3], vers: [3, 6] })).toEqual({ dos: false, miroir: true });
    expect(orientation({ de: [6, 3], vers: [3, 3] })).toEqual({ dos: false, miroir: true });
    expect(orientation({ de: [3, 6], vers: [3, 3] })).toEqual({ dos: false, miroir: false });
    const segs = [
      { etat: "agir", de: [1, 1], vers: [1, 1], t0: 0, duree: 100 },
      { etat: "marcher", de: [1, 1], vers: [1, 4], t0: 100, duree: 1000 },
      { etat: "agir", de: [1, 4], vers: [1, 4], t0: 1100, duree: 1000 },
    ] as const;
    expect(orientationA(segs, 0)).toEqual({ dos: false, miroir: false });
    expect(orientationA(segs, 2)).toEqual({ dos: false, miroir: true });
  });
});

/** The footprints a segment's walker is wrongly in front of, or behind, with its rank among `vues`. */
function fautesRang(qui: string, vues: readonly Emprise[], s: Segment): string[] {
  const w = empriseSegment(s);
  const rang = rangsMarcheurs(vues, [w])[0] ?? -1;
  return vues.flatMap((e, i) => {
    const quoi = `${qui} ${s.de}>${s.vers} ${JSON.stringify(e.coin)}`;
    return [
      ...(derriere(e, w) && i >= rang ? [`covers ${quoi}`] : []),
      ...(derriere(w, e) && i < rang ? [`is covered by ${quoi}`] : []),
    ];
  });
}

describe("depth order", () => {
  /** What IsoCarte mounts on an island (`elementsMontes`, the same function), in ORDRE_CARTE order. */
  const montres = (carte: Carte) =>
    elementsMontes(carte.visible, carte.montres, (c) => stadeDemo(c, 12)).indices.flatMap(
      (i) => EMPRISES_ORDRE[i] ?? [],
    );

  test("the walker's rank is after every footprint behind it and before every one it is behind, at every segment", () => {
    const fautes = CARTES.flatMap(([nom, carte]) => {
      const vues = montres(carte);
      return [24000, 24001, 24002].flatMap((jour) =>
        chaine({ ...carte, vues }, jour, 25).flatMap((v) =>
          v.marcheurs.flatMap((m) =>
            m.segments.flatMap((s) => fautesRang(`${nom} ${m.role}`, vues, s)),
          ),
        ),
      );
    });
    expect(fautes.slice(0, 5)).toEqual([]);
    const nombre = chaine({ ...PLEINE, vues: montres(PLEINE) }, 24000, 25).flatMap(
      (v) => v.marcheurs,
    );
    expect(nombre.flatMap((m) => m.segments).length).toBeGreaterThan(100);
  });

  test("a walker passing a building is hidden by it behind and covers it in front", () => {
    const { coin, emprise } = emplacements.forge;
    const iForge = EMPRISES_ORDRE.findIndex((e) => e.coin === coin);
    expect(iForge).toBeGreaterThanOrEqual(0);
    const devant = { coin: [coin[0], coin[1] + emprise[1]] as Case, emprise: [1, 1] as const };
    const derrierre = { coin: [coin[0], coin[1] - 1] as Case, emprise: [1, 1] as const };
    const [rd = -1, rb = -1] = [devant, derrierre].map(
      (w) => rangsMarcheurs(EMPRISES_ORDRE, [w])[0],
    );
    expect(rd).toBeGreaterThan(iForge);
    expect(rb).toBeLessThanOrEqual(iForge);
  });

  test("two walkers: the one behind the other comes first", () => {
    const loin = { coin: [10, 3] as Case, emprise: [1, 1] as const };
    const pres = { coin: [10, 12] as Case, emprise: [1, 1] as const };
    const [a = -1, b = -1] = rangsMarcheurs(EMPRISES_ORDRE, [pres, loin]);
    expect(a).toBeGreaterThanOrEqual(b);
  });

  test("a step with no rank is cut at the edge of its two cells, so each half has one", () => {
    // The sage's step (5,5) to (6,5) sits behind the hen (5,6) and in front of the grove, which
    // the order puts the other way: cut in two, each half stands in one cell.
    const coupes = CARTES.flatMap(([, carte]) => {
      const vues = montres(carte);
      return [24000, 24001, 24002].flatMap((jour) =>
        chaine({ ...carte, vues }, jour, 40)
          .flatMap((v) => v.marcheurs)
          .flatMap((m) => m.segments.filter((s) => longueur(s) === 0.5)),
      );
    });
    expect(coupes.length).toBeGreaterThan(0);
  });
});
