import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack } from "tamagui";
import { GameIcon } from "@/components/common/GameIcon";
import { getRestSuggestion, type RestSuggestion } from "@/db/restSuggestions";

/**
 * The one thing Home says that is not an invitation to train.
 *
 * Deliberately not a branch of `useSmartAction`: the primary button must never read "do not train
 * tonight". Five days in a row is worth mentioning, and it is still the hero's call — so this is a
 * line under the stage, not a gate in front of it.
 */
export function RestNote() {
  const { t } = useTranslation();
  const [suggestion, setSuggestion] = useState<RestSuggestion | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      getRestSuggestion()
        .then((result) => {
          if (!cancelled) setSuggestion(result.shouldRest ? result : null);
        })
        .catch(() => {
          // The line simply does not appear; nothing else on Home depends on it.
        });

      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (!suggestion) return null;

  // Both counts feed the same `{{count}}` slot, and which one the sentence means depends on the
  // rule that fired: days in a row for the streak rule, sessions for the volume ones.
  const count =
    suggestion.reason === "consecutive_days"
      ? suggestion.daysInARow
      : suggestion.recentSessionCount;

  return (
    <XStack gap="$2" items="flex-start" px="$1">
      <GameIcon name="heart" size={16} color="$textSecondary" />
      <Text fontSize={13} color="$textSecondary" flex={1} lineHeight={18}>
        {t(`journal.${suggestion.message}`, { count })}
      </Text>
    </XStack>
  );
}
