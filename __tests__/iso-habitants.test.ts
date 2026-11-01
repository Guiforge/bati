import assert from "node:assert/strict";
import { ANIMAUX, etatCarte, FIGURINES } from "@/components/village/iso/carteDemo";
import { gesteJoie, poseA } from "@/components/village/iso/gestes";
import {
  feteDue,
  indiceReplique,
  METIER_DE_PRATIQUE,
  MOMENT_REPLIQUE,
  metierFavori,
  nombreHabitants,
  placerHabitants,
  prendreFete,
  rassembler,
  TOUCHE_H,
  TOUCHE_L,
  villageoisAuPoint,
} from "@/components/village/iso/habitants";
import type { Case } from "@/components/village/iso/isoLayout";
import { sol } from "@/components/village/iso/isoLayout";
import {
  type Carte,
  casesDuLieu,
  FAVEUR_METIER,
  HORIZON_MS,
  MARCHEURS_PAR_VAGUE,
  planifierVague,
  ROLES,
  type Role,
  reposInitial,
  rolesPresents,
  type Vague,
} from "@/components/village/iso/marcheurs";
import { PRACTICES } from "@/db/crestRules";
import type { VillageTier } from "@/db/village";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const PALIERS: readonly VillageTier[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const cle = (c: Case) => `${c[0]},${c[1]}`;
const carteDe = (palier: VillageTier, tous: boolean): Carte => {
  const { visible, montres } = etatCarte(palier, tous);
  return {
    visible,
    montres,
    obstacles: ANIMAUX.map((a) => a.piece.case),
    occupees: FIGURINES.map((f) => f.case),
  };
};

describe("the inhabitants, by tier (T26)", () => {
  test("three at tier 1, twelve at tier 12, never fewer as the village grows", () => {
    expect(nombreHabitants(1)).toBe(3);
    expect(nombreHabitants(12)).toBe(12);
    const n = PALIERS.map(nombreHabitants);
    expect(n).toEqual(n.toSorted((a, b) => a - b));
    expect(new Set(n).size).toBeGreaterThan(8);
  });

  test("the map holds exactly that many at every tier, whether the buildings stand or only the starters", () => {
    for (const tous of [false, true])
      for (const palier of PALIERS) {
        const h = placerHabitants(palier, carteDe(palier, tous), 20000);
        expect([palier, tous, h.length]).toEqual([palier, tous, nombreHabitants(palier)]);
      }
  });

  test("each stands alone on a path cell of the island, never on a figurine, an animal or a trade's place", () => {
    for (const palier of PALIERS) {
      const carte = carteDe(palier, true);
      const h = placerHabitants(palier, carte, 20001);
      const fermees = new Set([...(carte.occupees ?? []), ...(carte.obstacles ?? [])].map(cle));
      expect(new Set(h.map((x) => cle(x.cellule))).size).toBe(h.length);
      for (const x of h) {
        expect(fermees.has(cle(x.cellule))).toBe(false);
        expect(carte.visible[x.cellule[1]]?.[x.cellule[0]]).toBe(true);
        expect(["chemin", "pont"]).toContain(sol[x.cellule[1]]?.[x.cellule[0]]);
        expect(ROLES).toContain(x.role);
      }
    }
  });

  test("they stand at readable places: the square, the gate, or in front of a door", () => {
    const carte = carteDe(12, true);
    const lisibles = new Set(
      [
        ...casesDuLieu("place", carte),
        ...casesDuLieu("porte", carte),
        ...carte.montres.flatMap((c) => casesDuLieu(c, carte)),
      ].map(cle),
    );
    for (const x of placerHabitants(12, carte, 20002))
      expect(lisibles.has(cle(x.cellule))).toBe(true);
  });

  test("the same day places them the same way, another day differently", () => {
    const carte = carteDe(12, true);
    const a = placerHabitants(12, carte, 20000);
    expect(placerHabitants(12, carte, 20000)).toEqual(a);
    const jours = [20001, 20002, 20003].map((j) => placerHabitants(12, carte, j));
    expect(jours.some((h) => JSON.stringify(h) !== JSON.stringify(a))).toBe(true);
  });

  test("no trade ever rests on an inhabitant's cell once they are in the map's closed cells", () => {
    const base = carteDe(12, true);
    const habitants = placerHabitants(12, base, 20000);
    const carte: Carte = {
      ...base,
      occupees: [...(base.occupees ?? []), ...habitants.map((h) => h.cellule)],
    };
    const repos = reposInitial(rolesPresents(carte.montres), carte, 20000);
    const prises = new Set(habitants.map((h) => cle(h.cellule)));
    for (const c of Object.values(repos)) expect(prises.has(cle(c))).toBe(false);
  });
});

describe("the party after a session (T26)", () => {
  const carte = carteDe(12, true);
  const depart = reposInitial(rolesPresents(carte.montres), carte, 20000);
  const vague = (numero: number, fete: boolean): Vague =>
    planifierVague(carte, depart, 20000, numero, { fete });

  test("the party plays once per session key", () => {
    expect(feteDue("seance-1", undefined)).toBe(true);
    expect(feteDue("seance-1", "seance-1")).toBe(false);
    expect(feteDue("seance-2", "seance-1")).toBe(true);
    expect(feteDue(undefined, "seance-1")).toBe(false);
    expect(feteDue("", undefined)).toBe(false);
  });

  test("in a party wave the walkers end on the square and cheer there until the wave is over", () => {
    const place = new Set(casesDuLieu("place", carte).map(cle));
    let vus = 0;
    for (let n = 0; n < 12; n++) {
      const v = vague(n, true);
      expect(v.marcheurs.length).toBeLessThanOrEqual(MARCHEURS_PAR_VAGUE);
      for (const m of v.marcheurs) {
        const dernier = m.segments.at(-1);
        assert(dernier);
        expect([m.role, dernier.joie, dernier.travail]).toEqual([m.role, true, true]);
        expect(place.has(cle(dernier.vers))).toBe(true);
        expect(dernier.t0 + dernier.duree).toBe(HORIZON_MS);
        // Joy is a hop: the pose is up in the middle of the stop.
        const mi = dernier.t0 + dernier.duree / 2;
        expect(poseA(m.role, m.segments, mi).leve).toBeGreaterThanOrEqual(0);
        vus++;
      }
    }
    expect(vus).toBeGreaterThan(10);
  });

  test("an ordinary wave has no joy in it", () => {
    for (let n = 0; n < 12; n++)
      for (const m of vague(n, false).marcheurs) expect(m.segments.some((s) => s.joie)).toBe(false);
  });

  test("the joy gesture is still at both ends of the stop and lifts in between", () => {
    expect(gesteJoie(0, 5000)).toEqual({ leve: 0, penche: 0, ecrase: 0 });
    expect(gesteJoie(5000, 5000)).toEqual({ leve: 0, penche: 0, ecrase: 0 });
    const lifts = [1000, 1100, 1200, 1300, 1400].map((t) => gesteJoie(t, 5000).leve);
    expect(Math.max(...lifts)).toBeGreaterThan(3);
  });

  test("reduced motion: everyone is set on the square, none twice, the others stay where they are", () => {
    const habitants = placerHabitants(12, carte, 20000);
    const gens = [
      ...ROLES.map((r) => ({ id: r, cellule: depart[r] ?? ([0, 0] as Case) })),
      ...habitants.map((h) => ({ id: h.id, cellule: h.cellule })),
    ];
    const pose = rassembler(gens, carte);
    const place = new Set(casesDuLieu("place", carte).map(cle));
    const surPlace = Object.entries(pose).filter(([, c]) => place.has(cle(c)));
    expect(new Set(surPlace.map(([, c]) => cle(c))).size).toBe(surPlace.length);
    expect(surPlace.length).toBeGreaterThan(8);
    // Whoever was already on the square keeps its cell.
    const dejaLa = gens.filter((g) => place.has(cle(g.cellule)));
    expect(dejaLa.map((g) => pose[g.id])).toEqual(dejaLa.map((g) => g.cellule));
  });
});

describe("the dominant practice (T26)", () => {
  test("each practice has a trade; the boar and no animal have none", () => {
    expect(metierFavori("bear")).toBe("smith");
    expect(metierFavori("stag")).toBe("watcher");
    expect(metierFavori("ermine")).toBe("champion");
    expect(metierFavori("salmon")).toBe("herbalist");
    expect(metierFavori("horse")).toBe("farmer");
    expect(metierFavori("boar")).toBeUndefined();
    expect(metierFavori(undefined)).toBeUndefined();
    expect(Object.keys(METIER_DE_PRATIQUE).toSorted()).toEqual([...PRACTICES].toSorted());
  });

  test("the favourite trade walks in clearly more waves than the others, and the draw stays seeded", () => {
    const carte = carteDe(12, true);
    const depart = reposInitial(rolesPresents(carte.montres), carte, 20000);
    const parts = (favori?: Role) => {
      const n = Object.fromEntries(ROLES.map((r) => [r, 0])) as Record<Role, number>;
      for (let w = 0; w < 120; w++)
        for (const m of planifierVague(carte, depart, 20000, w, { favori }).marcheurs) n[m.role]++;
      return n;
    };
    expect(FAVEUR_METIER).toBeLessThan(1);
    const sans = parts();
    for (const favori of ["smith", "watcher"] as const) {
      const avec = parts(favori);
      expect(avec[favori]).toBeGreaterThan(sans[favori] * 1.15);
      expect(parts(favori)).toEqual(avec);
    }
  });
});

describe("a touch on a villager (T26)", () => {
  const cibles = [
    { id: "smith", role: "smith", habitant: false, pied: [100, 200], l: TOUCHE_L, h: TOUCHE_H },
    { id: "h1", role: "sage", habitant: true, pied: [105, 215], l: TOUCHE_L, h: TOUCHE_H },
  ] as const;

  test("the body is hit, the empty air around it is not", () => {
    expect(villageoisAuPoint([90, 180], cibles)?.id).toBe("smith");
    expect(villageoisAuPoint([130, 180], cibles)).toBeNull();
    expect(villageoisAuPoint([90, 200 - TOUCHE_H - 2], cibles)).toBeNull();
    expect(villageoisAuPoint([100, 240], cibles)).toBeNull();
  });

  test("where two overlap, the one in front (feet lower on the screen) wins", () => {
    expect(villageoisAuPoint([102, 195], cibles)?.id).toBe("h1");
  });

  test("every trade speaks from a pool that exists, and the line is the same all day", () => {
    for (const r of ROLES)
      expect(["rest", "menu_visit", "boss_defeated"]).toContain(MOMENT_REPLIQUE[r]);
    expect(indiceReplique(12, 20000, "h3")).toBe(indiceReplique(12, 20000, "h3"));
    expect(indiceReplique(0, 20000, "h3")).toBe(-1);
    const lignes = new Set(
      [20000, 20001, 20002, 20003, 20004].map((j) => indiceReplique(12, j, "h3")),
    );
    expect(lignes.size).toBeGreaterThan(1);
  });
});

describe("the party key survives a remount (T26)", () => {
  test("a key still in the tab params is handed once; a remount with it gets none, a new one does", () => {
    expect(prendreFete("remontage-1")).toBe("remontage-1");
    expect(prendreFete("remontage-1")).toBeUndefined();
    expect(prendreFete(undefined)).toBeUndefined();
    expect(prendreFete("remontage-2")).toBe("remontage-2");
  });
});
