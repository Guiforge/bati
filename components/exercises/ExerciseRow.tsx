import { Image } from "expo-image";
import type { ReactNode } from "react";
import { Text, XStack, type XStackProps, YStack } from "tamagui";

import type { getExerciseThumb } from "@/constants/assetMap";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import type { Exercise } from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
import { localizedName } from "@/src/i18n/localized";
import type { AppLanguage } from "@/stores/settings";

const THUMB_STYLE = { width: "100%", height: "100%" } as const;

type Props = {
  exercise: Exercise;
  language: AppLanguage;
  /**
   * Resolved by the caller, not here: the asset lookup is a split + regex, and doing it in the
   * row re-ran it for every recycled row on every keystroke. Parents key one map on the stable
   * full list instead.
   */
  thumb: ReturnType<typeof getExerciseThumb>;
  /** A third line under the muscles — the catalogue's "leads to" ladder marker. */
  caption?: ReactNode;
  /** Right-hand affordance: the picker's add button + count, the catalogue's chevron. */
  trailing?: ReactNode;
  accessibilityLabel: string;
  /** Highlight, e.g. the picker's "already in this quest" outline. */
  borderColor?: XStackProps["borderColor"];
  onPress: () => void;
};

/**
 * One movement, as a list row. Shared by the quest editor's picker sheet and the catalogue so
 * the two read as the same object seen twice — the row was written once and copied, which is
 * how the picker ended up with its own name ternary.
 */
export function ExerciseRow({
  exercise,
  language,
  thumb,
  caption,
  trailing,
  accessibilityLabel,
  borderColor = "$borderStrong",
  onPress,
}: Props) {
  const subtitle = [
    ...exercise.muscles.map((m) => MUSCLE_LABELS[m]?.[language] ?? m),
    EQUIPMENT_LABELS[exercise.equipment]?.[language] ?? exercise.equipment,
  ].join(" · ");

  return (
    <XStack
      items="center"
      gap="$3"
      p="$2"
      rounded="$6"
      bg="$background"
      borderWidth={1}
      borderColor={borderColor}
      pressStyle={{ opacity: 0.92, scale: 0.99 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
    >
      <YStack width={56} height={56} rounded="$4" overflow="hidden" bg="$surface">
        <Image
          source={thumb}
          recyclingKey={String(exercise.id)}
          style={THUMB_STYLE}
          contentFit="cover"
          transition={0}
          accessible={false}
        />
      </YStack>

      <YStack flex={1} gap="$1">
        <Text fontWeight="700" fontSize={15} color="$text" numberOfLines={1}>
          {localizedName(exercise, language)}
        </Text>
        <Text fontSize={12} color="$textSecondary" numberOfLines={1}>
          {subtitle}
        </Text>
        {caption}
      </YStack>

      {trailing}
    </XStack>
  );
}
