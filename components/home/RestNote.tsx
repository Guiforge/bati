import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text, XStack, YStack } from "tamagui";
import { Moon } from "@/components/icons";
import { pickDailyVariant, REST_SUGGESTION_MESSAGES } from "@/constants/restMessages";
import { dayKey } from "@/db/dates";
import { getRestSuggestion, type RestSuggestion } from "@/db/restSuggestions";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * The one thing Home says that is not an invitation to train.
 *
 * Deliberately not a branch of `useSmartAction`: the primary button must never read "do not train
 * tonight". Five days in a row is worth mentioning, and it is still the hero's call — so this is a
 * line under the stage, not a gate in front of it.
 */
export function RestNote() {
  const language = useSettingsStore((s) => s.language);
  const [suggestion, setSuggestion] = useState<RestSuggestion | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      getRestSuggestion()
        .then((result) => {
          if (!cancelled) setSuggestion(result.shouldRest ? result : null);
        })
        .catch((error) => {
          // The line simply does not appear; nothing else on Home depends on it.
          reportError("home.restNote", error);
        });

      return () => {
        cancelled = true;
      };
    }, []),
  );

  // `reason` is never "none" here — getRestSuggestion() only sets suggestion when shouldRest is
  // true — but destructuring it keeps that guarantee visible to the compiler below instead of
  // relying on a cast.
  if (!suggestion || suggestion.reason === "none") return null;
  const { reason } = suggestion;

  // Both counts feed the same `{{count}}` slot, and which one the sentence means depends on the
  // rule that fired: days in a row for the streak rule, sessions for the volume ones.
  const count =
    reason === "consecutive_days" ? suggestion.daysInARow : suggestion.recentSessionCount;

  const pool = REST_SUGGESTION_MESSAGES[reason];
  const variant = pickDailyVariant(pool[language], `${dayKey(new Date())}:${reason}`);
  const text = variant.replace("{{count}}", String(count));

  return (
    <XStack gap="$2" items="flex-start" px="$4" pt="$2.5">
      <YStack pt={1}>
        <Moon size={13} color="$textSecondary" />
      </YStack>
      <Text fontSize={11} color="$textSecondary" flex={1} lineHeight={15}>
        {text}
      </Text>
    </XStack>
  );
}
