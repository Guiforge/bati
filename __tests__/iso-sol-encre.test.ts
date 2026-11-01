// T39: the ground speaks the sprites' language. The proof is a measure: the mean saturation and value
// of the accepted buildings' night sprites against the lawn's, the plots', the paths' and the paving's,
// weighted by the variants' weights, at night and (for the lawn) under the day's wash. The reference
// is constants/isoSpritesReference.json, written by scripts/iso/reference_sprites.py from the
// opaque pixels of assets/images/village/iso/*/solid.nuit.webp; the first describe checks that it lists
// the buildings that exist and, when PIL is installed, that the script reproduces it.

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { biomes } from "@/components/village/iso/isoSpec";
import { LUMIERES } from "@/components/village/iso/lumiere";
import { ENCRE_SOL } from "@/components/village/iso/solVarie";
import reference from "@/constants/isoSpritesReference.json";
import { rawColors } from "@/constants/rawColors";

const SPRITES = reference;

const rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
const sv = (c: number[]) => {
  const mx = Math.max(...c);
  return { s: mx ? (mx - Math.min(...c)) / mx : 0, v: mx };
};
// The night is read from the night tokens (biomes.defautNuit, A6: the vector ground has its own night), the day from the day's.
const { variantes: V } = biomes.defautNuit;
const { variantes: VJ } = biomes.defaut;

type Pesee = { couleur: keyof typeof rawColors; poids: number };

function moyenne(variantes: readonly Pesee[], lavis?: { couleur: string; opacite: number }) {
  const total = variantes.reduce((n, e) => n + e.poids, 0);
  let s = 0;
  let v = 0;
  for (const e of variantes) {
    let c = rgb(rawColors[e.couleur]);
    if (lavis)
      c = c.map((x, i) => x * (1 - lavis.opacite) + (rgb(lavis.couleur)[i] ?? 0) * lavis.opacite);
    const m = sv(c);
    s += (m.s * e.poids) / total;
    v += (m.v * e.poids) / total;
  }
  return { s, v };
}

const gazon = (lavis?: { couleur: string; opacite: number }) =>
  moyenne(lavis ? VJ.herbe : V.herbe, lavis);
const DALLAGES: Pesee[] = [
  { couleur: "isoRuePaveNuit", poids: 2 },
  { couleur: "isoPaveClairNuit", poids: 1 },
  { couleur: "isoPaveSombreNuit", poids: 1 },
];

const IMAGES = "assets/images/village/iso";

describe("T39 the sprites' reference", () => {
  test("lists every accepted building's solid night sprite", () => {
    const sur = readdirSync(IMAGES, { withFileTypes: true })
      .filter(
        (d) => d.isDirectory() && readdirSync(`${IMAGES}/${d.name}`).includes("solid.nuit.webp"),
      )
      .map((d) => d.name)
      .sort();
    expect(Object.keys(SPRITES.batiments).sort()).toEqual(sur);
    const s = Object.values(SPRITES.batiments).map((b) => b.s);
    expect(SPRITES.s).toBeGreaterThanOrEqual(Math.min(...s));
    expect(SPRITES.s).toBeLessThanOrEqual(Math.max(...s));
  });

  const pil = spawnSync("python3", ["-c", "import PIL"]).status === 0;
  (pil ? test : test.skip)("reference_sprites.py --check finds the file current", () => {
    const r = spawnSync("python3", ["-I", "scripts/iso/reference_sprites.py", "--check"]);
    expect(r.status).toBe(0);
  });
});

describe("T39 ground against sprites", () => {
  test("night lawn: saturation and value close to the sprites'", () => {
    const g = gazon();
    expect(Math.abs(g.s - SPRITES.s)).toBeLessThan(0.08);
    expect(Math.abs(g.v - SPRITES.v)).toBeLessThan(0.08);
  });

  test("day lawn under the wash: not far above the sprites, which are not washed", () => {
    const jour = LUMIERES.jour;
    expect(jour).toBeDefined();
    const g = gazon({ couleur: jour?.lavis ?? "#000000", opacite: jour?.opaciteLavis ?? 0 });
    // The day sprites, unwashed (reference_sprites.py `jour`), not the night ones the lawn is read against after dark.
    expect(g.s - SPRITES.jour.s).toBeLessThan(0.08);
    expect(g.v - SPRITES.jour.v).toBeLessThan(0.14);
  });

  // The plots, the paths and the paving read against the lawn, which is darker than they are, so
  // they sit above the sprites (whose mean holds the ink): ceilings measured 31/10, to lower when
  // they are toned, never to raise. Audit of 31/10 evening: paths 0.12/0.2 to 0.11/0.1 (measured 0.103/0.086,
  // V 0.478 to 0.373), paving 0.3/0.2 to 0.15/0.11 (measured 0.134/0.103, S 0.199 to 0.306).
  test.each([
    ["plots", V.terre, 0.12, 0.2],
    ["paths", V.chemin, 0.11, 0.1],
    ["paving", DALLAGES, 0.15, 0.11],
  ] as const)(
    "%s: saturation and value near the sprites', never darker than the lawn",
    (_n, vars, ds, dv) => {
      const m = moyenne(vars);
      expect(Math.abs(m.s - SPRITES.s)).toBeLessThan(ds);
      expect(m.v - SPRITES.v).toBeLessThan(dv);
      expect(m.v).toBeGreaterThan(gazon().v);
    },
  );

  test("the decals and pebbles are inked as thick as the ground's rim", () => {
    for (const d of Object.values(V.decals)) expect(d.trait).toBeGreaterThanOrEqual(ENCRE_SOL);
    expect(V.galet.trait).toBeGreaterThanOrEqual(ENCRE_SOL * 0.9);
  });
});
