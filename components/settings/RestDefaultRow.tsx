import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Chip } from "@/components/common/Chip";
import { Timer } from "@/components/icons";
import { preferences } from "@/db";
import { setRestDefault } from "@/db/quests";
import { useHaptics } from "@/hooks/useHaptics";
import { reportError } from "@/src/reportError";

/** Per quest first, then the rests worth choosing; all inside `REST_RANGE`. */
const REST_CHOICES: (number | null)[] = [null, 15, 20, 30, 45, 60, 90, 120];

/**
 * The rest between exercises, for every quest the hero has not tuned itself. Every choice is on
 * screen and one tap picks it: it used to be a row that stepped to the next value, eight taps to
 * get back to "per quest" and the other values never shown. The quest screen's own stepper still
 * outranks it (`db/quests.ts`).
 */
export function RestDefaultRow() {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const [rest, setRest] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    preferences
      .getRestDefault()
      .then((value) => {
        if (!cancelled) setRest(value);
      })
      .catch((error) => reportError("settings.restDefaultRead", error));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <YStack
      testID="settings-rest-default"
      bg="$surface"
      borderColor="$borderStrong"
      borderWidth={1}
      rounded="$4"
      p="$3"
      gap="$3"
    >
      <XStack items="center" gap="$3">
        <Timer size={22} color="$text" />
        <Text flex={1} fontSize="$4" fontWeight="bold" color="$text">
          {t("settings.rest_default")}
        </Text>
      </XStack>
      <XStack flexWrap="wrap" gap="$2" role="radiogroup">
        {REST_CHOICES.map((choice) => {
          const selected = choice === rest;
          return (
            <Chip
              key={choice ?? "own"}
              testID={`settings-rest-default-${choice ?? "own"}`}
              tone={selected ? "primary" : "default"}
              label={
                choice === null
                  ? t("settings.rest_default_own")
                  : t("settings.rest_default_value", { seconds: choice })
              }
              role="radio"
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                haptics.selection();
                setRest(choice);
                setRestDefault(choice).catch((error) =>
                  reportError("settings.restDefaultWrite", error),
                );
              }}
            />
          );
        })}
      </XStack>
    </YStack>
  );
}
