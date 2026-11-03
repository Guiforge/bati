import { DONNEES_BLD } from "@/components/village/iso/donneesBld";
import {
  ambiances,
  batiments,
  biomes,
  EXPORTS_PAR_STADE,
  NOMS_ACCROCHE,
  nomImage,
  ORDRE_COUCHES,
  type PointsAccroche,
} from "@/components/village/iso/isoSpec";
import raw from "@/constants/isoSpec.json";
import { rawColors } from "@/constants/rawColors";
import { buildingCodes, buildingDefinitions } from "@/db/schema";
import heightsRaw from "@/scripts/iso/exports/heights.json";

describe("isoSpec.json, data for the future (§7) and the reperes", () => {
  test("every building code has exactly one entry, and nothing else does", () => {
    const codes = Object.keys(raw.batiments).filter((k) => !k.startsWith("_"));
    expect(codes.toSorted()).toEqual([...buildingCodes].toSorted());
    expect(Object.keys(batiments).toSorted()).toEqual([...buildingCodes].toSorted());
  });

  test("tiers match db/schema.ts, tier 3 has two stages, 57 stages in all", () => {
    for (const code of buildingCodes) {
      const b = batiments[code];
      expect(b.tier).toBe(buildingDefinitions[code].tier);
      expect(b.stades).toEqual(b.tier === 3 ? ["rough", "solid"] : ["rough", "solid", "grand"]);
    }
    expect(buildingCodes.reduce((n, code) => n + batiments[code].stades.length, 0)).toBe(57);
  });

  test("footprint canvases: centred anchor, far corner plus margin, one per building footprint", () => {
    // Free height above the footprint's back corner (0, 0), in px, by footprint (tallest canvas).
    const libre = new Map<string, number>();
    for (const [nom, c] of Object.entries(raw.canvases)) {
      if (c.anchor !== "footprintBottom") continue;
      const [fw = 0, fh = 0] = c.footprint;
      // The footprint's bottom corner sits at w / 2; its side corners lie fh and fw cells away.
      expect({ nom, w: c.w }).toEqual({
        nom,
        w: 2 * ((Math.max(fw, fh) * raw.S) / 2 + raw.anchorMarginPx),
      });
      const cle = `${fw}x${fh}`;
      const h = c.h - raw.anchorMarginPx - ((fw + fh) * raw.S) / 4;
      libre.set(cle, Math.max(h, libre.get(cle) ?? 0));
    }
    // One height unit on screen; the camera is tilted 60 degrees.
    const pxParHauteur =
      raw.pxPerUnit * Math.sin((raw.cameraRotationDeg[0] ?? 0) * (Math.PI / 180));
    const hauteurs: Record<string, { stades: Record<string, { hauteurMax: number }> }> =
      heightsRaw.batiments;
    for (const code of buildingCodes) {
      // Blockout headroom only means something for old art; measured art checks its own top (sommet).
      const mesure = DONNEES_BLD[code]?.mesure;
      if (mesure) {
        expect({ code, sommet: mesure.sommet >= 0 }).toEqual({ code, sommet: true });
        continue;
      }
      const cle = batiments[code].emprise?.join("x") ?? "null";
      const hauteurMax = Math.max(
        ...Object.values(hauteurs[code]?.stades ?? {}).map((s) => s.hauteurMax),
      );
      // 200 px is what tower1x1 leaves above the wizard tower, the tightest existing canvas.
      const marge = (libre.get(cle) ?? 0) - hauteurMax * pxParHauteur;
      expect({ code, cle, assez: hauteurMax > 0 && marge >= 200 }).toEqual({
        code,
        cle,
        assez: true,
      });
    }
  });

  test("every repere is a non-empty phrase", () => {
    for (const code of buildingCodes) expect(batiments[code].repere.trim()).not.toBe("");
  });

  test("decorSaison sits right after the sprite, below the effects", () => {
    const i = ORDRE_COUCHES.indexOf("sprite");
    expect(i).toBeGreaterThanOrEqual(0);
    expect(ORDRE_COUCHES[i + 1]).toBe("decorSaison");
    expect(ORDRE_COUCHES.indexOf("effets")).toBeGreaterThan(i + 1);
  });

  test("nuit is complete, jour is allowed but absent", () => {
    expect(raw.ambiances.permises).toEqual(["nuit", "jour"]);
    const nuit = ambiances.nuit;
    expect(nuit?.lumiere.L).toHaveLength(3);
    expect(
      Object.keys(nuit?.matieres ?? {}).filter((k) => !k.startsWith("_")).length,
    ).toBeGreaterThan(0);
    expect(nuit?.emissifs.amber).toMatch(/^#/);
    expect(nuit?.tons.top).toBeGreaterThan(0);
    expect(nuit?.flaques.maxSill).toBeGreaterThan(0);
    expect(ambiances.jour).toBeUndefined();
    expect("jour" in raw.ambiances).toBe(false);
  });

  test("the defaut biome reads its colours from rawColors tokens", () => {
    expect(Object.keys(raw.biomes)).toEqual(["_doc", "defaut"]);
    expect(biomes.defaut.sol.herbe).toBe("isoPre");
    expect(biomes.defaut.sol.encre).toBe("isoInk");
  });

  test("every colour of a biome, ground, decor and water, is a token of rawColors", () => {
    const b = raw.biomes.defaut;
    const noms = [
      ...Object.values(b.sol),
      ...Object.values(b.decors.couleurs),
      ...Object.values(b.eau.couleurs),
    ];
    expect(noms.length).toBeGreaterThan(15);
    expect(noms.filter((n) => !(n in rawColors))).toEqual([]);
    // The typed reader resolves the same names, and gives the families of the pieces.
    expect(Object.values(biomes.defaut.eau.couleurs).toSorted()).toEqual(
      Object.values(b.eau.couleurs).toSorted(),
    );
    expect([biomes.defaut.decors.famille, biomes.defaut.eau.famille]).toEqual(["decor", "eau"]);
  });

  test("schema of the per-stage exports and anchor points", () => {
    expect(NOMS_ACCROCHE).toEqual(["faite", "porte", "cheminee", "avantToits"]);
    expect(EXPORTS_PAR_STADE).toHaveLength(8);
    // forge rough's shape: no door, so porte is null in both forms.
    const exemple = {
      px: { faite: [448, 200], porte: null, cheminee: [500, 300], avantToits: [[200, 700]] },
      grid: { faite: [1, 1, 2], porte: null, cheminee: [1.2, 0.8, 1.6], avantToits: [[0, 1, 1.1]] },
      foyer: null,
      fenetres: [],
    } satisfies PointsAccroche;
    expect(Object.keys(exemple.px)).toEqual(NOMS_ACCROCHE);
    expect(Object.keys(exemple.grid)).toEqual(NOMS_ACCROCHE);
    expect(nomImage("forge", "solid", "nuit")).toBe("forge/solid.nuit.webp");
  });
});
