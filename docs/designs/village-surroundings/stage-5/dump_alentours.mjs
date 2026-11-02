// Étape 5 : vide ce que l'app pose des alentours peints (masses de forêt, accessoires) par palier, en dp de
// carte, en lisant le code de l'app tel quel. Lecture seule.
// Lancer depuis la racine du dépôt :
//   bun docs/designs/village-surroundings/stage-5/stub.mjs <dump.js>
//   bun <dump.js> > <alentours.json>
import {
  accessoiresMontres,
  massesForet,
  piedAccessoire,
} from "@/components/village/iso/alentours.ts";
import { cadrage, etatCarte } from "@/components/village/iso/carteDemo";
import { champsDe } from "@/components/village/iso/champs";

const [W, H] = [1080 / 2.625, 1213 / 2.625];
const PALIERS = [1, 6, 12];
process.stdout.write(
  JSON.stringify(
    Object.fromEntries(
      PALIERS.map((p) => {
        const { visible, montres } = etatCarte(p, false);
        const champs = champsDe((gx, gy) => !!visible[gy]?.[gx]).blocs;
        return [
          p,
          {
            cadre: cadrage(visible, W, H),
            masses: massesForet(visible, champs),
            accessoires: accessoiresMontres(visible, montres, p).map((a) => ({
              ...a,
              pied: piedAccessoire(a),
            })),
          },
        ];
      }),
    ),
  ),
);
