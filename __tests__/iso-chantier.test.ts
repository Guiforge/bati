import { etatAvec } from "@/components/village/iso/carteDemo";
import {
  BOUFFEE_MS,
  bouffee,
  CHANTIER_MS,
  COUP_MS,
  COUPS,
  echafaudageDe,
  impact,
  OUVRIERS_MAX,
  ouvriersChantiers,
  pop,
  RETOUR_COUP_MS,
  uAuTemps as uA,
} from "@/components/village/iso/chantier";
import { emplacements } from "@/components/village/iso/isoLayout";
import { MAQUETTES } from "@/components/village/iso/maquettes";
import {
  type Carte,
  casesDuLieu,
  reposInitial,
  rolesPresents,
} from "@/components/village/iso/marcheurs";
import { buildingCodes } from "@/db/schema";

const { visible, montres } = etatAvec(12, [...buildingCodes]);
const carte: Carte = { visible, montres };
const roles = rolesPresents(montres);
const fins = reposInitial(roles, carte, 20000);

const touche = ([x, y]: readonly [number, number], code: (typeof buildingCodes)[number]) =>
  emplacements[code].cases.some(([cx, cy]) => Math.abs(cx - x) + Math.abs(cy - y) === 1);

describe("building site workers (L6-T02)", () => {
  test("2 or 3 per site, one role and one free cell each, beside the building", () => {
    for (const code of montres) {
      const o = ouvriersChantiers([code], carte, fins, 20000);
      const cases = Object.values(o);
      expect(cases.length).toBeLessThanOrEqual(OUVRIERS_MAX);
      if (cases.length === 0) continue;
      expect(new Set(cases.map((c) => c.join(","))).size).toBe(cases.length);
      const autres = Object.entries(fins)
        .filter(([r]) => !(r in o))
        .map(([, c]) => c.join(","));
      for (const c of cases) {
        expect(touche(c, code)).toBe(true);
        expect(autres).not.toContain(c.join(","));
      }
    }
    const nb = montres.map((c) => Object.keys(ouvriersChantiers([c], carte, fins, 20000)).length);
    expect(Math.max(...nb)).toBeGreaterThanOrEqual(2);
  });

  test("two sites never share a villager or a cell, and the day seeds the pick", () => {
    const deux = ouvriersChantiers(["forge", "well"], carte, fins, 20000);
    const cases = Object.values(deux).map((c) => c.join(","));
    expect(new Set(cases).size).toBe(cases.length);
    expect(ouvriersChantiers(["forge", "well"], carte, fins, 20000)).toEqual(deux);
  });

  test("the villagers take the front-most free cells, not those behind the scaffold (T02b-qa)", () => {
    const pris = new Set([...Object.values(fins)].map((c) => c.join(",")));
    for (const code of montres) {
      const o = ouvriersChantiers([code], carte, fins, 20000);
      const choisies = Object.values(o).map(([x, y]) => x + y);
      if (choisies.length === 0) continue;
      const { coin, emprise } = emplacements[code];
      const libres = casesDuLieu(code, carte)
        .filter(([x, y]) => x >= coin[0] + emprise[0] || y >= coin[1] + emprise[1])
        .filter(
          (c) =>
            !pris.has(c.join(",")) || Object.values(o).some((w) => w.join(",") === c.join(",")),
        )
        .map(([x, y]) => x + y)
        .sort((a, b) => b - a);
      expect(choisies.sort((a, b) => b - a)).toEqual(libres.slice(0, choisies.length));
    }
  });

  test("every villager strikes in front of the plot, never beside or behind it (T02b-qa tour 2)", () => {
    for (const code of montres) {
      const { coin, emprise } = emplacements[code];
      for (const [x, y] of Object.values(ouvriersChantiers([code], carte, fins, 20000)))
        expect(x >= coin[0] + emprise[0] || y >= coin[1] + emprise[1]).toBe(true);
    }
  });

  test("a scaffold exists in the index for every footprint", () => {
    for (const code of buildingCodes) expect(MAQUETTES[echafaudageDe(code)]).toBeDefined();
  });
});

describe("the strikes and the dust (T02b)", () => {
  // `uA` is the dust node's own timing (chantier.ts `uAuTemps`), read by Poussiere too.
  test("the dust's first puff is the first villager's first blow", () => {
    expect(uA(impact(0, 0))).toBe(0);
    expect(uA(impact(0, 1))).toBeCloseTo(1);
  });

  test("every villager's last blow lands inside the site", () => {
    expect(COUPS).toBeGreaterThanOrEqual(2);
    expect(impact(OUVRIERS_MAX - 1, COUPS - 1)).toBeLessThanOrEqual(CHANTIER_MS);
  });

  // The site unmounting cut the last return short and the villager snapped upright.
  test("every villager is upright again before the site ends, three blows each", () => {
    expect(COUPS).toBe(3);
    expect(impact(OUVRIERS_MAX - 1, COUPS - 1) + RETOUR_COUP_MS).toBeLessThanOrEqual(CHANTIER_MS);
  });

  test("a puff bursts at each blow of the first villager and is gone before the next", () => {
    for (let k = 0; k < COUPS; k++) {
      const t = impact(0, k);
      expect(bouffee(uA(t - 1)).opacite).toBe(0);
      expect(bouffee(uA(t + 1)).opacite).toBeGreaterThan(0.9);
      expect(bouffee(uA(t + BOUFFEE_MS + 1)).opacite).toBe(0);
    }
  });

  test("nothing shows before the first blow, and the last puff is over when the site ends", () => {
    for (let t = 0; t <= COUP_MS; t += 10) expect(bouffee(uA(t)).opacite).toBe(0);
    expect(bouffee(uA(CHANTIER_MS)).opacite).toBeLessThan(0.01);
  });

  test("a puff grows and rises as it fades", () => {
    const debut = bouffee(0.01);
    const fin = bouffee(0.7);
    expect(fin.echelle).toBeGreaterThan(debut.echelle);
    expect(fin.y).toBeLessThan(debut.y);
    expect(fin.opacite).toBeLessThan(debut.opacite);
  });
});

describe("the closing pop of dust (AUDIT-DA 36)", () => {
  test("hidden at both ends, visible and growing in between", () => {
    expect(pop(0).opacite).toBe(0);
    expect(pop(1).opacite).toBe(0);
    expect(pop(0.3).opacite).toBeGreaterThan(0.5);
    expect(pop(0.6).echelle).toBeGreaterThan(pop(0.3).echelle);
  });

  test("the dust settles: it ends on the ground, lower at each step (T37)", () => {
    const ys = [0.1, 0.3, 0.5, 0.7, 0.9].map((t) => pop(t).y);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThan(ys[i - 1] ?? 0);
    expect(pop(0.99).y).toBeCloseTo(0, 0);
  });
});
