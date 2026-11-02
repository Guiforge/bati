import type { BuildingData } from "../buildingData";

// The engine's test building: the windmill's code and its existing stages, no new art. Every
// sprite is null, so the engine draws placeholders. Ranks follow the ten-rank ladder of
// constants/buildingStages.ts (rough 1-2, solid 3-4, grand 5-6, legendary 7-9, mythic 10).
//
// Coordinates are px on the REAL canvas of the windmill, 896 x 1344, which the map draws at 1/8
// (48 dp a cell over 384 px): the tower's axis is x = 448 px, 56 dp. Offsets are from the sprite's
// anchor, the rest are absolute in the canvas. The placeholders are sized in dp, not in canvas px.
export const batimentEssai: BuildingData = {
  code: "windmill",
  placeholder: true,
  addOns: [
    { rank: 2, sprite: null, anchorOffset: [-320, 48], layer: "front", animation: null },
    { rank: 4, sprite: null, anchorOffset: [304, 32], layer: "behind", animation: null },
    { rank: 6, sprite: null, anchorOffset: [-416, 0], layer: "front", animation: null },
    { rank: 8, sprite: null, anchorOffset: [432, -32], layer: "front", animation: null },
  ],
  gag: {
    slot: [240, 1120],
    beats: [
      { rank: 1, beat: "A sack leans on the door.", sprite: null },
      { rank: 2, beat: "The sack slides down.", sprite: null },
      { rank: 4, beat: "The keeper tries to catch it.", sprite: null },
      { rank: 6, beat: "The sack rides a wheelbarrow.", sprite: null },
      { rank: 8, beat: "The wheelbarrow rides the keeper.", sprite: null },
      { rank: 10, beat: "Everyone watches the sack fly.", sprite: null },
    ],
  },
  lights: [
    { kind: "fire", at: [512, 944], fromRank: 3 },
    { kind: "crystal", at: [448, 240], fromRank: 7 },
    { kind: "beam", at: [448, 96], fromRank: 10 },
  ],
  clanMark: [592, 320],
  teasers: [
    { fromRank: 2, untilRank: 3, sprite: null, anchorOffset: [480, -80] },
    { fromRank: 4, untilRank: 5, sprite: null, anchorOffset: [480, -240] },
    { fromRank: 6, untilRank: 7, sprite: null, anchorOffset: [480, -400] },
    { fromRank: 8, untilRank: 9, sprite: null, anchorOffset: [480, -560] },
    { fromRank: 9, untilRank: 10, sprite: null, anchorOffset: [480, -720] },
  ],
  nightSprites: [{ fromRank: 7, sprite: null, anchorOffset: [-560, -720] }],
  guardian: { fromRank: 1, at: [160, 1200], sprite: null },
};
