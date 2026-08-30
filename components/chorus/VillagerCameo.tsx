import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, XStack, YStack } from "tamagui";

import { Card } from "@/components/common/Card";
import { getVillagerAsset } from "@/constants/assetMap";
import { CAMEO_LINGER_MS, MOMENT_CAST, TYPE_MS_PER_CHAR } from "@/constants/villagers";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useChorusStore } from "@/stores/chorus";
import { cameoBottomOffset, cameoMaxHeight } from "./cameoAnchor";

/**
 * The one place a villager is ever drawn.
 *
 * Mounted once, as a sibling of the router's `<Slot />` in app/_layout.tsx, which is the same
 * trick BossTauntOverlay plays inside app/session.tsx — one host above every view, reading a
 * store — moved one level up so the tabs get it too. Nothing else in the app renders a villager,
 * and no screen knows which one answered its cue.
 *
 * The source art is 3:4 and carries an alpha channel (scripts/cutout.py), so the figure lands on
 * whatever is behind it with no seam. Height comes from `cameoMaxHeight`; width follows the aspect
 * ratio rather than being given, because a cameo that is the wrong shape crops the face off.
 *
 * ## What is tappable
 *
 * The figure and the bubble, always: a villager you can see talking is a villager you can send
 * away, whatever brought them. A guide or an event types itself out, so there the first tap
 * finishes the line and the second sends it away; an ambient line is whole from the first frame,
 * so its first tap already sends it away.
 *
 * Nothing *else* on this layer takes a touch — the container stays `box-none` — and the safe zone
 * is still `cameoAnchor.ts`'s job: the figure sits above the band every screen puts its primary
 * button in, so what it does intercept is empty ground. That band is the whole promise now;
 * before, "the ambient bubble is inert" was carrying half of it, and it left the hero tapping a
 * villager who would not leave.
 */
export function VillagerCameo() {
  const current = useChorusStore((s) => s.current);
  const dismiss = useChorusStore((s) => s.dismiss);
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const line = current?.line ?? "";
  const priority = current ? MOMENT_CAST[current.moment].priority : "ambient";
  // Ambient lines never type: a villager glanced at between two sets must not be something the
  // hero has to finish reading. Tapping sends any of them away all the same.
  const types = priority !== "ambient" && !reducedMotion;

  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!(current && types)) {
      setRevealed(line.length);
      return;
    }

    // A local counter rather than a functional update that clears its own interval: a state
    // updater that has a side effect in it runs twice under StrictMode and types at double speed.
    setRevealed(0);
    let shown = 0;
    const typing = setInterval(() => {
      shown += 1;
      setRevealed(shown);
      if (shown >= line.length) clearInterval(typing);
    }, TYPE_MS_PER_CHAR);

    return () => clearInterval(typing);
  }, [current, types, line]);

  const finished = revealed >= line.length;

  useEffect(() => {
    if (!(current && finished)) return;
    const leaving = setTimeout(() => dismiss(current.id), CAMEO_LINGER_MS[priority]);
    return () => clearTimeout(leaving);
  }, [current, finished, priority, dismiss]);

  if (!current) return null;

  const figureHeight = cameoMaxHeight(width, height);
  const figureWidth = Math.round(figureHeight * 0.75);
  const bottom = cameoBottomOffset(insets.bottom);
  // One tap on a line still typing finishes it; one on a finished line ends the cameo.
  const onTap = () => (finished ? dismiss(current.id) : setRevealed(line.length));

  const bubble = (
    <Card
      bg="$surface"
      p="$3"
      rounded="$4"
      borderWidth={1}
      borderColor="$borderStrong"
      maxW={width - figureWidth - 40}
      mt="$2"
      style={{ borderBottomLeftRadius: 0 }}
    >
      {/* The rest of the line is rendered transparent rather than omitted, so the bubble is its
          final size from the first character and does not grow line by line under the reader's
          eye. `accessible={false}` keeps the half-typed text out of the accessibility tree — the
          Pressable around it carries the whole sentence as its label instead. */}
      <Paragraph color="$text" fontWeight="700" fontSize={14} accessible={false}>
        <Paragraph testID="villager-line" color="$text" fontWeight="700" fontSize={14}>
          {line.slice(0, revealed)}
        </Paragraph>
        <Paragraph color="transparent" fontWeight="700" fontSize={14}>
          {line.slice(revealed)}
        </Paragraph>
      </Paragraph>
    </Card>
  );

  return (
    <YStack
      testID="villager-cameo"
      position="absolute"
      // Never the whole layer: only the bubble may take a tap, and only when it is not ambient.
      pointerEvents="box-none"
      b={bottom}
      l={0}
      r={0}
      z={900}
      transition={reducedMotion ? undefined : "bouncy"}
      enterStyle={reducedMotion ? undefined : { opacity: 0, y: 48 }}
    >
      <XStack px="$3" gap="$2" items="flex-start" pointerEvents="box-none">
        {/* Tappable, but never in the accessibility tree: the bubble beside it already carries
            the sentence and the same dismiss action, and a screen reader announcing the drawing
            as a second button would only offer the same thing twice. */}
        <Pressable
          testID="villager-figure"
          onPress={onTap}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Image
            source={getVillagerAsset(current.villager, current.pose)}
            style={{ width: figureWidth, height: figureHeight }}
            contentFit="contain"
            pointerEvents="none"
          />
        </Pressable>
        <Pressable
          testID="villager-bubble"
          onPress={onTap}
          accessibilityRole="button"
          // The whole line, not the part typed so far: a label that changes every 24ms is
          // unusable, and a screen reader should get the sentence at once.
          accessibilityLabel={line}
        >
          {bubble}
        </Pressable>
      </XStack>
    </YStack>
  );
}
