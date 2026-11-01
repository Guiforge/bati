// L5-T03: the attach-point index the app reads (constants/isoAccroches.json) is the blockouts'
// .anchor.json exports, kept and regenerated here (the app never reads scripts/); and the drawn
// fire's geometry and clock are pure functions with a rest pose on every cycle boundary.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { etatAvec, spriteDe, stadeReel } from "@/components/village/iso/carteDemo";
import {
  accrochesDe,
  entreeIndex,
  FLAMME_MIN_DP,
  FUMEE_MONTEE,
  FUMEE_OPACITE,
  flamme,
  fumee,
  geometrieFlamme,
  hauteurFlamme,
  MOUVEMENT_FUMEE,
  PX_PAR_HAUTEUR,
  plume,
  sommet,
  sourceFumee,
  variante,
} from "@/components/village/iso/feux";
import { CYCLE_MS } from "@/components/village/iso/horloge";
import { emplacements } from "@/components/village/iso/isoLayout";
import type { PointsAccroche, Stade } from "@/components/village/iso/isoSpec";
import { buildingStage } from "@/constants/buildingLevels";
import spec from "@/constants/isoSpec.json";
import { rawColors } from "@/constants/rawColors";
import { type BuildingCode, buildingCodes } from "@/db/schema";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const RENDERS = join(__dirname, "../scripts/iso/blockouts/renders");
const INDEX = join(__dirname, "../constants/isoAccroches.json");

/** The index, as the blockouts' exports give it: every `<code>_<stade>.anchor.json` with a point. */
function depuisExports() {
  const stades: Record<string, ReturnType<typeof entreeIndex>> = {};
  for (const f of readdirSync(RENDERS).sort()) {
    const m = /^(.+)_(rough|solid|grand)\.anchor\.json$/.exec(f);
    if (!m) continue;
    const d = JSON.parse(readFileSync(join(RENDERS, f), "utf8"));
    const p = d.pointsAccroche as PointsAccroche | undefined;
    if (!p)
      throw new Error(
        `${f}: no pointsAccroche (re-export it with scripts/iso/exports/accroches.py)`,
      );
    const e = entreeIndex(p, d.size);
    if (e.foyer || e.cheminee || e.porte || e.fenetres.length > 0) stades[`${m[1]}_${m[2]}`] = e;
  }
  return stades;
}

describe("constants/isoAccroches.json", () => {
  test("is what the blockouts' .anchor.json export", () => {
    const attendu = depuisExports();
    const commande = "UPDATE_ACCROCHES=1 npx jest iso-accroches";
    if (process.env.UPDATE_ACCROCHES === "1") {
      const _doc = `The attach points of each painted stage that has some, in sprite px (origin top left): foyer (flame base, half-width, height z in grid units), cheminee, fenetres, porte. Generated from scripts/iso/blockouts/renders/*.anchor.json: ${commande}. The app reads this, never scripts/ (L5-T03).`;
      writeFileSync(INDEX, `${JSON.stringify({ _doc, stades: attendu }, null, 1)}\n`);
    }
    const ecrit: unknown = JSON.parse(readFileSync(INDEX, "utf8")).stades;
    expect({ commande, stades: ecrit }).toEqual({ commande, stades: attendu });
  });

  test("names real stages; foyer and cheminee are where the blockouts built them", () => {
    const cles = Object.keys(depuisExports());
    expect(cles.length).toBeGreaterThanOrEqual(35);
    for (const c of cles) {
      const [code, stade] = [c.slice(0, c.lastIndexOf("_")), c.slice(c.lastIndexOf("_") + 1)];
      expect(buildingCodes as readonly string[]).toContain(code);
      expect(["rough", "solid", "grand"]).toContain(stade);
    }
    expect(accrochesDe("forge", "solid")?.foyer?.demiLargeur).toBeCloseTo(52.8, 6);
    expect(accrochesDe("forge", "solid")?.cheminee).toEqual([438.4, 541.514]);
    expect(accrochesDe("campfire", "rough")?.cheminee).toBeNull();
    expect(accrochesDe("campfire", "rough")?.foyer).not.toBeNull();
    expect(accrochesDe("tent", "rough")?.foyer).toBeNull();
  });

  test("a hearth's height above the ground is the projection of its z", () => {
    // forge solid: foyer grid z 0.49 sits at px y 984.78; the ground below is at 984.78 + z * k.
    expect(PX_PAR_HAUTEUR).toBeCloseTo((spec.pxPerUnit * Math.sqrt(3)) / 2, 1);
    expect(0.49 * PX_PAR_HAUTEUR).toBeCloseTo(115.2, 0);
  });
});

describe("the drawn fire's clock", () => {
  test("flame and smoke are at their rest pose on every cycle boundary", () => {
    for (const k of [0, 1, 7])
      for (const n of [0, 1, 2]) {
        const f = flamme(k * CYCLE_MS, n);
        expect(f.echelle).toBeCloseTo(1, 9);
        expect(f.opacite).toBeCloseTo(1, 9);
      }
    // the rest pose is the same one whatever the cycle, and no smoke shows in it (AUDIT-DA 6)
    for (const code of buildingCodes)
      for (const { phase, sorte, fois, force } of plume(code)) {
        expect(fumee(3 * CYCLE_MS, phase, sorte, fois, force)).toEqual(
          fumee(0, phase, sorte, fois, force),
        );
        expect(fumee(0, phase, sorte, fois, force).opacite).toBe(0);
        expect(fumee(CYCLE_MS - 1e-6, phase, sorte, fois, force).opacite).toBeCloseTo(0, 3);
      }
  });

  test("T41: neighbouring smokes never start or peak together, and climb slowly; same seed, same sky", () => {
    // The buildings that smoke: a chimney on some stage, or the campfire.
    const fument = buildingCodes.filter(
      (code) =>
        code === "campfire" ||
        (["rough", "solid", "grand"] as const).some((st) => accrochesDe(code, st)?.cheminee),
    );
    expect(fument.length).toBeGreaterThan(4);
    const fumees = fument.flatMap((code) => plume(code));
    // Start of the first climb in ms of the cycle, and the period of one.
    const depart = (f: (typeof fumees)[number]) => (f.phase * CYCLE_MS) / f.fois;
    for (const code of fument) {
      const [a, b] = plume(code);
      expect(a.sorte).not.toBe(b.sorte);
      expect(depart(a)).not.toBeCloseTo(depart(b), 0);
      expect(plume(code)).toEqual(plume(code));
    }
    // The village at tier 12 (every smoking building stands): sample the cycle every 50 ms and
    // count the puffs at their peak (over 80 % of the most opaque) at the same instant.
    const pic = 0.8 * FUMEE_OPACITE;
    let pire = 0;
    for (let t = 0; t < CYCLE_MS; t += 50) {
      const ensemble = fumees.filter(
        (f) => fumee(t, f.phase, f.sorte, f.fois, f.force).opacite > pic,
      );
      pire = Math.max(pire, ensemble.length);
    }
    expect(pire).toBeLessThanOrEqual(2);
    // Two neighbouring plumes (footprints a cell apart at most) never peak in the same 200 ms.
    // The pale trails (force under 1) never reach the peak: only the full puffs count.
    const sommets = (code: BuildingCode) =>
      plume(code)
        .filter((f) => f.force === 1)
        .map((f) => sommet(f) * CYCLE_MS);
    const proches = (
      [x, y]: readonly [number, number],
      cases: readonly (readonly [number, number])[],
    ) => cases.some(([u, v]) => Math.max(Math.abs(u - x), Math.abs(v - y)) <= 2);
    const voisins = fument.flatMap((a, i) =>
      fument
        .slice(i + 1)
        .filter((b) => emplacements[a].cases.some((c) => proches(c, emplacements[b].cases)))
        .map((b) => [a, b] as const),
    );
    expect(voisins.length).toBeGreaterThan(0);
    const ecarts = voisins.flatMap(([a, b]) =>
      sommets(a).flatMap((ta) =>
        sommets(b).map((tb) => {
          const d = Math.abs(ta - tb);
          return Math.min(d, CYCLE_MS - d);
        }),
      ),
    );
    expect(Math.min(...ecarts)).toBeGreaterThanOrEqual(200);
    // Slow: every climb lasts 2.5 to 3.5 s.
    for (const f of fumees) {
      const secondes = (MOUVEMENT_FUMEE[f.sorte].duree * CYCLE_MS) / f.fois / 1000;
      expect(secondes).toBeGreaterThanOrEqual(2.5);
      expect(secondes).toBeLessThanOrEqual(4);
    }
    console.info(
      `worst simultaneous peaks: ${pire}, closest neighbour peaks: ${Math.min(...ecarts)} ms`,
    );
    // At least three kinds are drawn, and each plays inside its sub-cycle.
    expect(new Set(fumees.map((f) => f.sorte)).size).toBe(3);
    for (const f of fumees) expect(f.phase + MOUVEMENT_FUMEE[f.sorte].duree).toBeLessThan(1);
  });

  test("the flame breathes inside its cycle, and stays lit and bounded", () => {
    let min = 9;
    let max = 0;
    for (let t = 0; t < CYCLE_MS; t += 25) {
      const f = flamme(t, 1);
      min = Math.min(min, f.echelle);
      max = Math.max(max, f.echelle);
      expect(f.opacite).toBeGreaterThanOrEqual(0.8 - 1e-9);
      expect(f.opacite).toBeLessThanOrEqual(1 + 1e-9);
    }
    expect(max - min).toBeGreaterThan(0.15);
    expect(min).toBeGreaterThan(0.8);
    expect(flamme(CYCLE_MS / 40, 0)).not.toEqual(flamme(CYCLE_MS / 40, 2));
  });

  test("T27: a night fire sways slowly, its fastest beat under 3 a second", () => {
    // Count the main sine's peaks over one cycle: 6 + n beats in 5 s (it was 20 + n, about 4 a second).
    for (const n of [0, 1, 2]) {
      const h = (t: number) => flamme(t, n).echelle;
      let pics = 0;
      for (let t = 10; t < CYCLE_MS; t += 10) if (h(t) > h(t - 10) && h(t) >= h(t + 10)) pics++;
      expect(pics / (CYCLE_MS / 1000)).toBeLessThan(3);
    }
  });

  test("a puff rises, fades out at the top and in at the bottom, and loops without a seam", () => {
    const debut = fumee(0, 0);
    expect(debut.y).toBeCloseTo(0, 9);
    expect(debut.opacite).toBeCloseTo(0, 9);
    const haut = fumee(CYCLE_MS * 0.35, 0);
    expect(haut.y).toBeCloseTo(-FUMEE_MONTEE / 2, 9);
    expect(haut.opacite).toBeGreaterThan(0.5);
    expect(fumee(CYCLE_MS - 1e-6, 0).opacite).toBeCloseTo(0, 3);
    expect(fumee(CYCLE_MS, 0)).toEqual(fumee(0, 0));
  });

  test("two fires do not breathe in step", () => {
    expect(
      new Set(["campfire", "forge", "armory", "champion_arena", "dragon_lair"].map(variante)).size,
    ).toBeGreaterThan(1);
  });
});

describe("geometry", () => {
  test("the flame follows its hearth, with a floor, and the glow lies on the ground under it", () => {
    const k = 0.125;
    const foyer = { px: [644.8, 984.78], z: 0.49, demiLargeur: 52.8 } as const;
    const g = geometrieFlamme(foyer, k);
    const unite = hauteurFlamme(52.8, k) / 170;
    expect(g.left + g.w / 2).toBeCloseTo(644.8 * k, 6);
    // the glow's centre is below the flame's base by the hearth's height
    expect(((g.sol - g.origine / unite) * unite) / k).toBeCloseTo(0.49 * PX_PAR_HAUTEUR, 0);
    expect(g.top + g.origine).toBeCloseTo(984.78 * k, 6);
    expect(g.h).toBeCloseTo(g.hu * unite, 9);
    // taller with the hearth, never under the floor
    expect(hauteurFlamme(89.28, k)).toBeGreaterThan(hauteurFlamme(52.8, k));
    expect(hauteurFlamme(22.46, k)).toBe(FLAMME_MIN_DP);
    expect(hauteurFlamme(1, k)).toBe(FLAMME_MIN_DP);
    // forge solid: about 0.7 to 0.8 of a hearth that is 15 dp high at this scale
    expect(hauteurFlamme(52.8, k)).toBeLessThan(0.9 * 15);
  });

  test("every index entry is on its sprite's canvas", () => {
    for (const [cle, e] of Object.entries(depuisExports())) {
      const i = cle.lastIndexOf("_");
      const s = spriteDe(cle.slice(0, i) as BuildingCode, cle.slice(i + 1) as Stade);
      expect({ cle, size: s?.size }).toEqual({ cle, size: e.size });
    }
  });

  test("the smoke starts at the chimney, else above the campfire's flame", () => {
    const forge = accrochesDe("forge", "solid");
    const feu = accrochesDe("campfire", "solid");
    expect(forge && sourceFumee(forge, "forge", 0.125)).toEqual(forge?.cheminee);
    const [x, y] = (feu && sourceFumee(feu, "campfire", 0.125)) ?? [0, 0];
    expect(x).toBe(feu?.foyer?.px[0]);
    expect(y).toBeLessThan(feu?.foyer?.px[1] ?? 0);
  });

  test("the fire's colours are tokens of the biome", () => {
    for (const t of ["isoFlamme", "isoFlammeCoeur", "isoFumee", "isoInk"] as const)
      expect(rawColors[t]).toBeDefined();
  });
});

describe("what a village shows", () => {
  /** Hearths and plumes on the map at a tier, every building built at `niveau`. */
  function compte(
    tier: Parameters<typeof etatAvec>[0],
    codes: readonly (typeof buildingCodes)[number][],
    niveau: number,
  ) {
    const { montres } = etatAvec(tier, codes);
    let foyers = 0;
    let cheminees = 0;
    let fumees = 0;
    for (const code of montres.filter((c) => codes.includes(c))) {
      const stade = stadeReel(code, buildingStage(niveau));
      const a = accrochesDe(code, stade);
      if (!a || !spriteDe(code, stade)) continue;
      if (a.foyer) foyers++;
      if (a.cheminee) cheminees++;
      if (sourceFumee(a, code, 0.125)) fumees++;
    }
    return { foyers, cheminees, fumees };
  }

  test("tier 1 and tier 12", () => {
    // tier 1: the camp (campfire, tent); tier 12: all buildings at level 5
    expect(compte(1, ["campfire", "tent"], 1)).toEqual({ foyers: 1, cheminees: 0, fumees: 1 });
    expect(compte(12, buildingCodes, 5)).toEqual({ foyers: 5, cheminees: 4, fumees: 5 });
  });
});
