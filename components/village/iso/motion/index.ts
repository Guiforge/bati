// Every building's motion file, imported statically (Metro bundles the JSON, nothing is read by
// name at run time). A building with no entry here moves as it did: its `lights` drawn still.

import type { BuildingCode } from "@/db/schema";
import forge from "./forge.json";
import fountain from "./fountain.json";
import type { MouvementBld } from "./types";
import windmill from "./windmill.json";

export const MOUVEMENTS: Readonly<Partial<Record<BuildingCode, MouvementBld>>> = {
  forge: forge as unknown as MouvementBld,
  windmill: windmill as unknown as MouvementBld,
  fountain: fountain as unknown as MouvementBld,
};
