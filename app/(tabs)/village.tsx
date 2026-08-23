import { useAmbientVisit, useScreenGuide } from "@/components/chorus/screenCues";
import { VillageScene } from "@/components/village/VillageScene";

export default function VillagePage() {
  useScreenGuide("guide_village");
  useAmbientVisit("village_visit");

  return <VillageScene />;
}
