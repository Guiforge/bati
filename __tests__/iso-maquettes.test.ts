// L1-T07: the image index of the iso map, the shadow recomputed from the exported volumes (§7 of
// the V1 prompt), the sails' shadow at any angle, the depth order and the demo's stage rule.
//
// components/village/iso/maquettes.ts is generated here, because Metro has no dynamic require:
//   UPDATE_ISO_MAQUETTES=1 npx jest iso-maquettes --testPathIgnorePatterns=/node_modules/
//   npx biome check --write components/village/iso/maquettes*.ts
// The test fails when an image under assets/images/village/iso/ is not in the index, when the
// index lists one without its file, or when its data drifts from the sidecar and the exports.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  COTE,
  ecranXY,
  etatCarte,
  ORDRE_SPRITES,
  pose,
  poseAiles,
  spriteDe,
  stadeDemo,
} from "@/components/village/iso/carteDemo";
import { emplacements } from "@/components/village/iso/isoLayout";
import { batiments, type PointGrille, type Volume } from "@/components/village/iso/isoSpec";
import { MAQUETTES } from "@/components/village/iso/maquettes";
import {
  enveloppe,
  LUNE,
  lumiere,
  ombreAiles,
  ombreSocle,
  ombreVolumes,
  type Point,
  tournerAiles,
  zoneOmbre,
} from "@/components/village/iso/ombres";
import { clePiece } from "@/components/village/iso/pieces";
import { derriere, type Emprise, ordreProfondeur } from "@/components/village/iso/profondeur";
import spec from "@/constants/isoSpec.json";
import { type BuildingCode, buildingCodes } from "@/db/schema";
import type { VillageTier } from "@/db/village";

const RACINE = path.join(__dirname, "..");
const ISO = "assets/images/village/iso";
const RENDUS = "scripts/iso/blockouts/renders";
const INDEX = "components/village/iso/maquettes.ts";

type Json = Record<string, unknown>;
const lire = (rel: string): Json => JSON.parse(readFileSync(path.join(RACINE, rel), "utf8"));

function webps(dir: string): string[] {
  const abs = path.join(RACINE, dir);
  return readdirSync(abs).flatMap((f) =>
    statSync(path.join(abs, f)).isDirectory()
      ? webps(path.join(dir, f)).map((g) => `${f}/${g}`)
      : f.endsWith(".webp")
        ? [f]
        : [],
  );
}

/**
 * A mock-up's index key. Buildings: isoSpec `nomImage` (`forge/solid.nuit.webp`), and
 * `windmill_sails.webp`. Pieces (blockout/pieces/<family>_<name>.webp) take the name their painted
 * sprite will have, blender's proposal in reports/L1-T06.md: `decor/arbre_a.nuit.webp`,
 * `eau/canal_droit.nuit.webp`, `echafaudage/1x1.nuit.webp`, `villageois/smith_face.nuit.webp`.
 */
function cleMaquette(f: string): string {
  const piece = /^pieces\/([a-z]+)_([a-z0-9_]+)\.webp$/.exec(f);
  return piece?.[1] && piece[2] ? clePiece(piece[1], piece[2]) : f;
}

/**
 * Index key to its file under ISO. Blender's mock-ups live in blockout/; a painted sprite of
 * lot 2 in its own folder (`forge/`, `decor/`, `eau/`…) takes the same key and wins. Files at ISO's
 * top level are the POC's (forge_solid.webp) and are not indexed, nor the ground textures (`motifs/`).
 */
const HORS_INDEX = new Set([
  "blockout",
  "motifs",
  "sol",
  "foret",
  "accessoires",
  "animaux",
  "rempart",
  "champs",
  "peints",
]);

function fichiers(): Map<string, string> {
  const m = new Map(webps(`${ISO}/blockout`).map((f) => [cleMaquette(f), `blockout/${f}`]));
  // motifs/ holds the ground textures (T22), no sprite and no sidecar: motifs.ts requires them. So
  // do the painted surroundings' families (stage 5): Alentours.tsx requires them, one canvas each.
  for (const d of readdirSync(path.join(RACINE, ISO)))
    if (!HORS_INDEX.has(d) && statSync(path.join(RACINE, ISO, d)).isDirectory())
      // A painted piece (`pieces/<family>_<name>.webp`) takes its mock-up's key, as blender's do.
      for (const f of webps(`${ISO}/${d}`))
        m.set(d === "pieces" ? cleMaquette(`${d}/${f}`) : `${d}/${f}`, `${d}/${f}`);
  // The painted sails boards sit at ISO's top level: the night's replaces blockout/windmill_sails.webp,
  // the day's (F2) is its own key.
  for (const f of ["windmill_sails.webp", "windmill_sails.jour.webp"])
    if (existsSync(path.join(RACINE, ISO, f))) m.set(f, f);
  return m;
}

/** Width and height from a WebP's RIFF header: VP8X canvas, VP8 (lossy) or VP8L (lossless) frame. */
function tailleWebp(b: Buffer): [number, number] {
  expect([b.toString("ascii", 0, 4), b.toString("ascii", 8, 12)]).toEqual(["RIFF", "WEBP"]);
  const morceau = b.toString("ascii", 12, 16);
  if (morceau === "VP8X") return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  if (morceau === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (morceau === "VP8L") {
    const bits = b.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
  }
  throw new Error(`unknown WebP chunk ${morceau}`);
}

const arrondi = (v: number) => Math.round(v * 1000) / 1000 + 0;

/**
 * A painted stage's shadow on its socle (L3-T01): the socle is the blockout's first part when it
 * is the box iso_blockout.py flags (at the origin, the footprint wide, not turned); none otherwise.
 */
function ombreSocleDe(slug: string, canevas: unknown) {
  const spec_ = lire(`scripts/iso/blockouts/${slug}.json`);
  const parts = (spec_.parts ?? []) as {
    type: string;
    at: number[];
    size: number[];
    rotZ?: number;
  }[];
  const empreinte = (spec.canvases as Record<string, { footprint?: number[] }>)[String(canevas)]
    ?.footprint;
  const p = parts[0];
  const [w, d] = empreinte ?? [];
  if (!p || w === undefined || d === undefined || p.type !== "box" || p.rotZ) return undefined;
  if (p.at.some((v) => v !== 0) || p.size[0] !== w || p.size[1] !== d) return undefined;
  const hauteur = p.size[2] ?? 0;
  const volumes = (lire(`${RENDUS}/${slug}.anchor.json`).volumes as Volume[]).map(
    ({ vertices, emissive, noShadow }) => ({ vertices, emissive, noShadow }),
  );
  const ombre = ombreSocle(volumes, hauteur, [w, d]).map((o) =>
    o.flatMap(([x, y]) => [arrondi(x), arrondi(y)]),
  );
  return { hauteur, ombre };
}

/** What the index must hold for one image, from its sidecar and blender's exports. */
function entree(chemin: string): Json {
  const sidecar = lire(`${ISO}/${chemin.replace(/\.webp$/, ".json")}`);
  const slug = String(sidecar.slug);
  const exp = lire(`${RENDUS}/${slug}.anchor.json`);
  const parPiece = (exp.shadow as { grid: number[][] }[]).map((o) =>
    enveloppe(o.grid.map(([x = 0, y = 0]): Point => [x, y])),
  );
  // A villager is half a door high and walks: one hull for the figurine is all its shadow needs
  // (its 10 to 15 parts were 67 KB of the index).
  const ombres = /^pieces\/(villageois|animal)_/.test(slug)
    ? [enveloppe(parPiece.flat())]
    : parPiece;
  // A part whose shadow lies inside another's adds nothing to the union the clip draws (60 % of
  // the exported points); of two equal ones the first stays. Flat [gx, gy, gx, gy, …] at 0.001 cell.
  const gardees = ombres.filter(
    (a, i) =>
      !ombres.some(
        (b, j) =>
          j !== i &&
          b.length > 2 &&
          a.every((p) => dedans(p, b)) &&
          (j < i || !b.every((p) => dedans(p, a))),
      ),
  );
  const e: Json = {
    anchor: sidecar.anchor,
    size: sidecar.size,
    ombre: gardees.map((p) => p.flatMap(([x, y]) => [arrondi(x), arrondi(y)])),
  };
  const canevas: Record<string, { w: number; pxScale?: number }> = spec.canvases;
  const pxScale = canevas[String(sidecar.canvas)]?.pxScale;
  if (pxScale !== undefined) e.pxScale = pxScale;
  if (sidecar.pivot !== undefined) {
    const blockout = lire(`scripts/iso/blockouts/${slug}.json`);
    e.ailes = {
      pivot: sidecar.pivot,
      pivotGrille: blockout.pivot,
      echelle: sidecar.sailsScale ?? 1,
    };
  }
  // A building stage's tap mask, kept as hex rows (4 bits a char) rather than 0/1 strings.
  const masque = sidecar.mask as { step: number; w: number; h: number; rows: string[] } | undefined;
  if (masque && /_(rough|solid|grand)$/.test(slug))
    e.masque = {
      pas: masque.step,
      w: masque.w,
      h: masque.h,
      bits: masque.rows
        .map((r) =>
          (r.padEnd(Math.ceil(masque.w / 4) * 4, "0").match(/.{4}/g) ?? [])
            .map((q) => Number.parseInt(q, 2).toString(16))
            .join(""),
        )
        .join(""),
    };
  const socle = sidecar.source === "blockout" ? undefined : ombreSocleDe(slug, sidecar.canvas);
  if (socle) e.socle = socle;
  if (slug.endsWith("_sails"))
    e.volumes = (exp.volumes as Volume[]).map(({ vertices, emissive, noShadow }) => ({
      vertices,
      emissive,
      noShadow,
    }));
  return e;
}

/** The index is cut in this many files, each under Biome's 1 MiB limit; maquettes.ts joins them. */
const PARTS = 6;
const partDe = (n: number) => `components/village/iso/maquettes${n}.ts`;

/** The files of the index: the parts (a slice of the sorted keys each), then maquettes.ts. */
function generer(m: Map<string, string>): Map<string, string> {
  const cles = [...m.keys()].toSorted();
  const entetes = [
    "// Generated by __tests__/iso-maquettes.test.ts from assets/images/village/iso/ and blender's",
    "// exports: do not edit. Regenerate with",
    "//   UPDATE_ISO_MAQUETTES=1 npx jest iso-maquettes --testPathIgnorePatterns=/node_modules/",
    "//   npx biome check --write components/village/iso/maquettes*.ts",
    "// Keys are isoSpec.json `nomImage`: a painted sprite replaces its mock-up under the same key.",
    "// biome-ignore-all lint/suspicious/noApproximativeNumericConstant: coordinates, 1.414 is not √2",
    "",
  ];
  const sortie = new Map<string, string>();
  const taille = Math.ceil(cles.length / PARTS);
  for (let n = 1; n <= PARTS; n++) {
    const lignes = cles.slice((n - 1) * taille, n * taille).map((cle) => {
      const champs = Object.entries(entree(m.get(cle) ?? ""))
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(", ");
      const image = JSON.stringify(`@/${ISO}/${m.get(cle)}`);
      return `  ${JSON.stringify(cle)}: { image: require(${image}), ${champs} },`;
    });
    sortie.set(
      partDe(n),
      [
        ...entetes,
        'import type { SpriteIso } from "./isoSpec";',
        "",
        `export const MAQUETTES_${n}: Readonly<Record<string, SpriteIso>> = {`,
        ...lignes,
        "};",
        "",
      ].join("\n"),
    );
  }
  const noms = Array.from({ length: PARTS }, (_, n) => `MAQUETTES_${n + 1}`);
  sortie.set(
    INDEX,
    [
      ...entetes,
      'import type { SpriteIso } from "./isoSpec";',
      ...noms.map((nom, n) => `import { ${nom} } from "./maquettes${n + 1}";`),
      "",
      "export const MAQUETTES: Readonly<Record<string, SpriteIso>> = {",
      ...noms.map((nom) => `  ...${nom},`),
      "};",
      "",
    ].join("\n"),
  );
  return sortie;
}

describe("the image index, components/village/iso/maquettes.ts", () => {
  const surDisque = fichiers();

  test("every image file is indexed under its name, and every entry has its file", () => {
    if (process.env.UPDATE_ISO_MAQUETTES === "1") {
      for (const [f, texte] of generer(surDisque)) writeFileSync(path.join(RACINE, f), texte);
      return;
    }
    expect(Object.keys(MAQUETTES).toSorted()).toEqual([...surDisque.keys()].toSorted());
    // Under jest every image require is 1: read the source to check each key requires its own file.
    const source = Array.from({ length: PARTS }, (_, n) =>
      readFileSync(path.join(RACINE, partDe(n + 1)), "utf8"),
    )
      .join("")
      .replace(/\s+/g, "");
    for (const [cle, chemin] of surDisque)
      expect([cle, source.includes(`"${cle}":{image:require("@/${ISO}/${chemin}")`)]).toEqual([
        cle,
        true,
      ]);
  });

  test("a painted sprite takes the place of the mock-up under the same key", () => {
    const peints = [...surDisque].filter(
      ([, f]) =>
        !f.startsWith("blockout/") &&
        !f.startsWith("pieces/statue_") &&
        f !== "pieces/decor_lanterne.webp",
    );
    // The totem statues (T25) and the lantern (T36 lot F) have no mock-up: nothing to replace.
    // F2: every building stage is painted by day, its night graded from it (scripts/iso/famille_jour.py).
    const stades = buildingCodes.flatMap((c) => batiments[c].stades.map((st) => `${c}/${st}`));
    expect(peints.map(([c]) => c).toSorted()).toEqual(
      [
        ...stades,
        "decor/arbre_a",
        "decor/rochers_a",
        "eau/canal_angle",
        "eau/canal_berge",
        "eau/canal_droit",
        "eau/canal_pont",
        "eau/cascade_bord",
        "eau/cascade_chute",
        "echafaudage/1x1",
        "echafaudage/2x2",
        "animal/chat_repos",
        ...["champion", "farmer", "herbalist", "minstrel", "sage", "smith", "watcher"].map(
          (m) => `villageois/${m}_face`,
        ),
      ]
        .map((c) => `${c}.nuit.webp`)
        .concat(stades.map((c) => `${c}.jour.webp`))
        .concat("windmill_sails.webp", "windmill_sails.jour.webp")
        .concat(
          [
            "assis_tonneau",
            "balaie",
            "discutent",
            "dort",
            "joue_chat",
            "lit",
            "porte_panier",
            "puise",
            "range_caisses",
            "regarde_loin",
          ].map((p) => `repos/repos_${p}.webp`),
        )
        .toSorted(),
    );
    for (const [cle, f] of peints) {
      // The mock-up's file is still on disk: the index must require the painted one.
      // A day sprite replaces the same mock-up as its night.
      const nuit = cle
        .replace(".jour.webp", ".nuit.webp")
        .replace("_sails.nuit.webp", "_sails.webp");
      const maquette = f.startsWith("pieces/") ? `blockout/${f}` : path.join("blockout", nuit);
      expect([cle, existsSync(path.join(RACINE, ISO, maquette))]).toEqual([cle, true]);
      expect(MAQUETTES[cle]).toEqual(expect.objectContaining(entree(f)));
    }
  });

  test("each entry carries its sidecar's anchor and size, and its exported shadow", () => {
    for (const [cle, chemin] of surDisque) {
      const { image: _, ...donnees } = MAQUETTES[cle] ?? { image: 0 };
      expect([cle, donnees]).toEqual([cle, entree(chemin)]);
    }
  });

  test("names follow isoSpec nomImage for building stages, the painted names for pieces", () => {
    const familles =
      /^((decor|eau|echafaudage|villageois|animal|statue)\/[a-z0-9_]+\.nuit|repos\/repos_[a-z_]+)\.webp$/;
    for (const cle of [...surDisque.keys()].filter((c) => !familles.test(c))) {
      const [, code = "", stade = ""] =
        /^([a-z_]+?)(?:\/([a-z]+)\.(?:nuit|jour)|_sails(?:\.jour)?)\.webp$/.exec(cle) ?? [];
      const b = batiments[code as BuildingCode];
      expect([cle, b !== undefined && (stade === "" || b.stades.some((s) => s === stade))]).toEqual(
        [cle, true],
      );
    }
  });

  test("every stage of the 21 buildings has an image (57), plus the windmill's sails", () => {
    const manquants = buildingCodes.flatMap((c) =>
      batiments[c].stades.filter((s) => !spriteDe(c, s)).map((s) => `${c}/${s}`),
    );
    expect(manquants).toEqual([]);
    // 57 stages, the sails, blender's 29 pieces (L1-T06) and 9 animal poses (L4-T08c) and 6 totem statues (T25) and the 10 rest poses (T40).
    // + the lantern (T36 lot F, T39), + the 57 day stages and the day sails (F2).
    expect(surDisque.size).toBe(113 + 57 + 1);
    expect(ORDRE_SPRITES.toSorted()).toEqual([...buildingCodes].toSorted());
  });

  test("each WebP's own header gives the width and height its sidecar declares", () => {
    for (const [cle, chemin] of surDisque) {
      const sidecar = lire(`${ISO}/${chemin.replace(/\.webp$/, ".json")}`);
      expect([cle, tailleWebp(readFileSync(path.join(RACINE, ISO, chemin)))]).toEqual([
        cle,
        sidecar.size,
      ]);
    }
  });
});

// ---- §7: the ground shadow under any light, from the volumes alone -------------------------

function volumesDe(slug: string): Volume[] {
  const exp = lire(`${RENDUS}/${slug}.anchor.json`);
  return (exp.volumes as { vertices: number[][]; emissive: boolean; noShadow: boolean }[]).map(
    (v) => ({
      emissive: v.emissive,
      noShadow: v.noShadow,
      vertices: v.vertices.map(([x = 0, y = 0, z = 0]): PointGrille => [x, y, z]),
    }),
  );
}
const exportee = (slug: string): Point[][] =>
  (lire(`${RENDUS}/${slug}.anchor.json`).shadow as { grid: number[][] }[]).map((o) =>
    enveloppe(o.grid.map(([x = 0, y = 0]): Point => [x, y])),
  );

function memePolygone(a: readonly Point[], b: readonly Point[], tol = 2e-3): boolean {
  // Rounding can merge or split a hull vertex; compare both ways, point to nearest point.
  const proche = (p: Point, q: readonly Point[]) =>
    q.some(([x, y]) => Math.hypot(x - p[0], y - p[1]) <= tol);
  const surBord = (p: Point, q: readonly Point[]) => proche(p, q) || dedans(p, q, tol);
  return a.every((p) => surBord(p, b)) && b.every((p) => surBord(p, a));
}
const cross = (o: Point, a: Point, b: Point) =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
/** Inside a counter-clockwise convex polygon, within a tolerance. */
function dedans(p: Point, poly: readonly Point[], tol = 1e-6): boolean {
  return poly.every((a, i) => {
    const b = poly[(i + 1) % poly.length] ?? a;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return cross(a, b, p) / l >= -tol;
  });
}
const aire = (poly: readonly Point[]) =>
  poly.reduce((s, a, i) => s + cross([0, 0], a, poly[(i + 1) % poly.length] ?? a), 0) / 2;
/** How far each part's shadow runs the way the light throws it (+gx, -gy), summed over the parts. */
const portee = (polys: readonly (readonly Point[])[]) =>
  polys.reduce((s, p) => {
    const d = p.map(([x, y]) => x - y);
    return s + Math.max(...d) - Math.min(...d);
  }, 0);

describe("§7: a stage's shadow from its exported volumes, under any sun", () => {
  test.each(["forge_solid", "windmill_solid"])(
    "%s: under the moon it falls back on the exported shadow, under a higher sun it is shorter",
    (slug) => {
      const volumes = volumesDe(slug);
      const lune = ombreVolumes(volumes, LUNE);
      const attendue = exportee(slug);
      expect(lune).toHaveLength(attendue.length);
      lune.forEach((p, i) => {
        expect([slug, i, memePolygone(p, attendue[i] ?? [])]).toEqual([slug, i, true]);
      });
      // The moon of isoSpec.json is azimuth 225, elevation 55.
      lumiere(225, 55).forEach((c, i) => {
        expect(c).toBeCloseTo(LUNE[i] ?? Number.NaN, 3);
      });

      const soleil = ombreVolumes(volumes, lumiere(225, 65));
      expect(soleil.some((p, i) => !memePolygone(p, attendue[i] ?? []))).toBe(true);
      // Beyond what the parts cover seen from straight above: tan 25 / tan 35, about 0.67.
      const zenith = portee(ombreVolumes(volumes, lumiere(225, 90)));
      expect(portee(soleil) - zenith).toBeLessThan(0.75 * (portee(lune) - zenith));
      const total = (polys: Point[][]) => polys.reduce((s, p) => s + aire(p), 0);
      expect(total(soleil)).toBeLessThan(total(lune));
    },
  );
});

describe("the sails' shadow, recomposed at any angle from their volumes and the stage's pivot", () => {
  const ailes = MAQUETTES["windmill_sails.webp"];
  const volumes = ailes?.volumes ?? [];

  test("at rest, about the hub, it is the exported shadow of windmill_sails", () => {
    expect(volumes.length).toBeGreaterThan(0);
    const [repos] = ombreAiles(volumes, [0, 0, 0], 1, 0, LUNE);
    const [attendue] = exportee("windmill_sails");
    assert(repos && attendue);
    expect(memePolygone(repos, attendue)).toBe(true);
  });

  test("turning is a clockwise screen rotation about the hub, as a view's rotate", () => {
    const S = spec.S;
    const h = spec.pxPerUnit * Math.sin((60 * Math.PI) / 180);
    const ecranPx = ([gx, gy, z]: PointGrille): Point => [
      ((gx - gy) * S) / 2,
      ((gx + gy) * S) / 4 - z * h,
    ];
    const bout = volumes[0]?.vertices[1];
    assert(bout);
    for (const deg of [30, 90, 200]) {
      const [x, y] = ecranPx(bout);
      const t = (deg * Math.PI) / 180;
      const attendu = [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)];
      const [tx, ty] = ecranPx(tournerAiles(bout, deg));
      // To 0.001 px: isoSpec.json pxPerUnit is rounded to 271.529.
      expect(tx).toBeCloseTo(attendu[0] ?? Number.NaN, 3);
      expect(ty).toBeCloseTo(attendu[1] ?? Number.NaN, 3);
    }
  });

  test("on every windmill stage, at every angle, it stays in the zone the layout keeps clear", () => {
    const [gx, gy] = emplacements.windmill.coin;
    const zone = zoneOmbre("windmill");
    for (const stade of batiments.windmill.stades) {
      const s = spriteDe("windmill", stade);
      if (!s?.ailes) continue;
      const repos = ombreAiles(volumes, s.ailes.pivotGrille, s.ailes.echelle, 0, LUNE);
      let tournee = false;
      for (let deg = 0; deg < 360; deg += 15) {
        const o = ombreAiles(volumes, s.ailes.pivotGrille, s.ailes.echelle, deg, LUNE);
        tournee ||= o.some((p, i) => !memePolygone(p, repos[i] ?? []));
        // heights.py sweeps a flat disc through the pivot; the blades' hub has some depth along
        // the axle, which reaches 0.0023 cell past it at grand (0.9 px of a 384 px cell).
        for (const [x, y] of o.flat())
          expect([stade, deg, dedans([gx + x, gy + y], zone, 0.005)]).toEqual([stade, deg, true]);
      }
      expect([stade, tournee]).toEqual([stade, true]);
    }
  });
});

describe("depth order of the sprites", () => {
  test("behind along gx or gy, but neither when separated both ways (side by side on screen)", () => {
    const a: Emprise = { coin: [0, 0], emprise: [1, 1] };
    expect(derriere(a, { coin: [1, 0], emprise: [1, 1] })).toBe(true);
    expect(derriere(a, { coin: [0, 2], emprise: [2, 1] })).toBe(true);
    expect(derriere({ coin: [1, 0], emprise: [1, 1] }, a)).toBe(false);
    // Ahead along gx, behind along gy: one is screen left of the other, no order between them.
    const gauche: Emprise = { coin: [0, 3], emprise: [1, 1] };
    const droite: Emprise = { coin: [2, 0], emprise: [1, 1] };
    expect([derriere(gauche, droite), derriere(droite, gauche)]).toEqual([false, false]);
  });

  test("a wide footprint in front of a small one comes after it, which a corner sum gets wrong", () => {
    const objets: Record<"large" | "petit", Emprise> = {
      large: { coin: [0, 3], emprise: [3, 1] },
      petit: { coin: [2, 2], emprise: [1, 1] },
    };
    // Corner sums: large 3, petit 4, yet petit ends (gy 3) where large begins.
    expect(ordreProfondeur(objets)).toEqual(["petit", "large"]);
    // And a far-corner sum fails the other way: long ends at gx 1 where petit begins, sums 4 and 3.
    const autres: Record<"long" | "petit", Emprise> = {
      long: { coin: [0, 0], emprise: [1, 3] },
      petit: { coin: [1, 0], emprise: [1, 1] },
    };
    expect(ordreProfondeur(autres)).toEqual(["long", "petit"]);
  });

  test("on the master grid, every building lying behind another is drawn before it", () => {
    const ordre = ordreProfondeur(emplacements);
    expect(ordre.toSorted()).toEqual([...buildingCodes].toSorted());
    const paires = buildingCodes.flatMap((a) =>
      buildingCodes
        .filter((b) => derriere(emplacements[a], emplacements[b]))
        .map((b) => [a, b] as const),
    );
    expect(paires.length).toBeGreaterThan(20);
    expect(paires.filter(([a, b]) => ordre.indexOf(a) > ordre.indexOf(b))).toEqual([]);
  });
});

describe("the demo's stage rule and where it poses an image", () => {
  test("rough when the plot joins the island, one stage more per tier, up to the last", () => {
    expect(
      ["campfire", "tent", "training_dummy"].map((c) => stadeDemo(c as BuildingCode, 1)),
    ).toEqual(["rough", "rough", "rough"]);
    expect(stadeDemo("campfire", 2)).toBe("solid");
    expect(stadeDemo("campfire", 3)).toBe("grand");
    expect(stadeDemo("campfire", 12)).toBe("grand");
    for (const code of buildingCodes) {
      const premier = ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const).find((p) =>
        etatCarte(p, false).montres.includes(code),
      );
      assert(premier);
      expect([code, stadeDemo(code, premier)]).toEqual([code, "rough"]);
      expect([code, stadeDemo(code, 12)]).toEqual([code, batiments[code].stades.at(-1)]);
      expect([code, stadeDemo(code, Math.min(12, premier + 1) as VillageTier)]).toEqual([
        code,
        premier === 12 ? "rough" : batiments[code].stades[1],
      ]);
      // Ahead of its plot ("Tous debout"), a building is rough.
      expect([code, stadeDemo(code, 1)]).toEqual([code, "rough"]);
    }
  });

  test("an image's anchor lands on its footprint's bottom corner, the sails' centre on the pivot", () => {
    const s = spriteDe("forge", "solid");
    assert(s);
    const r = pose("forge", s);
    const k = r.w / s.size[0];
    expect(k).toBeCloseTo(COTE / spec.S);
    const { coin, emprise } = emplacements.forge;
    const [x, y] = ecranXY([coin[0] + emprise[0], coin[1] + emprise[1]]);
    expect(r.x + s.anchor[0] * k).toBeCloseTo(x);
    expect(r.y + s.anchor[1] * k).toBeCloseTo(y);

    const m = spriteDe("windmill", "grand");
    const ailes = MAQUETTES["windmill_sails.webp"];
    assert(m?.ailes && ailes);
    const corps = pose("windmill", m);
    const ra = poseAiles(corps, m, ailes);
    assert(ra);
    expect(ra.x + ra.w / 2).toBeCloseTo(corps.x + m.ailes.pivot[0] * k);
    expect(ra.y + ra.h / 2).toBeCloseTo(corps.y + m.ailes.pivot[1] * k);
    expect(ra.w).toBeCloseTo(ailes.size[0] * k * m.ailes.echelle);
  });
});

describe("exported anchor points have the shape PointsAccroche declares", () => {
  test("px [x, y], grid [gx, gy, z], faite porte cheminee nullable, avantToits a list", () => {
    const anchors = readdirSync(path.join(RACINE, RENDUS)).filter((f) =>
      f.endsWith(".anchor.json"),
    );
    expect(anchors.length).toBeGreaterThan(0);
    for (const f of anchors) {
      const pa = lire(`${RENDUS}/${f}`).pointsAccroche as Record<string, Record<string, unknown>>;
      for (const [forme, n] of [
        ["px", 2],
        ["grid", 3],
      ] as const) {
        const pts = pa[forme] ?? {};
        const point = (p: unknown) =>
          Array.isArray(p) && p.length === n && p.every((c) => typeof c === "number");
        expect([f, forme, Object.keys(pts).toSorted()]).toEqual([
          f,
          forme,
          ["avantToits", "cheminee", "faite", "porte"],
        ]);
        for (const nom of ["faite", "porte", "cheminee"])
          expect([f, forme, nom, pts[nom] === null || point(pts[nom])]).toEqual([
            f,
            forme,
            nom,
            true,
          ]);
        const avant = pts.avantToits;
        expect([f, forme, Array.isArray(avant) && avant.every(point)]).toEqual([f, forme, true]);
      }
    }
  });
});
