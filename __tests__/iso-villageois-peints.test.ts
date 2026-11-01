import { readFileSync } from "node:fs";
import path from "node:path";
import { FIGURINES } from "@/components/village/iso/carteDemo";
import { ROLES } from "@/components/village/iso/marcheurs";

const sources = [1, 2, 3, 4, 5, 6]
  .map((n) =>
    readFileSync(path.join(__dirname, `../components/village/iso/maquettes${n}.ts`), "utf8"),
  )
  .join("\n");

/** The image file a sprite key loads, read in the generated index. */
const fichierDe = (cle: string) =>
  new RegExp(`"${cle.replace(/[.]/g, "\\.")}": \\{\\s*image: require\\("([^"]+)"\\)`).exec(
    sources,
  )?.[1];

describe("no grey blockout villager in production", () => {
  test("every figurine and every walker (face only: backs are never chosen) loads a painted file", () => {
    const cles = [
      ...FIGURINES.map((f) => f.cle),
      ...ROLES.map((r) => `villageois/${r}_face.nuit.webp`),
    ];
    for (const cle of cles) {
      const f = fichierDe(cle);
      expect(f).toBeDefined();
      expect(f).not.toContain("blockout/pieces/");
    }
  });
});
