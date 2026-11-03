// Which building a tap lands on: the sprite's tap mask (the sidecar's `mask`, kept in the image
// index as hex rows) read at the tapped pixel, the frontmost building first.

import type { VisualStage } from "@/constants/buildingStages";
import type { BuildingCode } from "@/db/schema";
import { ORDRE_CARTE, pose, type Rect, spriteDe } from "./carteDemo";
import { boiteMarteau } from "./fierte";
import type { Case } from "./isoLayout";
import type { Stade } from "./isoSpec";
import { type Masque, opaque } from "./masque";
import { peintDe } from "./peints";
import { dessinPans, masquePan, montresDuTroncon, PANS_VECTORIELS, piecesPeintes } from "./rempart";

export { type Masque, opaque };

/**
 * The top centre of the mask's box, in sprite px: where a bubble's tail aims (decision of 30/10).
 * An empty mask gives the sprite's top centre.
 */
export function hautMasque(m: Masque): [u: number, v: number] {
  let haut = -1;
  let gauche = m.w;
  let droite = -1;
  for (let r = 0; r < m.h; r++) {
    for (let c = 0; c < m.w; c++) {
      if (!opaque(m, c * m.pas, r * m.pas)) continue;
      if (haut < 0) haut = r;
      gauche = Math.min(gauche, c);
      droite = Math.max(droite, c);
    }
  }
  if (haut < 0) return [(m.w * m.pas) / 2, 0];
  return [((gauche + droite + 1) * m.pas) / 2, haut * m.pas];
}

export type Cible = {
  code: BuildingCode;
  /** Where the sprite lies on the map, in dp. */
  rect: Rect;
  /** The sprite's size in px. */
  taille: readonly [w: number, h: number];
  masque: Masque;
  /** A section of castle_wall's wall (rempart.ts): a tap on it opens the wall, never the bubble's aim. */
  pan?: true;
  /** The hammer of a ready building: a tap on it opens that building, as a tap on its sprite. */
  marteau?: true;
};

/** A hammer's target is a little wider than its drawing: a thumb is not a pixel. */
const MARGE_MARTEAU = 0.25;
const PLEIN: Masque = { pas: 1, w: 1, h: 1, bits: "8" };
/** A painted wall piece's canvas, px (rempart.ts `TOILE_PAN` at 8 px a dp). */
const TAILLE_PIECE = [512, 640] as const;

/**
 * The shown buildings with a mask, back to front (the map's draw order). With the island, the
 * wall sections on show too, each as castle_wall: a tap on a section opens the wall (FIN-DIS).
 */
export function cibles(
  montres: readonly BuildingCode[],
  stade: (code: BuildingCode) => Stade,
  visible?: readonly (readonly boolean[])[],
  reclamables: readonly BuildingCode[] = [],
  /** The stage as painted (legendary, mythic): a painted building's mask is its own, taller one. */
  visuel?: (code: BuildingCode) => VisualStage,
): Cible[] {
  const affiches = new Set<BuildingCode>(montres);
  const liste = ORDRE_CARTE.flatMap((e): Cible[] => {
    if (e.type === "pan")
      return ciblesPan(
        visible ? montresDuTroncon(e.troncon, visible, montres) : [],
        stade("castle_wall"),
      );
    if (e.type !== "batiment") return [];
    const { code } = e;
    const s = !affiches.has(code)
      ? undefined
      : ((visuel && peintDe(code, visuel(code), "nuit")) ?? spriteDe(code, stade(code)));
    return s?.masque ? [{ code, rect: pose(code, s), taille: s.size, masque: s.masque }] : [];
  });
  // Last in the list, so tried first: the hammer sits over the sprites behind it.
  const marteaux = reclamables.flatMap((code): Cible[] => {
    const s = affiches.has(code) ? spriteDe(code, stade(code)) : undefined;
    if (!s) return [];
    const b = boiteMarteau(code, stade(code), s, pose(code, s));
    const m = b.w * MARGE_MARTEAU;
    const rect = { x: b.x - m, y: b.y - m, w: b.w + 2 * m, h: b.h + 2 * m };
    return [{ code, rect, taille: [1, 1], masque: PLEIN, marteau: true }];
  });
  return [...liste, ...marteaux];
}

/** A stretch's targets, each as castle_wall: one a painted piece (F4), or one a stretch for the fallback drawing. */
function ciblesPan(cases: readonly Case[], stade: Stade): Cible[] {
  if (!PANS_VECTORIELS)
    return piecesPeintes(cases, stade).map(({ rect, masque }) => ({
      code: "castle_wall",
      rect,
      taille: TAILLE_PIECE,
      masque,
      pan: true,
    }));
  const d = dessinPans(cases, stade);
  if (!d) return [];
  return [
    {
      code: "castle_wall",
      rect: d.rect,
      taille: [d.rect.w, d.rect.h],
      masque: masquePan(d),
      pan: true,
    },
  ];
}

/** The frontmost building whose mask is set under the map point `p` (dp), or null. */
export function batimentAuPoint(
  p: readonly [x: number, y: number],
  liste: readonly Cible[],
): BuildingCode | null {
  for (const { code, rect, taille, masque } of liste.toReversed()) {
    const u = ((p[0] - rect.x) / rect.w) * taille[0];
    const v = ((p[1] - rect.y) / rect.h) * taille[1];
    if (opaque(masque, u, v)) return code;
  }
  return null;
}

/** Where a bubble aims for building `code`, in map dp: the top centre of its mask's box. */
export function ancreBatiment(
  code: BuildingCode,
  liste: readonly Cible[],
): [number, number] | null {
  const c = liste.find((x) => x.code === code && !x.pan && !x.marteau);
  if (!c) return null;
  const [u, v] = hautMasque(c.masque);
  return [c.rect.x + (u / c.taille[0]) * c.rect.w, c.rect.y + (v / c.taille[1]) * c.rect.h];
}
