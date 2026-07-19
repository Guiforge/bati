import { LegendList } from "@legendapp/list";
import { Sparkles } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { GameIcon } from "@/components/common/GameIcon";
import { getAdventureAsset } from "@/constants/assetMap";
import { getQuestColorTokensFromTemplateWithExercises } from "@/constants/exerciseColors";
import {
  type Adventure,
  estimateQuestTemplateSeconds,
  formatDuration,
  listAdventures,
  listExercises,
} from "@/db";
import type { Exercise } from "@/db/exercises";
import { computeSessionXp } from "@/db/xp";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSettingsStore } from "@/stores/settings";

function resolveCoverImage(path?: string | null): ImageSourcePropType | null {
  if (!path) return null;
  return path.startsWith("http") ? { uri: path } : getAdventureAsset(path);
}

type LoadState =
  | { status: "loading"; adventures: Adventure[]; exercisesById: Record<number, Exercise> }
  | { status: "ready"; adventures: Adventure[]; exercisesById: Record<number, Exercise> }
  | {
      status: "error";
      adventures: Adventure[];
      exercisesById: Record<number, Exercise>;
      message: string;
    };

const ANDROID_MIN_BOTTOM_INSET = 24;

export default function AdventuresGallery() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const reducedMotion = useReducedMotion();

  const [state, setState] = useState<LoadState>({
    status: "loading",
    adventures: [],
    exercisesById: {},
  });

  const load = useCallback(async () => {
    setState((s) => ({
      status: "loading",
      adventures: s.adventures,
      exercisesById: s.exercisesById,
    }));

    try {
      const [adventures, exercises] = await Promise.all([listAdventures(), listExercises()]);
      const exercisesById = Object.fromEntries(exercises.map((e) => [e.id, e] as const));
      setState({ status: "ready", adventures, exercisesById });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setState((s) => ({
        status: "error",
        adventures: s.adventures,
        exercisesById: s.exercisesById,
        message,
      }));
    }
  }, []);

  useEffect(() => {
    load().catch(() => {
      // Error already handled
    });
  }, [load]);

  const adventures = state.adventures;
  const exercisesById = state.exercisesById;

  const title = t("adventures.gallery_title", "Adventures");

  const renderItem = useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Gallery card renderer with cover art + fallback states, refactor planned
    ({ item }: { item: Adventure }) => {
      const q = item.coverQuest;
      const qTitle = language === "fr" ? item.frTitle || q.frTitle : item.enTitle || q.enTitle;
      const qDesc =
        language === "fr"
          ? item.frDescription || q.frDescription
          : item.enDescription || q.enDescription;

      const tokens = getQuestColorTokensFromTemplateWithExercises({
        quest: q,
        exercisesById,
      });

      const durationSeconds = estimateQuestTemplateSeconds({
        template: q,
        exercisesById,
        userLevel: "medium",
      });
      const estimate = formatDuration(durationSeconds, language);
      const xp = computeSessionXp({ durationSeconds, userLevel: "medium" });

      const kindLabel =
        item.kind === "boss"
          ? t("adventures.kind_boss", "BOSS")
          : item.kind === "event"
            ? t("adventures.kind_event", "EVENT")
            : t("adventures.kind_route", "ROUTE");

      const cover = resolveCoverImage(item.imagePath);
      const kindChip = (
        <Chip
          label={kindLabel}
          tone={item.kind === "boss" ? "primary" : undefined}
          icon={
            item.kind === "boss" ? (
              <GameIcon name="sword" size={14} color="$bgDark" accessible={false} />
            ) : undefined
          }
        />
      );

      return (
        <YStack px="$5">
          <Card
            bg={tokens.bg}
            p="$0"
            overflow="hidden"
            animation={reducedMotion ? undefined : "quick"}
            onPress={() => router.push(`/adventures/${item.id}` as never)}
          >
            {cover ? (
              <YStack height={140}>
                <Image
                  source={cover}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                  accessible={false}
                />
                <XStack position="absolute" t="$3" l="$3">
                  {kindChip}
                </XStack>
              </YStack>
            ) : null}

            <YStack gap="$3" p="$4">
              <XStack items="center" justify="space-between" gap="$3">
                <XStack items="center" gap="$2" flex={1}>
                  {!cover && <Text fontSize={22}>🗺️</Text>}
                  <Text fontWeight="700" fontSize={18} color="$text" numberOfLines={1} flex={1}>
                    {qTitle}
                  </Text>
                </XStack>

                {!cover && kindChip}
              </XStack>

              <Paragraph color="$textSecondary" size="$3" numberOfLines={2}>
                {qDesc}
              </Paragraph>

              <XStack gap="$2" flexWrap="wrap">
                <Chip
                  label={t("quests.estimate", {
                    duration: estimate,
                    defaultValue: `≈ ${estimate}`,
                  })}
                />
                <Chip
                  label={t("adventures.steps", {
                    count: item.stepsCount,
                    defaultValue: `${item.stepsCount} steps`,
                  })}
                  tone="primary"
                />
                <Chip
                  label={t("quests.reward_xp", {
                    count: xp,
                    defaultValue: `+${xp} XP`,
                  })}
                  tone="secondary"
                />
              </XStack>
            </YStack>
          </Card>
        </YStack>
      );
    },
    [exercisesById, language, reducedMotion, router, t],
  );

  const StatusMessage = () => {
    if (state.status === "error") {
      return (
        <YStack px="$5">
          <Card bg="$surface">
            <YStack gap="$3" items="center" py="$2">
              <Text fontSize={32}>😵</Text>
              <Text fontWeight="700" fontSize={16} color="$text">
                {t("quests.load_error", "Oops!")}
              </Text>
              <Paragraph color="$textSecondary" size="$3" style={{ textAlign: "center" }}>
                {state.message}
              </Paragraph>
              <AppButton
                fullWidth={false}
                variant="secondary"
                onPress={() => {
                  load().catch(() => {
                    // Error already handled
                  });
                }}
              >
                {t("quests.retry", "Retry")} ↻
              </AppButton>
            </YStack>
          </Card>
        </YStack>
      );
    }

    if (state.status === "loading" && adventures.length === 0) {
      return (
        <YStack px="$5">
          <Card bg="$surface">
            <XStack items="center" justify="center" gap="$3" py="$4">
              <Text fontSize={28}>🏗️</Text>
              <Text fontWeight="700" fontSize={16} color="$text">
                {t("quests.loading", "Loading...")}
              </Text>
            </XStack>
          </Card>
        </YStack>
      );
    }

    if (state.status !== "loading" && adventures.length === 0) {
      return (
        <YStack px="$5">
          <Card bg="$surface">
            <YStack gap="$3" items="center" py="$2">
              <Text fontSize={32}>🏚️</Text>
              <Text fontWeight="700" fontSize={16} color="$text">
                {t("adventures.empty_title", "No adventures yet")}
              </Text>
              <Paragraph color="$textSecondary" size="$3" style={{ textAlign: "center" }}>
                {t("adventures.empty_subtitle", "Come back soon!")}
              </Paragraph>
            </YStack>
          </Card>
        </YStack>
      );
    }

    return null;
  };

  return (
    <YStack flex={1} bg="$background">
      <YStack bg="$background" pt={insets.top + 12} px="$5" pb="$3" gap="$1">
        <XStack items="center" gap="$2">
          <Sparkles size={18} color="$primary" strokeWidth={2.5} />
          <Text fontWeight="700" fontSize={20} color="$text">
            {title}
          </Text>
        </XStack>
        <Text color="$textSecondary" fontSize={13}>
          {t("adventures.gallery_subtitle", "Multi-workout programs with a story and a boss fight")}
        </Text>
      </YStack>

      <StatusMessage />

      {adventures.length > 0 && (
        <LegendList
          data={adventures}
          renderItem={renderItem}
          keyExtractor={(a) => String(a.id)}
          ItemSeparatorComponent={() => <YStack height={12} />}
          recycleItems
          estimatedItemSize={240}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom:
              Math.max(insets.bottom, Platform.OS === "android" ? ANDROID_MIN_BOTTOM_INSET : 0) +
              30,
          }}
        />
      )}
    </YStack>
  );
}
