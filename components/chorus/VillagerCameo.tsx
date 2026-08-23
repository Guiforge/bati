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
 * ## What is tappable, and what is never
 *
 * The figure is inert, always. The *bubble* accepts a tap only for guides and events — never for
 * ambient. That line is the safe-zone promise: during a session, at rest, between two sets,
 * nothing this layer draws can intercept a tap meant for the screen underneath. A guide or an
 * event lands on a screen the hero is reading rather than working through, so there the bubble
 * behaves like a text box should: the first tap finishes the line, the second sends it away.
 */
export function VillagerCameo() {
  const current = useChorusStore((s) => s.current);
  const dismiss = useChorusStore((s) => s.dismiss);
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const line = current?.line ?? "";
  const priority = current ? MOMENT_CAST[current.moment].priority : "ambient";
  const interactive = priority !== "ambient";
  const types = interactive && !reducedMotion;

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
        <Image
          source={getVillagerAsset(current.villager, current.pose)}
          style={{ width: figureWidth, height: figureHeight }}
          contentFit="contain"
          pointerEvents="none"
          // The figure is decoration; the line beside it is the content, and a screen reader
          // reading "image" before it adds nothing.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        {interactive ? (
          <Pressable
            testID="villager-bubble"
            onPress={() => (finished ? dismiss(current.id) : setRevealed(line.length))}
            accessibilityRole="button"
            // The whole line, not the part typed so far: a label that changes every 24ms is
            // unusable, and a screen reader should get the sentence at once.
            accessibilityLabel={line}
          >
            {bubble}
          </Pressable>
        ) : (
          <YStack pointerEvents="none">{bubble}</YStack>
        )}
      </XStack>
    </YStack>
  );
}
