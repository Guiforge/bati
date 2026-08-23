import { Image } from "expo-image";
import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, XStack, YStack } from "tamagui";

import { Card } from "@/components/common/Card";
import { getVillagerAsset } from "@/constants/assetMap";
import { CAMEO_DURATION_MS, MOMENT_CAST } from "@/constants/villagers";
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
 * whatever is behind it — a surface card, the boss arena, a full-bleed exercise photo — with no
 * seam. Height comes from `cameoMaxHeight`; width follows the aspect ratio rather than being
 * given, because a cameo that is the wrong shape crops the face off.
 */
export function VillagerCameo() {
  const current = useChorusStore((s) => s.current);
  const dismiss = useChorusStore((s) => s.dismiss);
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  useEffect(() => {
    if (!current) return;
    const ms = CAMEO_DURATION_MS[MOMENT_CAST[current.moment].priority];
    const timer = setTimeout(() => dismiss(current.id), ms);
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  if (!current) return null;

  const figureHeight = cameoMaxHeight(width, height);
  const figureWidth = Math.round(figureHeight * 0.75);
  const bottom = cameoBottomOffset(insets.bottom);

  return (
    // Non-interactive, in full: a decorative figure must never swallow a tap aimed at the set
    // underneath it, and the whole safe-zone promise in PRODUCT.md ("never obstruct logging or
    // reading the next set") rests on this one prop being here.
    <YStack
      testID="villager-cameo"
      position="absolute"
      pointerEvents="none"
      b={bottom}
      l={0}
      r={0}
      z={900}
      transition={reducedMotion ? undefined : "bouncy"}
      enterStyle={reducedMotion ? undefined : { opacity: 0, y: 48 }}
    >
      <XStack px="$3" gap="$2" items="flex-start">
        <Image
          source={getVillagerAsset(current.villager, current.pose)}
          style={{ width: figureWidth, height: figureHeight }}
          contentFit="contain"
          // The figure is decoration; the line beside it is the content, and a screen reader
          // reading "image" before it adds nothing.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        {/* The tail's corner points back down at the villager's shoulder, the same way the boss
            taunt's points up at the portrait. */}
        <Card
          bg="$surface"
          p="$3"
          rounded="$4"
          borderWidth={1}
          borderColor="$borderStrong"
          // Whatever the figure leaves, minus the row's own padding and gap. The first version
          // subtracted a figure sized at the *ceiling*, which left 88dp — narrower than the word
          // "maintenant", so the bubble hyphenated mid-word down a nine-line column.
          maxW={width - figureWidth - 40}
          mt="$2"
          style={{ borderBottomLeftRadius: 0 }}
        >
          <Paragraph color="$text" fontWeight="700" fontSize={14}>
            {current.line}
          </Paragraph>
        </Card>
      </XStack>
    </YStack>
  );
}
