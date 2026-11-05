// L14: the villagers' routes at every tier. Run: node --require ./scripts/layout/hook.cjs node_modules/tsx/dist/cli.mjs scripts/layout/chemins.ts
// For each tier, many waves (days x numbers) are planned with the app's own planifierVague; every cell of every segment must be
// on the island, grass, path or bridge, and off every building plot and wall section. Prints the number of cells checked and violations.

import { etatCarte } from "@/components/village/iso/carteDemo";
import { emplacements, rempart, sol } from "@/components/village/iso/isoLayout";
import { planifierVague } from "@/components/village/iso/marcheurs";
import type { VillageTier } from "@/db/village";

const clef = (x: number, y: number) => `${x},${y}`;
const plots = new Set<string>();
for (const e of Object.values(emplacements)) for (const [x, y] of e.cases) plots.add(clef(x, y));
for (const [x, y] of rempart) plots.add(clef(x, y));

let total = 0;
for (let t = 1; t <= 12; t++) {
  const { visible, montres } = etatCarte(t as VillageTier, false);
  const carte = { visible, montres };
  const mauvais: string[] = [];
  let cellules = 0;
  let ponts = 0;
  let ouest = 0;
  for (let jour = 0; jour < 12; jour++) {
    for (let numero = 0; numero < 40; numero++) {
      const vague = planifierVague(carte, {}, jour, numero);
      for (const m of vague.marcheurs)
        for (const s of m.segments)
          for (const [x, y] of [s.de, s.vers]) {
            cellules++;
            const k = sol[y]?.[x];
            if (k === "pont") ponts++;
            if (x < 2) ouest++;
            if (!visible[y]?.[x]) mauvais.push(`${clef(x, y)} off the island`);
            else if (k !== "herbe" && k !== "chemin" && k !== "pont") mauvais.push(`${clef(x, y)} is ${k}`);
            else if (plots.has(clef(x, y)) && !(k === "chemin" || k === "pont")) mauvais.push(`${clef(x, y)} on a plot`);
            else if (plots.has(clef(x, y))) mauvais.push(`${clef(x, y)} on a plot or wall cell (${k})`);
          }
    }
  }
  total += mauvais.length;
  console.log(`tier ${t}: ${montres.length} buildings, ${cellules} cells walked (${ponts} on a bridge, ${ouest} on the west bank), ${mauvais.length} violations`, [...new Set(mauvais)].slice(0, 5));
}
console.log("total violations", total);

