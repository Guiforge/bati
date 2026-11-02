import type { BuildingData } from "../buildingData";

// The engine's test building: the windmill's code and its existing stages, no new art. Every
// sprite is null, so the engine draws placeholders. Ranks follow the ten-rank ladder of
// constants/buildingStages.ts (rough 1-2, solid 3-4, grand 5-6, legendary 7-9, mythic 10).
export const batimentEssai: BuildingData = {
  code: "windmill",
  placeholder: true,
  addOns: [
    { rank: 2, sprite: null, anchorOffset: [-40, 6], layer: "front", animation: null },
    { rank: 4, sprite: null, anchorOffset: [38, 4], layer: "behind", animation: null },
    { rank: 6, sprite: null, anchorOffset: [-52, 0], layer: "front", animation: null },
    { rank: 8, sprite: null, anchorOffset: [54, -4], layer: "front", animation: null },
  ],
  gag: {
    slot: [30, 140],
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
    { kind: "fire", at: [64, 118], fromRank: 3 },
    { kind: "crystal", at: [96, 30], fromRank: 7 },
    { kind: "beam", at: [96, 12], fromRank: 10 },
  ],
  clanMark: [112, 40],
  teasers: [
    { fromRank: 2, untilRank: 3, sprite: null, anchorOffset: [60, -10] },
    { fromRank: 4, untilRank: 5, sprite: null, anchorOffset: [60, -30] },
    { fromRank: 6, untilRank: 7, sprite: null, anchorOffset: [60, -50] },
    { fromRank: 8, untilRank: 9, sprite: null, anchorOffset: [60, -70] },
    { fromRank: 9, untilRank: 10, sprite: null, anchorOffset: [60, -90] },
  ],
  nightSprite: { fromRank: 7, sprite: null, anchorOffset: [-70, -90] },
  guardian: { fromRank: 1, at: [20, 150], sprite: null },
};
