// The resting poses of the inhabitants (T40), one table: where a pose is taken, from which tier, and
// its image. Every image is the painted sprite (assets/images/village/iso/repos/, FLUX 3, accepted at
// the fresh-eyes review) on the mock-up's canvas, so anchor and pxScale are the mock-up's, copied
// from its anchor.json. The app recolours the bodies like the standing sprites (HabitantVue).

import type { SpriteIso } from "./isoSpec";
import type { Lieu } from "./marcheurs";

export type LieuPose = Lieu | "batiment";
export type IdPose =
  | "balaie"
  | "assis_tonneau"
  | "porte_panier"
  | "lit"
  | "dort"
  | "discutent"
  | "range_caisses"
  | "puise"
  | "regarde_loin";

export type PoseRepos = {
  id: IdPose;
  /** Where the habitant stands for it: the place it was drawn from, or any building. */
  lieux: readonly LieuPose[];
  /** The first tier where it can be drawn. */
  palier: number;
  /** What it needs next to the habitant: a cat within two cells, or a free neighbour (the pair), or the cell right in front of its building's wall. */
  exige?: "voisin" | "mur";
  image: SpriteIso;
  /** The figure's box on its canvas, px: x0, y0, x1, y1, from the opaque pixels (alpha above 40) of the image. What a touch aims at. */
  corps: readonly [x0: number, y0: number, x1: number, y1: number];
};

const sprite = (image: number, anchor: [number, number], pxScale: number): SpriteIso => ({
  image,
  anchor,
  size: [768, 768],
  pxScale,
  ombre: [],
});

export const POSES_REPOS: readonly PoseRepos[] = [
  {
    id: "balaie",
    corps: [190, 75, 583, 689],
    lieux: ["porte", "batiment"],
    palier: 1,
    image: sprite(
      require("@/assets/images/village/iso/repos/repos_balaie.webp"),
      [287, 575],
      4.676,
    ),
  },
  {
    id: "assis_tonneau",
    corps: [232, 94, 536, 682],
    lieux: ["campfire", "place"],
    palier: 1,
    image: sprite(
      require("@/assets/images/village/iso/repos/repos_assis_tonneau.webp"),
      [384, 626],
      4.857,
    ),
  },
  {
    id: "porte_panier",
    corps: [96, 71, 691, 697],
    lieux: ["place", "porte"],
    palier: 1,
    image: sprite(
      require("@/assets/images/village/iso/repos/repos_porte_panier.webp"),
      [383, 671],
      5.125,
    ),
  },
  {
    id: "lit",
    corps: [199, 77, 569, 691],
    lieux: ["place", "batiment"],
    palier: 3,
    image: sprite(require("@/assets/images/village/iso/repos/repos_lit.webp"), [384, 670], 5.548),
  },
  {
    id: "dort",
    corps: [184, 59, 573, 664],
    lieux: ["batiment"],
    palier: 5,
    exige: "mur",
    image: sprite(require("@/assets/images/village/iso/repos/repos_dort.webp"), [384, 563], 4.816),
  },
  {
    id: "discutent",
    corps: [62, 75, 706, 686],
    lieux: ["place", "porte"],
    palier: 6,
    exige: "voisin",
    image: sprite(
      require("@/assets/images/village/iso/repos/repos_discutent.webp"),
      [384, 648],
      4.926,
    ),
  },
  {
    id: "range_caisses",
    corps: [22, 86, 730, 664],
    lieux: ["farm", "barn"],
    palier: 7,
    image: sprite(
      require("@/assets/images/village/iso/repos/repos_range_caisses.webp"),
      [540, 578],
      6.173,
    ),
  },
  {
    id: "puise",
    corps: [131, 76, 637, 692],
    lieux: ["well"],
    palier: 8,
    image: sprite(require("@/assets/images/village/iso/repos/repos_puise.webp"), [496, 445], 3.768),
  },
  {
    id: "regarde_loin",
    corps: [113, 76, 655, 692],
    lieux: ["porte"],
    palier: 9,
    image: sprite(
      require("@/assets/images/village/iso/repos/repos_regarde_loin.webp"),
      [314, 535],
      4.412,
    ),
  },
];

export const poseDe = (id: IdPose | undefined): PoseRepos | undefined =>
  POSES_REPOS.find((p) => p.id === id);

/**
 * The pose's touch box on the map, dp: its figure's box on the canvas drawn in `rect`, mirrored
 * about the canvas's centre when the figure is turned, and grown about its centre to `mini` dp a
 * side so a small figure stays a finger's target (T40: not the standing figure's box, which a
 * sleeper lying low never fills).
 */
export function boiteDePose(
  p: PoseRepos,
  rect: { x: number; y: number; w: number; h: number },
  miroir: boolean,
  mini: number,
): readonly [x0: number, y0: number, x1: number, y1: number] {
  const [x0, y0, x1, y1] = p.corps;
  const [kx, ky] = [rect.w / p.image.size[0], rect.h / p.image.size[1]];
  const [a, b] = miroir ? [p.image.size[0] - x1, p.image.size[0] - x0] : [x0, x1];
  const [bx0, bx1] = [rect.x + a * kx, rect.x + b * kx];
  const [by0, by1] = [rect.y + y0 * ky, rect.y + y1 * ky];
  const [gx, gy] = [Math.max(0, mini - (bx1 - bx0)) / 2, Math.max(0, mini - (by1 - by0)) / 2];
  return [bx0 - gx, by0 - gy, bx1 + gx, by1 + gy];
}
