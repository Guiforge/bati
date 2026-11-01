// L4-T08a: ordreProfondeur went from n^3 to n^2 (edges counted once). It must give the order of the
// original, copied here from 7ef9c7ae, on the real scene and on awkward inputs.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EMPRISES_CARTE, ORDRE_CARTE } from "@/components/village/iso/carteDemo";
import { emplacements } from "@/components/village/iso/isoLayout";
import { derriere, type Emprise, ordreProfondeur } from "@/components/village/iso/profondeur";

/** The n^3 version of 7ef9c7ae, verbatim. */
function ancien<K extends string>(objets: Readonly<Record<K, Emprise>>): K[] {
  const cles = (Object.keys(objets) as K[]).sort();
  const loin = (k: K) =>
    objets[k].coin[0] + objets[k].emprise[0] + objets[k].coin[1] + objets[k].emprise[1];
  const restants = new Set(cles);
  const ordre: K[] = [];
  while (restants.size > 0) {
    const libres = [...restants].filter(
      (k) => ![...restants].some((j) => j !== k && derriere(objets[j], objets[k])),
    );
    const suivant = (libres.length > 0 ? libres : [...restants]).sort(
      (a, b) => loin(a) - loin(b) || (a < b ? -1 : 1),
    )[0];
    if (suivant === undefined) break;
    ordre.push(suivant);
    restants.delete(suivant);
  }
  return ordre;
}

describe("ordreProfondeur, n^2 against the original n^3", () => {
  test("gives the same order on the scene of ORDRE_CARTE", () => {
    const objets: Record<string, Emprise> = {};
    for (const e of ORDRE_CARTE)
      if (e.type === "batiment") objets[e.code] = emplacements[e.code];
      else if (e.type === "pan") {
        const k = `pan:${e.troncon}`;
        objets[k] = EMPRISES_CARTE[k] ?? emplacements.castle_wall;
      } else
        objets[`${e.type}:${e.piece.case.join(",")}`] = { coin: e.piece.case, emprise: [1, 1] };
    expect(Object.keys(objets).length).toBeGreaterThan(100);
    expect(ordreProfondeur(objets)).toEqual(ancien(objets));
  });

  test("gives the same order with ties, overlaps and footprints of every size", () => {
    // A small deterministic generator, no randomness in the suite.
    let graine = 12345;
    const suivant = (n: number) => {
      graine = (Math.imul(graine, 1103515245) + 12345) >>> 0;
      return graine % n;
    };
    for (let essai = 0; essai < 60; essai++) {
      const objets: Record<string, Emprise> = {};
      for (let i = 0; i < 25; i++)
        objets[`o${i}`] = {
          coin: [suivant(6), suivant(6)],
          emprise: [1 + suivant(3), 1 + suivant(3)],
        };
      expect(ordreProfondeur(objets)).toEqual(ancien(objets));
    }
  });

  test("ties go to the smaller key, and a lone pair keeps its order", () => {
    const meme: Record<string, Emprise> = {
      b: { coin: [0, 0], emprise: [1, 1] },
      a: { coin: [0, 0], emprise: [1, 1] },
      c: { coin: [3, 3], emprise: [1, 1] },
    };
    expect(ordreProfondeur(meme)).toEqual(["a", "b", "c"]);
    expect(ordreProfondeur(meme)).toEqual(ancien(meme));
    expect(ordreProfondeur({})).toEqual([]);
  });

  // `derriere` cannot form a cycle (it needs a gap one way and none the other, so a ring of
  // footprints always has one more "ahead" than "behind"; searched by brute force without one),
  // so the fallback branch has no input. Every key must still come out exactly once.
  test("every key comes out once, however the footprints overlap", () => {
    const objets: Record<string, Emprise> = {};
    for (let i = 0; i < 40; i++)
      objets[`k${i}`] = { coin: [i % 4, (i * 3) % 5], emprise: [1 + (i % 3), 1 + (i % 2)] };
    expect([...ordreProfondeur(objets)].sort()).toEqual(Object.keys(objets).sort());
  });
});

describe("constants/isoOrdre.json", () => {
  test("is the depth order of the map's scene, as ordreProfondeur gives it", () => {
    const chemin = join(__dirname, "../constants/isoOrdre.json");
    const attendu = ordreProfondeur(EMPRISES_CARTE);
    if (process.env.UPDATE_ORDRE === "1") {
      const _doc =
        "The depth order of the map's elements (carteDemo.ts elementsCarte), back to front. Generated: UPDATE_ORDRE=1 npx jest iso-profondeur-ordre. The app reads this and never sorts (L4-AUD I6).";
      writeFileSync(chemin, `${JSON.stringify({ _doc, ordre: attendu }, null, 1)}\n`);
    }
    const ecrit: unknown = JSON.parse(readFileSync(chemin, "utf8")).ordre;
    // Stale when the layout, the pieces or the lisiere changed: regenerate and commit the JSON.
    expect({ commande: "UPDATE_ORDRE=1 npx jest iso-profondeur-ordre", ordre: ecrit }).toEqual({
      commande: "UPDATE_ORDRE=1 npx jest iso-profondeur-ordre",
      ordre: attendu,
    });
    expect(ORDRE_CARTE).toHaveLength(attendu.length);
  });
});
