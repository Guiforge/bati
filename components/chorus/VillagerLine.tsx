import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Paragraph, Text, XStack, YStack } from "tamagui";

import { getVillagerAsset } from "@/constants/assetMap";
import { type CueOwner, useChorusStore } from "@/stores/chorus";
import { useCueOwner } from "./useCueOwner";
import { useTypedLine } from "./useTypedLine";

/**
 * A villager's line, in the flow of the screen that cued it, just under its header.
 *
 * Everywhere but the Village a villager is a line, not a figure: a line in the flow sits on top of
 * nothing, so it can never cover a control or take a tap meant for one. That was the whole bug of
 * the overlay it replaces (a tap on the figure rated a session "Too Easy" unseen), so this is
 * deliberately not tappable: no pressable, no responder, plain text for a screen reader.
 *
 * It draws only a cue it owns (`owner`, the screen that raised it) and only while that screen is
 * focused, with no linger timer, so content never jumps up under a finger. It sends its cue away
 * when the screen loses focus or unmounts (`useCueOwner`), and never touches anyone else's.
 *
 * `reserve` is for the victory banner, and is the slot's height: the cue fires after the save, so
 * the line cannot be known at the first frame, and a slot that appeared with it would push things
 * from under the finger. The slot is there from the first render, at that height, and the line is
 * clamped to three lines inside it. The caller sizes it, because it also lays out around it.
 */
export function VillagerLine({ owner, reserve }: { owner: CueOwner; reserve?: number }) {
  const { t } = useTranslation();
  const current = useChorusStore((s) => s.current);
  const focused = useCueOwner(owner);
  const speaking = focused && current?.owner === owner ? current : null;
  const { shown, rest } = useTypedLine(speaking);

  const block = speaking ? (
    <XStack
      testID="villager-line-block"
      accessible
      accessibilityLabel={`${t(`villagers.names.${speaking.villager}`)}. ${speaking.line}`}
      gap="$2"
      items="center"
      // In the banner the line sits over the artwork, so it gets its own ground; in a screen's
      // flow it is text on the page and needs none.
      {...(reserve != null ? { bg: "$glassBg", rounded: "$3", p: "$2" } : null)}
    >
      {/* The face, not the figure: at this size a full body is a smudge. */}
      <Image
        source={getVillagerAsset(speaking.villager, speaking.pose)}
        style={{ width: 44, height: 44, borderRadius: 22 }}
        contentFit="cover"
        contentPosition="top"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <YStack flex={1} minW={0}>
        {/* The speaker is the cue that this is speech; the line itself is regular weight, so it
            does not read as the screen's own instruction. */}
        <Text fontSize={12} fontWeight="700" color="$textSecondary" accessible={false}>
          {t(`villagers.names.${speaking.villager}`)}
        </Text>
        {/* The untyped remainder is transparent rather than omitted, so the line is its final
            size from the first character. */}
        <Paragraph
          color="$text"
          fontSize={14}
          lineHeight={18}
          numberOfLines={reserve != null ? 3 : undefined}
          accessible={false}
        >
          <Paragraph testID="villager-line" color="$text" fontSize={14} lineHeight={18}>
            {shown}
          </Paragraph>
          <Paragraph color="transparent" fontSize={14} lineHeight={18}>
            {rest}
          </Paragraph>
        </Paragraph>
      </YStack>
    </XStack>
  ) : null;

  if (reserve == null)
    return block ? (
      <YStack px="$4" pb="$2">
        {block}
      </YStack>
    ) : null;

  return (
    <YStack testID="villager-line-slot" height={reserve} overflow="hidden" justify="flex-start">
      {block}
    </YStack>
  );
}
