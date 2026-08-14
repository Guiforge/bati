import { TrendingDown, TrendingUp } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { H3, Paragraph, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { getExerciseThumb } from "@/constants/assetMap";
import { getRecentSessionHistory } from "@/db/completed";
import {
  analyzeDifficultyProgression,
  type ProgressionRecommendation,
} from "@/db/difficultySuggestion";
import { getReadyStep, type VariationStep } from "@/db/exercises";
import { useSettingsStore } from "@/stores/settings";

/** The next movement on the ladder, illustrated — tap to open the one being mastered. */
function LadderStep({ step }: { step: VariationStep }) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);

  const open = useCallback(
    () => router.push(`/exercises/${step.from.id}` as never),
    [router, step.from.id],
  );

  const remaining = Math.max(0, step.required - step.metTarget);
  const fromName = language === "fr" ? step.from.frName : step.from.enName;

  return (
    <Card
      bg={step.isEarned ? "$pastelGreen" : "$surface2"}
      borderColor={step.isEarned ? "$success" : "$borderStrong"}
      borderWidth={1}
      p="$4"
      onPress={open}
    >
      <YStack gap="$3">
        <XStack items="center" gap="$2">
          <TrendingUp size={20} color={step.isEarned ? "$success" : "$primary"} />
          <H3 fontSize={16} color={step.isEarned ? "$success" : "$primary"}>
            {t("progression.ladder_title", "Your next rung")}
          </H3>
        </XStack>

        <XStack gap="$3" items="center">
          <YStack width={64} height={64} rounded="$4" overflow="hidden" bg="$surface">
            <Image
              source={getExerciseThumb(step.next.imagePath)}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          </YStack>

          <YStack flex={1} gap="$1">
            <Text fontWeight="700" fontSize={16} color="$text">
              {language === "fr" ? step.next.frName : step.next.enName}
            </Text>
            <Paragraph fontSize={14} opacity={0.8} color="$text">
              {step.isEarned
                ? t("progression.step_earned", {
                    name: fromName,
                    defaultValue: `You have mastered ${fromName} — this is the next step.`,
                  })
                : t("progression.step_progress", {
                    count: remaining,
                    name: fromName,
                    defaultValue: `Hit your target ${remaining} more times on ${fromName} to earn it.`,
                  })}
            </Paragraph>
          </YStack>
        </XStack>
      </YStack>
    </Card>
  );
}

/** The older, blunter nudge: same question, answered in quest difficulty rather than movement. */
function DifficultyNudge({ recommendation }: { recommendation: ProgressionRecommendation }) {
  const { t } = useTranslation();

  const isIncrease = recommendation.action === "increase";
  const Icon = isIncrease ? TrendingUp : TrendingDown;
  const color = isIncrease ? "$success" : "$primary";

  return (
    <Card
      bg={isIncrease ? "$pastelGreen" : "$pastelOrange"}
      borderColor={color}
      borderWidth={1}
      p="$4"
    >
      <YStack gap="$2">
        <XStack items="center" gap="$2">
          <Icon size={20} color={color} />
          <H3 fontSize={16} color={color}>
            {t("progression.difficulty_title", "Adjust the difficulty")}
          </H3>
        </XStack>

        <YStack>
          <Paragraph fontWeight="700" fontSize={16} color="$text">
            {isIncrease
              ? t("progression.increase_title", "Level Up Available!")
              : t("progression.decrease_title", "Recovery Recommended")}
          </Paragraph>
          <Paragraph fontSize={14} opacity={0.8} color="$text">
            {isIncrease
              ? t(
                  "progression.increase_message",
                  "You've been crushing it lately. Try increasing the difficulty for better rewards!",
                )
              : t(
                  "progression.decrease_message",
                  "It seems tough lately. Lowering difficulty can help you maintain consistency.",
                )}
          </Paragraph>
        </YStack>
      </YStack>
    </Card>
  );
}

/**
 * How to progress, in one card and one voice.
 *
 * The ladder leads: without weights, overload is a harder variation, not a bigger multiplier
 * (`drizzle/0022_progression_ladder.sql`), so naming the next movement is a truer answer than
 * "try hard mode". The difficulty nudge stays behind it — still the right advice for a hero whose
 * recent work is not on the ladder, or who has built no momentum on it yet.
 *
 * Both branches used to be titled "Coach Suggestion", which named a feature that does not exist
 * and hid the one that does: the ladder. Each branch now says what it is showing.
 */
export function ProgressionCard() {
  const [recommendation, setRecommendation] = useState<ProgressionRecommendation | null>(null);
  const [step, setStep] = useState<VariationStep | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getRecentSessionHistory(10), getReadyStep()])
      .then(([sessions, readyStep]) => {
        if (cancelled) return;
        setRecommendation(analyzeDifficultyProgression(sessions));
        setStep(readyStep);
      })
      .catch(() => {
        // The card simply does not appear; nothing else on the journal depends on it.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // A movement with no logged progress yet has nothing to report: showing "0 of 3" for every
  // exercise ever touched would turn an occasional nudge into permanent furniture.
  if (step && step.metTarget > 0) return <LadderStep step={step} />;

  if (!recommendation || recommendation.action === "maintain") return null;

  return <DifficultyNudge recommendation={recommendation} />;
}
