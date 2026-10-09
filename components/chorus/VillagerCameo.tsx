import { Image } from "expo-image";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, useWindowDimensions } from "react-native";
import { Paragraph, Text, View, XStack, YStack } from "tamagui";

import { getVillagerAsset } from "@/constants/assetMap";
import { cameoLingerMs, MOMENT_CAST } from "@/constants/villagers";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useChorusStore } from "@/stores/chorus";
import type { CameoBand } from "./cameoAnchor";
import { useCueOwner } from "./useCueOwner";
import { useGuideSeen } from "./useGuideSeen";
import { useTypedLine } from "./useTypedLine";

/**
 * The villager's figure, drawn only by the Village scene, inside the hero painting (above its
 * title, `cameoBand`), so it stands on the painting, scrolls with it and never reaches the cards
 * below. It is the one screen with a painting to stand on. Everywhere else a villager is a line in the flow, `VillagerLine`;
 * `__tests__/villager-figure-village-only.test.ts` fails if anything else renders this, or if it
 * leaves the hero.
 *
 * The source art is 3:4 and carries an alpha channel (scripts/cutout.py), so the figure lands on
 * whatever is behind it with no seam. Height comes from `cameoMaxHeight`; width follows the aspect
 * ratio rather than being given, because a cameo that is the wrong shape crops the face off.
 *
 * ## Touch
 *
 * Figure and bubble are one zone, a real view across the whole painting band where the villager stands
 * (not a hitSlop, which loses to an adjacent sibling). A press in it sends the villager away on
 * touch down and stops there: nothing underneath receives it. A touch anywhere else on the Village
 * reaches the screen as usual and also sends the villager away, through the capture the screen
 * puts on its own root (`dismissVillagerOnTouch`). There is no "first tap finishes the line".
 *
 * For a screen reader the zone is a button, "Send away", whose hint carries the whole sentence.
 * The typed text itself stays out of the tree.
 */
export function VillagerCameo({ band }: { band: CameoBand | null }) {
  const { t } = useTranslation();
  const current = useChorusStore((s) => s.current);
  const dismiss = useChorusStore((s) => s.dismiss);
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const focused = useCueOwner("village");

  // Only the Village's own cue, and only while the Village is focused: tab screens stay mounted,
  // and an unfocused Village used to type (re-render every 24 ms) and dismiss other screens' cues.
  const mine = focused && current?.owner === "village" ? current : null;
  const { shown, rest, done } = useTypedLine(mine);
  // Only once there is room to draw it: with no band the figure dismisses itself below.
  useGuideSeen(band ? mine : null);
  const name = mine ? t(`villagers.names.${mine.villager}`) : "";

  // Focused but no room for a figure: nobody comes rather than someone over the title.
  useEffect(() => {
    if (mine && !band) dismiss(mine.id);
  }, [mine, band, dismiss]);

  // Measured from the end of the typing, so the longest lines are not given the least time to read.
  useEffect(() => {
    if (!(mine && done)) return;
    const leaving = setTimeout(
      () => dismiss(mine.id),
      cameoLingerMs(mine.line, MOMENT_CAST[mine.moment].priority),
    );
    return () => clearTimeout(leaving);
  }, [mine, done, dismiss]);

  if (!(mine && band)) return null;
  const current_ = mine;

  const figureHeight = band.figureHeight;
  const figureWidth = Math.round(figureHeight * 0.75);

  return (
    <YStack
      testID="villager-cameo"
      position="absolute"
      t={band.top}
      height={band.height}
      overflow="hidden"
      justify="flex-end"
      l={0}
      r={0}
      z={900}
      transition={reducedMotion ? undefined : "bouncy"}
      enterStyle={reducedMotion ? undefined : { opacity: 0, y: 48 }}
    >
      <Pressable
        testID="villager-zone"
        onPressIn={() => dismiss(current_.id)}
        // An accessibility activation (TalkBack, VoiceOver) calls `onPress` and never `onPressIn`.
        onPress={() => dismiss(current_.id)}
        accessibilityRole="button"
        // The whole sentence, not the part typed so far: a label that changes every 24ms is
        // unusable, and a screen reader should get the line at once. In the label, not the hint,
        // because a user with hints off must still hear what was said.
        accessibilityLabel={`${name}. ${current_.line}`}
        accessibilityHint={t("villagers.send_away")}
        style={{ paddingHorizontal: 12, height: "100%", justifyContent: "flex-end" }}
      >
        <XStack gap="$2" items="flex-end">
          <Image
            testID="villager-figure"
            source={getVillagerAsset(current_.villager, current_.pose)}
            style={{ width: figureWidth, height: figureHeight }}
            contentFit="contain"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <YStack
            testID="villager-bubble"
            bg="$parchment"
            p="$3"
            rounded="$1"
            maxW={Math.min(width - figureWidth - 40, Math.round(width * 0.42))}
            // Pinned to the top of the band while the figure keeps its place: on day one the line
            // points at the cabin roof, and a bubble at the figure's feet sat on it. Narrow and
            // to the right, so the painting's centre stays clear: a wide bubble hid the capital's
            // spire, the thing three years of training built (villager audit, 2026-10-06).
            self="flex-start"
            ml="auto"
          >
            {/* The figure stands to the left and below, so the tail leaves the bubble's left edge
                near its foot, towards the head. */}
            <View
              position="absolute"
              l={-9}
              b={14}
              width={0}
              height={0}
              borderTopWidth={7}
              borderBottomWidth={7}
              borderRightWidth={9}
              borderTopColor="transparent"
              borderBottomColor="transparent"
              borderRightColor="$parchment"
            />
            <Text fontSize={12} fontWeight="700" color="$ink800" accessible={false}>
              {name}
            </Text>
            {/* The rest of the line is transparent rather than omitted, so the bubble is its final
                size from the first character. */}
            <Paragraph color="$bgDark" fontSize={14} accessible={false}>
              <Paragraph testID="villager-line" color="$bgDark" fontSize={14}>
                {shown}
              </Paragraph>
              <Paragraph color="transparent" fontSize={14}>
                {rest}
              </Paragraph>
            </Paragraph>
          </YStack>
        </XStack>
      </Pressable>
    </YStack>
  );
}
