import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { ChevronDown, ChevronUp, Flame } from "@/components/icons";
import { getExerciseThumb } from "@/constants/assetMap";
import { PREP_SECONDS, type WarmupQuest, type WarmupStep } from "@/constants/warmup";
import { formatDurationEstimate } from "@/db/estimate";
import { type Exercise, officialByName } from "@/db/exercises";
import { localizedName } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { loadWarmup } from "@/stores/session";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";

/**
 * The warm-up this quest will play, readable before Start.
 *
 * "No details until I'm actually supposed to be doing them, there is no time to look them up
 * beforehand": the warm-up was the one part of a session nobody could see coming. `loadWarmup`
 * is the function `startSession` calls, on the same configured quest the Start button hands it,
 * so this is the list that plays and not a guess at it.
 *
 * Folded by default: it is the answer to a question some heroes have, not a step everyone takes.
 */
export function WarmupPreview({
  quest,
  catalogue,
  language,
}: {
  quest: WarmupQuest;
  catalogue: Exercise[];
  language: AppLanguage;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const prepMode = useSettingsStore((s) => s.prepMode);
  const [steps, setSteps] = useState<WarmupStep[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadWarmup(quest)
      .then((next) => {
        if (!cancelled) setSteps(next);
      })
      .catch((error) => {
        // The warm-up still plays; only the look ahead is lost.
        reportError("quest.warmupPreview", error);
      });
    return () => {
      cancelled = true;
    };
  }, [quest]);

  // Off in Settings, or an outing: nothing will play, so nothing is announced.
  if (steps.length === 0) return null;

  // The waits count only when they run on a clock, same as the warm-up's own "left" line.
  const perWait = prepMode === "timer" ? PREP_SECONDS : 0;
  const seconds = steps.reduce((sum, step) => sum + step.seconds + perWait, 0);

  return (
    <Card testID="quest-warmup" gap="$3">
      <XStack
        items="center"
        gap="$3"
        onPress={() => setOpen(!open)}
        pressStyle={{ opacity: 0.8 }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Flame size={20} color="$warning" />
        <Text flex={1} fontWeight="700" fontSize={16} color="$text">
          {t("quests.warmup_section", {
            count: steps.length,
            duration: formatDurationEstimate(seconds),
          })}
        </Text>
        {open ? (
          <ChevronUp size={20} color="$text" opacity={0.6} />
        ) : (
          <ChevronDown size={20} color="$text" opacity={0.6} />
        )}
      </XStack>

      {open
        ? steps.map((step, i) => {
            // Seed rows only, the rule `WarmupView` resolves the same names by.
            const exercise = officialByName(catalogue, step.exerciseName);
            return (
              <XStack
                key={step.exerciseName}
                testID={`quest-warmup-step-${i}`}
                items="center"
                gap="$3"
                onPress={
                  exercise ? () => router.push(`/exercises/${exercise.id}` as never) : undefined
                }
                pressStyle={exercise ? { opacity: 0.8 } : undefined}
                accessibilityRole={exercise ? "button" : undefined}
              >
                <YStack
                  width={42}
                  height={42}
                  bg="$surface2"
                  rounded="$3"
                  overflow="hidden"
                  borderWidth={1}
                  borderColor="$borderStrong"
                >
                  {exercise ? (
                    <Image
                      source={getExerciseThumb(exercise.imagePath)}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : null}
                </YStack>
                <Text flex={1} fontSize={15} color="$text" numberOfLines={1}>
                  {i + 1}. {exercise ? localizedName(exercise, language) : step.exerciseName}
                </Text>
                <Text fontSize={13} color="$textSecondary">
                  {step.seconds}s
                </Text>
              </XStack>
            );
          })
        : null}
    </Card>
  );
}
