// biome-ignore-all lint/suspicious/noConsole: a measuring script, its output is the point
// Forest masses per tier, before and after the countryside's clearings (growth G11): node scripts/growth/masses.cjs
// "Before" is massesForet with the fields alone, "after" the call the village makes (the fields and degagesForet).
import { massesForet } from "@/components/village/iso/alentours";
import { etatCarte } from "@/components/village/iso/carteDemo";
import { champsDe } from "@/components/village/iso/champs";
import { degagesForet } from "@/components/village/iso/piecesPosees";
import type { VillageTier } from "@/db/village";

const cle = (m: { nom: string; x: number; y: number }) => `${m.nom}${m.x},${m.y}`;
let sansAvant = new Set<string>();
let avecAvant = new Set<string>();
for (let t = 1; t <= 12; t++) {
  const { visible } = etatCarte(t as VillageTier, false);
  const champs = champsDe((gx, gy) => visible[gy]?.[gx] === true, true).blocs;
  const sans = massesForet(visible, champs);
  const avec = massesForet(visible, [...champs, ...degagesForet(t)]);
  const sansCles = new Set(sans.map(cle));
  const avecCles = new Set(avec.map(cle));
  const parti = sans.filter((m) => !avecCles.has(cle(m))).length;
  // A mass the clearing took at the tier below (there without it, not there with it) and that stands again here.
  const revenues = avec.filter((m) => sansAvant.has(cle(m)) && !avecAvant.has(cle(m))).length;
  console.log(
    `tier ${t}: before ${sans.length}, after ${avec.length}, removed by the clearings ${parti}, added ${avec.filter((m) => !sansCles.has(cle(m))).length}, back after being cleared ${revenues}`,
  );
  sansAvant = sansCles;
  avecAvant = avecCles;
}
