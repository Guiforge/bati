import { ScrollView } from "react-native";
import { YStack } from "tamagui";
import { useComebackCue, useScreenGuide } from "@/components/chorus/screenCues";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeStage } from "@/components/home/HomeStage";
import { QuickActions } from "@/components/home/QuickActions";
import { SessionRecoveryBanner } from "@/components/session/SessionRecoveryCard";

/**
 * THESIS: Home is the hero's HUD. One strip of status, one scene to walk into, one row of doors.
 * The chrome is a 52 dp strip and the tab bar; the scene takes everything else, full bleed, with
 * the only filled button on the screen. Gold only for what progresses: XP, flame, the oath's rungs.
 * FIRST VIEWPORT: all of it, without scrolling, down to 360x640.
 * SOURCE: the "Bati Home Redesign" design, direction 2d (scene and thumb row from B, the strip
 * that absorbs the village from C).
 * GONE, on purpose: the village band (the tab under it said the same; the strip keeps a crest) and
 * the lifetime stats line (a journal fact, neither an action nor a direction).
 */
export default function HomeScreen() {
  useScreenGuide("guide_home");
  // Only fires after a real absence, and never mentions it. See components/chorus/screenCues.ts.
  useComebackCue();

  return (
    <YStack flex={1} bg="$background">
      {/* The whole top chrome: identity, level, XP, streak, village. Owns the top inset. */}
      <HomeHeader />

      {/* Grows to the viewport and scrolls only past it: the scene takes what the strip and the
          quick actions leave, and a recovery card above it pushes the column rather than crushing
          the scene. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* An interrupted session outranks any suggestion. It renders nothing when there is none
            to resume. Without it, quitting mid-quest left no trace anywhere. */}
        <SessionRecoveryBanner />

        {/* Tonight's scene, one action that starts it, the rest advice and the oath under it */}
        <HomeStage />

        {/* The doors out, and the last quest again, in the thumb's reach */}
        <QuickActions />
      </ScrollView>
    </YStack>
  );
}
