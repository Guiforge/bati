import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";

import type { Chain } from "@/db/exercises";
import { readPath } from "@/db/paths";
import { useSettingsStore } from "@/stores/settings";

/**
 * A named route up the variation ladder, in one line and one bar.
 *
 * Segments, not a list of named nodes: a dedicated "my path" screen was designed and dropped for
 * showing a wall of unlit movements, and the same wall would be no kinder inside a card. The
 * caption carries the meaning in words, so the colours reinforce it rather than carry it alone.
 *
 * Promoted here on its second consumer — the exercise screen and the oath card — per the
 * design-system rule that a pattern is shared before it is copied.
 */
export function PathStrip({ chain }: { chain: Chain }) {
  const language = useSettingsStore((s) => s.language);
  const { t } = useTranslation();

  const { total, isClimbed, name } = readPath(chain, language);
  if (name === null) return null;

  const caption = isClimbed
    ? t("exercises.path_climbed", { path: name, defaultValue: `${name} · Climbed` })
    : t("exercises.path_rung", {
        path: name,
        position: chain.position,
        total,
        defaultValue: `${name} · Rung ${chain.position}/${total}`,
      });

  return (
    <YStack gap="$2">
      <Text fontWeight="700" fontSize={13} color="$text" opacity={0.5} flex={1}>
        {caption.toUpperCase()}
      </Text>

      <XStack gap="$1" accessibilityLabel={caption}>
        {chain.rungs.map((rung, index) => (
          <YStack
            key={rung.exercise.id}
            flex={1}
            height={4}
            rounded="$1"
            bg={
              isClimbed || index < chain.position - 1
                ? "$resourceGold"
                : index === chain.position - 1
                  ? "$primary"
                  : "$borderStrong"
            }
          />
        ))}
      </XStack>
    </YStack>
  );
}
