import { useCallback, useState } from "react";
import { PanResponder, ScrollView } from "react-native";
import { YStack } from "tamagui";
import { useComebackCue, useScreenGuide } from "@/components/chorus/screenCues";
import { VillagerLine } from "@/components/chorus/VillagerLine";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeStage } from "@/components/home/HomeStage";
import { NoticeSlot } from "@/components/home/NoticeSlot";
import { QuickActions } from "@/components/home/QuickActions";
import { type Disclosure, disclosure } from "@/db/disclosure";
import { useReloadOnChange } from "@/hooks/useReloadOnChange";

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
/** How far a finger travels, in dp, before the touch stops being a tap. Android's own slop is 8. */
const DRAG_SLOP = 10;

/**
 * A drag is never a press, on a Home that has nothing to scroll.
 *
 * Tamagui's Android press handler (`mainThreadPressEvents`) fires `onPress` on release with no
 * distance check: it counts on a scroll view taking the touch away first. In a list one does.
 * Home fits its viewport on most phones, so its `ScrollView` never scrolls and never takes the
 * touch: a thumb swiping up the scene opened the quest screen, and the same swipe started on an
 * outing tile started the outing. The Fairphone audit's "Home scrolls at 29 ms" was that quest
 * screen opening under the swipe.
 *
 * So the screen claims any touch that has moved past the slop, which terminates the press under it
 * (Tamagui's pressables accept termination), and blocks nothing: the native scroll views keep
 * scrolling, and either one takes the touch back when it asks.
 *
 * ponytail: Home only. Any Tamagui pressable on a screen that does not scroll has the same bug;
 * move this to the root layout (minding sheets that drag) when another screen shows it.
 */
const dragCancelsPress = PanResponder.create({
  onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
    Math.abs(dx) > DRAG_SLOP || Math.abs(dy) > DRAG_SLOP,
  onShouldBlockNativeResponder: () => false,
}).panHandlers;

export default function HomeScreen() {
  useScreenGuide("guide_home");
  // Only fires after a real absence, and never mentions it. See components/chorus/screenCues.ts.
  useComebackCue();
  // What the journal says Home may show yet, read once and handed down; null while it loads.
  const [disclosed, setDisclosed] = useState<Disclosure | null>(null);
  useReloadOnChange(
    "home.disclosure",
    useCallback(() => disclosure().then(setDisclosed), []),
  );

  // Bumped when the light week is accepted or ended: the note and the tiles price their rounds off
  // it, and are keyed on it so they read it again instead of waiting for the next focus.
  const [weekRev, setWeekRev] = useState(0);
  const weekChanged = useCallback(() => setWeekRev((r) => r + 1), []);

  return (
    <YStack testID="home-screen" flex={1} bg="$background" {...dragCancelsPress}>
      {/* The whole top chrome: identity, level, XP, streak, village. Owns the top inset. */}
      <HomeHeader showLevel={disclosed?.level ?? null} />
      <VillagerLine owner="home" />

      {/* Grows to the viewport and scrolls only past it: the scene takes what the strip and the
          quick actions leave, and a recovery card above it pushes the column rather than crushing
          the scene. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* One notice at a time, the first in noticeOrder.ts: an interrupted session outranks
            sync, the notes, an update, the backup and the reminders. Keyed on the week: an
            answer must re-read the slot, and the React Compiler drops a dependency the focus
            callback does not read, so a prop in its deps never re-ran it. */}
        <NoticeSlot key={weekRev} onLightWeekAnswered={weekChanged} />

        {/* Tonight's scene, one action that starts it, the rest advice and the oath under it */}
        <HomeStage key={weekRev} oathStrip={disclosed?.oathStrip ?? null} />

        {/* The doors out, and the last quest again, in the thumb's reach */}
        <QuickActions key={weekRev} showGoals={disclosed?.outingGoals ?? null} />
      </ScrollView>
    </YStack>
  );
}
