// T31: the animals' lives. The machine (vieAnimaux.ts) plans behaviours by a seeded hash; these
// tests hold its rules: no forbidden transition, drawn frequencies near the weights, durations in
// their range and never repeated, determinism, a fixed rest pose, the walk the plan carries.
import assert from "node:assert/strict";
import {
  ANIMAUX,
  EMPRISES_ORDRE,
  elementsMontes,
  etatCarte,
  stadeDemo,
} from "@/components/village/iso/carteDemo";
import {
  type Carte,
  hasard,
  planifierAnimaux,
  planifierVague,
  rareLe,
  reposDuJour,
  viesSansMarche,
} from "@/components/village/iso/marcheurs";
import {
  type AnimalVie,
  type Comportement,
  DECALAGE_MAX_MS,
  FIN_MARGE_MS,
  graineJour,
  graineVie,
  planVie,
  poseRepos,
  poseVie,
  RARE_CHANCE,
  REPOS,
  rareDuJour,
  TOTAL_MS,
  tirer,
  VIES,
} from "@/components/village/iso/vieAnimaux";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const NOMS = Object.keys(VIES) as AnimalVie[];
const JOUR = 20_000;
const plan = (nom: AnimalVie, n: number, marche: boolean, rare = true, jour = JOUR) =>
  planVie(nom, hasard(graineVie(jour, n, nom)), { marche, rare });

/** The ids reachable from the behaviours that open a wave. */
function atteignables(table: readonly Comportement[]) {
  const vus = new Set(table.filter((c) => c.depart).map((c) => c.id));
  for (let k = 0; k < table.length; k++)
    for (const c of table) if (vus.has(c.id)) for (const s of c.suit) vus.add(s);
  return [...vus].sort();
}

describe("the behaviour tables", () => {
  test.each(NOMS)("%s: the graph is closed, has no self loop, and opens a wave", (nom) => {
    const table = VIES[nom];
    const ids = new Set(table.map((c) => c.id));
    expect(ids.size).toBe(table.length);
    expect(table.some((c) => c.depart)).toBe(true);
    expect(table.filter((c) => c.marche)).toHaveLength(1);
    expect(table.filter((c) => c.rare)).toHaveLength(1);
    for (const c of table) {
      expect(c.suit.every((s) => ids.has(s))).toBe(true);
      expect(c.suit).not.toContain(c.id);
      expect(c.duree[0]).toBeLessThan(c.duree[1]);
      expect(c.aPeindre).not.toBe("");
    }
    expect(atteignables(table)).toEqual([...ids].sort());
  });

  test("a cat that sleeps wakes and stretches before it walks", () => {
    const dort = VIES.chat.find((c) => c.id === "dort");
    expect(dort?.suit).not.toContain("marche");
    expect(dort?.suit).not.toContain("etire");
    const plans = Array.from({ length: 3000 }, (_, n) => plan("chat", n, false, false));
    const apresDort = plans.flatMap((etapes) =>
      etapes.filter((_, i) => etapes[i - 1]?.id === "dort").map((e) => e.id),
    );
    expect(apresDort.length).toBeGreaterThan(0);
    expect(apresDort.filter((id) => id !== "baille" && id !== "reveil")).toEqual([]);
  });
});

describe("the machine", () => {
  test("10 000 draws follow the weights, to 3 points", () => {
    const candidats = VIES.chat.filter((c) => ["leche", "dort", "marche", "chasse"].includes(c.id));
    const somme = candidats.reduce((s, c) => s + c.poids, 0);
    const h = hasard("frequences");
    const n = new Map<string, number>();
    for (let i = 0; i < 10000; i++) {
      const c = tirer(candidats, h());
      n.set(c?.id ?? "", (n.get(c?.id ?? "") ?? 0) + 1);
    }
    for (const c of candidats)
      expect(Math.abs((n.get(c.id) ?? 0) / 100 - (100 * c.poids) / somme)).toBeLessThan(3);
  });

  test.each(NOMS)(
    "%s: only allowed successors, durations in range, never twice the same",
    (nom) => {
      for (let n = 0; n < 1500; n++)
        for (const marche of [true, false]) {
          const etapes = plan(nom, n, marche);
          expect(VIES[nom].find((x) => x.id === etapes[0]?.id)?.depart).toBe(true);
          expect(etapes[0]?.t0).toBeLessThanOrEqual(DECALAGE_MAX_MS);
          etapes.slice(1).forEach((e, i) => {
            const avant = etapes[i];
            assert(avant);
            expect(VIES[nom].find((x) => x.id === avant.id)?.suit).toContain(e.id);
            expect(e.duree).not.toBe(avant.duree);
            expect(e.t0).toBe(avant.t0 + avant.duree);
          });
          for (const e of etapes) {
            const c = VIES[nom].find((x) => x.id === e.id);
            assert(c);
            expect(e.duree).toBeGreaterThanOrEqual(c.duree[0]);
            expect(e.duree).toBeLessThanOrEqual(c.duree[1]);
            // A behaviour always ends before the rest pose comes back.
            expect(e.t0 + e.duree).toBeLessThanOrEqual(TOTAL_MS - FIN_MARGE_MS);
          }
          expect(etapes.filter((e) => e.marche)).toHaveLength(marche ? 1 : 0);
        }
    },
  );

  test("the same day, wave and animal play the same life; another wave or day another", () => {
    expect(plan("chat", 7, true)).toEqual(plan("chat", 7, true));
    const vies = Array.from({ length: 40 }, (_, n) => JSON.stringify(plan("poule", n, false)));
    expect(new Set(vies).size).toBeGreaterThan(30);
    expect(plan("chat", 7, true, true, JOUR + 1)).not.toEqual(plan("chat", 7, true));
  });

  test("animals start at different offsets", () => {
    const debuts = NOMS.flatMap((nom) =>
      Array.from({ length: 30 }, (_, n) => plan(nom, n, false)[0]?.t0),
    );
    expect(new Set(debuts).size).toBeGreaterThan(30);
  });

  test("the rare day falls about one day in ten, and a rare behaviour only on one", () => {
    const jours = Array.from({ length: 10000 }, (_, d) => hasard(graineJour(d, "chat", "rare"))());
    const part = jours.filter(rareDuJour).length / 10000;
    expect(Math.abs(part - RARE_CHANCE)).toBeLessThan(0.03);
    const rares = (rare: boolean) =>
      NOMS.flatMap((nom) =>
        Array.from({ length: 400 }, (_, n) => plan(nom, n, false, rare)).flat(),
      ).filter((e) => VIES.chat.concat(VIES.poule).find((c) => c.id === e.id)?.rare);
    expect(rares(false)).toEqual([]);
    expect(rares(true).length).toBeGreaterThan(0);
  });

  test("a plan asked for the rare behaviour holds it, with or without a walk (reviews/T31)", () => {
    for (const nom of NOMS)
      for (const marche of [true, false])
        for (let n = 0; n < 300; n++) {
          const ids = plan(nom, n, marche, true).map((e) => e.id);
          expect([nom, marche, VIES[nom].some((c) => c.rare && ids.includes(c.id))]).toEqual([
            nom,
            marche,
            true,
          ]);
        }
  });

  test("a rare day plays each animal's rare act in one wave of the first five, no other day any", () => {
    for (const nom of NOMS)
      for (let jour = 0; jour < 400; jour++) {
        const vagues = Array.from({ length: 5 }, (_, rang) => rareLe(jour, nom, rang));
        const rare = rareDuJour(hasard(graineJour(jour, nom, "rare"))());
        expect(vagues.filter(Boolean)).toHaveLength(rare ? 1 : 0);
        expect(rareLe(jour, nom, 5)).toBe(false);
      }
  });

  test("the cat spends most of its time asleep", () => {
    const etapes = Array.from({ length: 400 }, (_, n) => plan("chat", n, false, false)).flat();
    const total = etapes.reduce((s, e) => s + e.duree, 0);
    const dort = etapes.filter((e) => e.id === "dort").reduce((s, e) => s + e.duree, 0);
    expect(dort / total).toBeGreaterThan(0.5);
  });
});

describe("the poses", () => {
  test("outside every step the animal holds its rest pose, inside it plays the step's images", () => {
    const etapes = plan("chat", 3, true);
    const e = etapes.find((x) => x.marche);
    assert(e);
    expect(poseVie(etapes, -1, 0)).toBe(0);
    expect(poseVie(etapes, TOTAL_MS + 5000, 0)).toBe(0);
    expect(poseVie([], 4000, 0)).toBe(0);
    expect(poseVie(etapes, e.t0, 0)).toBe(1);
    expect(poseVie(etapes, e.t0 + 125, 0)).toBe(2);
    expect(poseVie(etapes, e.t0 + 250, 0)).toBe(1);
  });

  test("the rest pose is one of the animal's own and the same all day", () => {
    for (const nom of NOMS) {
      const p = poseRepos(nom, hasard(graineJour(JOUR, nom, "repos"))());
      expect(REPOS[nom].poses).toContain(p);
      expect(reposDuJour(JOUR, nom)).toBe(p);
    }
    expect(poseRepos("inconnu", 0.5)).toBe(0);
  });
});

describe("in the wave plan", () => {
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
  const vagues = Array.from({ length: 80 }, (_, n) => n + 1).map((n) => {
    const vague = planifierVague(carte, {}, JOUR, n);
    const marche = planifierAnimaux(carte, vague, JOUR, n);
    return { n, marche, tous: [...marche, ...viesSansMarche(carte, marche, JOUR, n)] };
  });

  test("every animal has a life in every wave, and at most two really move at once", () => {
    for (const { marche, tous } of vagues) {
      expect(tous.map((b) => b.nom).sort()).toEqual(carte.animaux?.map((a) => a.nom).sort());
      for (const b of tous) expect(b.vie.length).toBeGreaterThan(0);
      for (let t = 0; t < TOTAL_MS; t += 100)
        expect(
          marche.filter((b) => b.vie.some((e) => e.marche && t >= e.t0 && t < e.t0 + e.duree))
            .length,
        ).toBeLessThanOrEqual(2);
    }
  });

  test("the walk's segments follow the plan's walking step", () => {
    for (const { marche } of vagues)
      for (const b of marche) {
        const e = b.vie.find((x) => x.marche);
        assert(e);
        const [attente, aller, arret, retour] = b.segments;
        expect(attente?.duree).toBe(e.t0);
        expect((retour?.t0 ?? 0) + (retour?.duree ?? 0)).toBeCloseTo(e.t0 + e.duree, 6);
        expect(aller?.etat).toBe("marcher");
        expect(arret?.duree).toBeGreaterThan(1000);
      }
  });

  test("two animals walk at different speeds, within 10 percent", () => {
    const pas = vagues.flatMap((v) => v.marche.map((b) => b.segments[1]?.duree ?? 0));
    expect(new Set(pas.map((d) => Math.round(d))).size).toBeGreaterThan(20);
    for (const d of pas) {
      expect(d).toBeGreaterThanOrEqual(1000 / (0.75 * 1.1) - 1e-6);
      expect(d).toBeLessThanOrEqual(1000 / (0.75 * 0.9) + 1e-6);
    }
  });
});
