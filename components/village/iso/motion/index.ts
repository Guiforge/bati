// Every building's motion file, imported statically (Metro bundles the JSON, nothing is read by
// name at run time). A building with no entry here moves as it did: its `lights` drawn still.
// archery_range has none on purpose. The archery range's pale wind streaks (mythic
// stage, behind the targets) run across the shed and the tower, so a zone copy of them would drag
// the timber along; a `vent` there waits for the streaks to be painted on their own layer.

import type { BuildingCode } from "@/db/schema";
import armory from "./armory.json";
import barn from "./barn.json";
import campfire from "./campfire.json";
import castleWall from "./castle_wall.json";
import championArena from "./champion_arena.json";
import dragonLair from "./dragon_lair.json";
import druidGrove from "./druid_grove.json";
import farm from "./farm.json";
import forge from "./forge.json";
import fountain from "./fountain.json";
import heroesHall from "./heroes_hall.json";
import highRoad from "./high_road.json";
import observatory from "./observatory.json";
import quarry from "./quarry.json";
import tent from "./tent.json";
import trainingDummy from "./training_dummy.json";
import type { MouvementBld } from "./types";
import watchtower from "./watchtower.json";
import well from "./well.json";
import windmill from "./windmill.json";
import wizardTower from "./wizard_tower.json";

// shortcut: JSON widens "kind" to string, so neither a cast nor `satisfies` can check it at compile
// time (a correct file fails `satisfies` as well); iso-mouvement.test.ts checks every file instead.
export const MOUVEMENTS: Readonly<Partial<Record<BuildingCode, MouvementBld>>> = {
  armory: armory as unknown as MouvementBld,
  barn: barn as unknown as MouvementBld,
  campfire: campfire as unknown as MouvementBld,
  castle_wall: castleWall as unknown as MouvementBld,
  champion_arena: championArena as unknown as MouvementBld,
  dragon_lair: dragonLair as unknown as MouvementBld,
  druid_grove: druidGrove as unknown as MouvementBld,
  farm: farm as unknown as MouvementBld,
  forge: forge as unknown as MouvementBld,
  fountain: fountain as unknown as MouvementBld,
  heroes_hall: heroesHall as unknown as MouvementBld,
  high_road: highRoad as unknown as MouvementBld,
  observatory: observatory as unknown as MouvementBld,
  quarry: quarry as unknown as MouvementBld,
  tent: tent as unknown as MouvementBld,
  training_dummy: trainingDummy as unknown as MouvementBld,
  watchtower: watchtower as unknown as MouvementBld,
  well: well as unknown as MouvementBld,
  windmill: windmill as unknown as MouvementBld,
  wizard_tower: wizardTower as unknown as MouvementBld,
};
