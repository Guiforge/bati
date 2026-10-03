import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { dismissVillagerOnTouch } from "@/components/chorus/cameoTouch";
import { useAmbientVisit, useScreenGuide } from "@/components/chorus/screenCues";
import { useCueOwner } from "@/components/chorus/useCueOwner";
import { VillageScene } from "@/components/village/VillageScene";
import { villageCameoBand } from "@/components/village/villageArt";

export default function VillagePage() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Neither cue fires on a window with no room for the figure: a guide marked seen and never drawn
  // is a tutorial burnt unread.
  const canShow = villageCameoBand(width, height, insets.top) !== null;
  useScreenGuide("guide_village", { enabled: canShow });
  useAmbientVisit("village_visit", { enabled: canShow });
  // This page outlives the scene (a skeleton while it loads), so it, not the figure, owns the cue.
  useCueOwner("village");

  return (
    // Watches every touch on its way down, never takes one: a touch anywhere but on the villager
    // reaches the screen as usual, and the villager leaves too. The figure itself stands in the
    // scene's painting (VillageScene), the only floating villager in the app.
    <View
      testID="village-touch-watch"
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={dismissVillagerOnTouch}
    >
      <VillageScene />
    </View>
  );
}
