// L4-AUD: a building's image is its own file. Two buildings never share a source, whatever the
// stage, and the source `Planche` hands to expo-image (the uri plus the decode size) is never the
// same for two sprites either: Glide keys its cache on both.
import { spriteDe } from "@/components/village/iso/carteDemo";
import { tailleDecode } from "@/components/village/iso/detail";
import { batiments, nomImage } from "@/components/village/iso/isoSpec";
import { MAQUETTES } from "@/components/village/iso/maquettes";
import { buildingCodes } from "@/db/schema";

const TOUS = buildingCodes.flatMap((code) =>
  batiments[code].stades.map((stade) => ({ code, stade, cle: nomImage(code, stade, "nuit") })),
);
const chemin = (image: unknown) => JSON.stringify(image);

describe("the image of a building stage", () => {
  test("is the file `<code>/<stade>.nuit.webp` in the building's own folder", () => {
    const peints = TOUS.filter((t) => spriteDe(t.code, t.stade));
    expect(peints.length).toBeGreaterThan(40);
    for (const { code, stade, cle } of peints) {
      const s = spriteDe(code, stade);
      expect(s).toBe(MAQUETTES[cle]);
      // Painted sprites sit in `iso/<code>/`, the mock-ups still in `iso/blockout/<code>/`.
      expect([cle, chemin(s?.image)]).toEqual([
        cle,
        expect.stringMatching(
          new RegExp(`assets/images/village/iso/(blockout/)?${code}/${stade}\\.nuit\\.webp"`),
        ),
      ]);
    }
  });

  test("never repeats between two buildings or two stages: source and cache key", () => {
    const sources = new Map<string, string>();
    const cles = new Map<string, string>();
    const doublons: string[] = [];
    for (const { code, stade, cle } of TOUS) {
      const s = spriteDe(code, stade);
      if (!s) continue;
      const src = chemin(s.image);
      // What expo-image receives: the uri and the decode size, at every level of detail.
      const taille = [0, 1, 2, 3].map((n) => tailleDecode(n, s.size[0], s.size[1], s.size, 2.625));
      const cache = `${src}|${JSON.stringify(taille)}`;
      for (const [table, k] of [
        [sources, src],
        [cles, cache],
      ] as const) {
        const deja = table.get(k);
        if (deja !== undefined) doublons.push(`${cle} = ${deja}`);
        table.set(k, cle);
      }
    }
    expect(doublons).toEqual([]);
  });
});
