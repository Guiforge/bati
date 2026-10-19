import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { AppText } from "@/components/common/AppText";
import { Moon } from "@/components/icons";
import { restMessageKey } from "@/constants/restMessages";
import { dayKey } from "@/db/dates";
import { getRestSuggestion, type RestSuggestion } from "@/db/restSuggestions";
import { useReloadOnChange } from "@/hooks/useReloadOnChange";

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

  // A failed read leaves the line out; nothing else on Home depends on it.
  useReloadOnChange(
    "home.restNote",
    useCallback(
      (isCancelled: () => boolean) =>
        getRestSuggestion().then((result) => {
          if (!isCancelled()) setSuggestion(result.shouldRest ? result : null);
        }),
      [],
    ),
  );

  // `reason` is never "none" here — getRestSuggestion() only sets suggestion when shouldRest is
  // true — but destructuring it keeps that guarantee visible to the compiler below instead of
  // relying on a cast.
  // A deload is the light-week card's to offer (E-03): said twice here, and still said after the
  // hero answered "Not now" there.
  if (!suggestion || suggestion.reason === "none" || suggestion.reason === "deload") return null;
  const { reason } = suggestion;

  // Both counts feed the same `{{count}}` slot, and which one the sentence means depends on the
  // rule that fired: days in a row for the streak rule, sessions for the volume ones.
  const count =
    reason === "consecutive_days" ? suggestion.daysInARow : suggestion.recentSessionCount;

  const text = t(restMessageKey(reason, `${dayKey(new Date())}:${reason}`), { count });

  return (
    <XStack gap="$2" items="flex-start" px="$4" pt="$2.5">
      <YStack pt={1}>
        <Moon size={13} color="$textSecondary" />
      </YStack>
      <AppText fontSize={11} color="$textSecondary" flex={1} lineHeight={15}>
        {text}
      </AppText>
    </XStack>
  );
}
