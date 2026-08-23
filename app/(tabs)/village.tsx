import { useEffect } from "react";

import { useScreenGuide } from "@/components/chorus/screenCues";
import { VillageScene } from "@/components/village/VillageScene";
import { useChorusStore } from "@/stores/chorus";

export default function VillagePage() {
  const cue = useChorusStore((s) => s.cue);

  useScreenGuide("guide_village");

  // The village was silent in the village — the layer's biggest thematic hole. Ambient, so it
  // shares the one-per-half-hour budget with the rest screen rather than adding to it: the promise
  // is one villager per window *wherever you are*, not one per surface.
  useEffect(() => {
    cue("village_visit");
  }, [cue]);

  return <VillageScene />;
}
