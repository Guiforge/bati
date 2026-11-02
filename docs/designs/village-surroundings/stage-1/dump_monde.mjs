// biome-ignore-all lint/suspicious/noConsole: a command-line script, its output is stdout
// Étape 1 : vide les données réelles du village en coordonnées du monde (cases gx, gy et dp de carte
// au zoom 1), en lisant le code de l'app tel quel. Lecture seule.
// Lancer depuis la racine du dépôt : construit par stub_rn.mjs (bun), puis : bun <dump.js> > <sortie.json>
import {
  COTE,
  cadrage,
  cadrageComplet,
  ecranXY,
  emprise,
  etatCarte,
  HAUTEUR,
  LARGEUR,
} from "@/components/village/iso/carteDemo";
import { champsDe } from "@/components/village/iso/champs";
import { emplacements, sol, TAILLE } from "@/components/village/iso/isoLayout";
import { etendue } from "@/components/village/iso/monde.ts";
import { chaineEau } from "@/components/village/iso/riviere";
import { ARETES, PLACE, SENTIERS, SORTIES } from "@/components/village/iso/rues";

// L'aire de la carte des captures iter-01-captures-b : 1080 x 1213 px à 2,625 px par dp.
const [W, H] = [1080 / 2.625, 1213 / 2.625];
const PALIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const parPalier = Object.fromEntries(
  PALIERS.map((p) => {
    const { visible, montres } = etatCarte(p, false);
    const vu = (gx, gy) => !!visible[gy]?.[gx];
    const complet = cadrageComplet(visible, W, H);
    return [
      p,
      {
        visible,
        montres,
        ile: emprise(visible),
        champs: champsDe(vu),
        cadre: cadrage(visible, W, H),
        complet,
        etendue: etendue(complet.zoom, W, H, visible),
      },
    ];
  }),
);
console.log(
  JSON.stringify({
    COTE,
    LARGEUR,
    HAUTEUR,
    TAILLE,
    sol,
    origine: ecranXY([0, 0]),
    emplacements,
    eau: chaineEau(),
    aretes: ARETES,
    sentiers: SENTIERS,
    place: PLACE,
    sorties: SORTIES,
    aire: [W, H],
    parPalier,
  }),
);
