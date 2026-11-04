// L5-T10 A: the small animals walk a short loop in a wave, with the villagers' plan (marcheurs.ts):
// a real free grass cell next to their place, a depth slot that suits it, and no cell shared with
// a villager at any instant.
import {
  ANIMAUX,
  EMPRISES_ORDRE,
  elementsMontes,
  etatCarte,
  stadeDemo,
} from "@/components/village/iso/carteDemo";
import { emplacements, sol } from "@/components/village/iso/isoLayout";
import {
  BETES_PAR_VAGUE,
  type Carte,
  planifierAnimaux,
  planifierVague,
  positionA,
  rangDeBeteValide,
  type Segment,
  sensEcranA,
} from "@/components/village/iso/marcheurs";

const JOUR = 20_000;
const VAGUES = Array.from({ length: 80 }, (_, n) => n + 1);

/** The map's `Carte` as IsoCarte builds it, at the full tier-12 village. */
function carteComplete(): Carte {
  const { visible, montres } = etatCarte(12, true);
  const m = elementsMontes(visible, montres, (code) => stadeDemo(code, 12));
  return {
    visible,
    montres,
    obstacles: ANIMAUX.map((a) => a.piece.case),
    occupees: [...m.figurines].map((f) => f.case),
    vues: m.indices.flatMap((i) => EMPRISES_ORDRE[i] ?? []),
    animaux: [...m.animaux].map((a) => ({ nom: a.nom, cellule: a.piece.case })),
  };
}

const cle = (gx: number, gy: number) => `${gx},${gy}`;
const cellePos = (segments: readonly Segment[], t: number) => {
  const p = positionA(segments, t);
  return cle(Math.floor(p.x), Math.floor(p.y));
};
const plots = new Set(
  Object.values(emplacements).flatMap((e) => e.cases.map(([x, y]) => cle(x, y))),
);

const TEMPS = Array.from({ length: 141 }, (_, i) => i * 100);
type Plan = {
  n: number;
  vague: ReturnType<typeof planifierVague>;
  betes: ReturnType<typeof planifierAnimaux>;
};

/** Every instant (every 100 ms) at which an animal shares a cell with a villager or another animal. */
function rencontresDe({ n, vague, betes }: Plan): string[] {
  const fixes = new Set(Object.values(vague.fins).map(([x, y]) => cle(x, y)));
  return betes.flatMap((b, i) => {
    const autres = [
      ...vague.marcheurs.map((m) => ({ nom: m.role, segments: m.segments })),
      ...betes.filter((_, j) => j !== i),
    ];
    return TEMPS.flatMap((t) => {
      const ici = cellePos(b.segments, t);
      return [
        ...(fixes.has(ici) ? [`${n} ${b.nom} ${t} on a resting villager`] : []),
        ...autres
          .filter((m) => cellePos(m.segments, t) === ici)
          .map((m) => `${n} ${b.nom} ${t} with ${m.nom}`),
      ];
    });
  });
}

describe("the small animals' walks (L5-T10)", () => {
  const carte = carteComplete();
  const plans = VAGUES.map((n) => {
    const vague = planifierVague(carte, {}, JOUR, n);
    return { n, vague, betes: planifierAnimaux(carte, vague, JOUR, n) };
  });

  test("the hen (the old cat left with LIFE) stands on the full map, and walks in most waves, never more", () => {
    expect(carte.animaux?.length).toBe(ANIMAUX.length);
    for (const { betes } of plans) expect(betes.length).toBeLessThanOrEqual(BETES_PAR_VAGUE);
    expect(plans.filter((p) => p.betes.length >= 1).length).toBeGreaterThan(VAGUES.length * 0.8);
    // It gets its turn over the waves.
    expect(new Set(plans.flatMap((p) => p.betes.map((b) => b.nom)))).toEqual(
      new Set(ANIMAUX.map((a) => a.nom)),
    );
  });

  test("each loop goes from the animal's place to a real free grass cell beside it, and back", () => {
    for (const { betes } of plans)
      for (const b of betes) {
        const home = ANIMAUX.find((a) => a.nom === b.nom)?.piece.case;
        const [aller, , retour] = [b.segments[1], b.segments[2], b.segments[3]];
        expect(b.segments[0]?.de).toEqual(home);
        expect(aller?.de).toEqual(home);
        expect(retour?.vers).toEqual(home);
        const but = aller?.vers;
        expect(but).toBeDefined();
        const [gx = 0, gy = 0] = but ?? [];
        const [hx = 0, hy = 0] = home ?? [];
        expect(Math.abs(gx - hx) + Math.abs(gy - hy)).toBe(1);
        expect([b.nom, sol[gy]?.[gx]]).toEqual([b.nom, "herbe"]);
        expect(carte.visible[gy]?.[gx]).toBe(true);
        expect(plots.has(cle(gx, gy))).toBe(false);
        expect(rangDeBeteValide(carte.vues ?? [], home ?? [0, 0], [gx, gy])).toBe(true);
        // Inside the wave's plan: the clock rests at 15 s at the earliest.
        const fin = (retour?.t0 ?? 0) + (retour?.duree ?? 0);
        expect(fin).toBeLessThan(14_000);
      }
  });

  test("T27: an animal ambles a cell in 1.2 to 1.5 s (0.75 cells a second, it was 1.1)", () => {
    const pas = plans.flatMap(({ betes }) =>
      betes.flatMap((b) => b.segments.filter((s) => s.etat === "marcher").map((s) => s.duree)),
    );
    expect(pas.length).toBeGreaterThan(0);
    for (const d of pas) {
      expect(d).toBeGreaterThanOrEqual(1000 / (0.75 * 1.1) - 1e-6);
      expect(d).toBeLessThanOrEqual(1000 / (0.75 * 0.9) + 1e-6);
    }
  });

  test("never on a cell a villager stands on or crosses in the same wave, at any instant", () => {
    expect(plans.flatMap(rencontresDe)).toEqual([]);
  });

  test("the same day and wave plan the same walks, another wave another", () => {
    const vague = planifierVague(carte, {}, JOUR, 7);
    expect(planifierAnimaux(carte, vague, JOUR, 7)).toEqual(
      planifierAnimaux(carte, vague, JOUR, 7),
    );
    const autres = VAGUES.map((n) => JSON.stringify(plans[n - 1]?.betes));
    expect(new Set(autres).size).toBeGreaterThan(10);
    // Another day changes them too.
    const jourSuivant = VAGUES.map((n) =>
      JSON.stringify(planifierAnimaux(carte, plans[n - 1]?.vague ?? vague, JOUR + 1, n)),
    );
    expect(jourSuivant).not.toEqual(autres);
  });

  test("with no animal on show (an ambiance that lets none walk) nothing is planned", () => {
    const vague = planifierVague(carte, {}, JOUR, 3);
    expect(planifierAnimaux({ ...carte, animaux: [] }, vague, JOUR, 3)).toEqual([]);
    expect(planifierAnimaux({ ...carte, animaux: undefined }, vague, JOUR, 3)).toEqual([]);
  });

  test("the depth slot rule: no slot among the mounted footprints, no loop", () => {
    expect(rangDeBeteValide([], [5, 6], [6, 6])).toBe(true);
    // The animal is not mounted among the footprints: no slot to judge by.
    expect(rangDeBeteValide([{ coin: [0, 0], emprise: [1, 1] }], [5, 6], [6, 6])).toBe(false);
    // A footprint behind the two cells but listed after the animal: the slot is wrong for the loop.
    const vues = [
      { coin: [5, 6], emprise: [1, 1] },
      { coin: [4, 6], emprise: [1, 1] },
    ] as const;
    expect(rangDeBeteValide(vues, [5, 6], [6, 6])).toBe(false);
  });

  test("it faces the way it last walked on screen, right before any walk", () => {
    const b = plans.flatMap((p) => p.betes)[0];
    expect(b).toBeDefined();
    const [aller, , retour] = [b?.segments[1], b?.segments[2], b?.segments[3]];
    const dx = (s?: Segment) => (s ? s.vers[0] - s.de[0] - (s.vers[1] - s.de[1]) : 0);
    expect(sensEcranA(b?.segments ?? [], 0)).toBe(1);
    expect(sensEcranA(b?.segments ?? [], (aller?.t0 ?? 0) + 10)).toBe(dx(aller) >= 0 ? 1 : -1);
    expect(sensEcranA(b?.segments ?? [], (retour?.t0 ?? 0) + 10)).toBe(dx(retour) >= 0 ? 1 : -1);
  });
});
