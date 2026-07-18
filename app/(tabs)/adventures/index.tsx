import { LegendList } from "@legendapp/list";
import { ChevronLeft, Sparkles } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type ImageSourcePropType, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";

import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
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
import { useSettingsStore } from "@/stores/settings";

type LoadState =
  | { status: "loading"; adventures: Adventure[]; exercisesById: Record<number, Exercise> }
  | { status: "ready"; adventures: Adventure[]; exercisesById: Record<number, Exercise> }
  | {
      status: "error";
      adventures: Adventure[];
      exercisesById: Record<number, Exercise>;
      message: string;
    };

function resolveImage(path?: string | null): ImageSourcePropType | null {
  if (!path) return null;
  if (path === "assets/placeholder.jpg") return require("../../../assets/placeholder.jpg");
  return null;
}

const ANDROID_MIN_BOTTOM_INSET = 24;

export default function AdventuresGallery() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { language } = useSettingsStore();

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
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex rendering logic, refactor planned
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

      const authorLabel = t("common.by", {
        author: item.author,
        defaultValue: `By ${item.author}`,
      });
      const kindLabel =
        item.kind === "boss"
          ? t("adventures.kind_boss", "BOSS")
          : item.kind === "event"
            ? t("adventures.kind_event", "EVENT")
            : t("adventures.kind_route", "ROUTE");

      const imagePaths = q.exercises.flatMap((qex) => qex.images ?? []).filter(Boolean);
      const uniqueImagePaths = Array.from(new Set(imagePaths));
      const thumbPaths =
        uniqueImagePaths.length > 0 ? uniqueImagePaths.slice(0, 8) : ["assets/placeholder.jpg"];

      return (
        <YStack px="$5">
          <Card bg={tokens.bg} onPress={() => router.push(`/adventures/${item.id}` as never)}>
            <YStack gap="$3">
              <XStack items="center" justify="space-between" gap="$3">
                <XStack items="center" gap="$2" flex={1}>
                  <Text fontSize={22}>🗺️</Text>
                  <Text fontWeight="900" fontSize={18} color="$text" numberOfLines={1} flex={1}>
                    {qTitle}
                  </Text>
                </XStack>

                <Chip
                  label={t("quests.reward_xp", {
                    count: xp,
                    defaultValue: `+${xp} XP`,
                  })}
                  tone="secondary"
                />
              </XStack>

              <Paragraph color="$textSecondary" size="$3" numberOfLines={3}>
                {qDesc}
              </Paragraph>

              <XStack gap="$2" flexWrap="wrap">
                <Chip label={kindLabel} tone={item.kind === "boss" ? "primary" : undefined} />
                <Chip label={authorLabel} />
                <Chip
                  label={t("quests.rounds", {
                    count: q.rounds,
                    defaultValue: `${q.rounds} rounds`,
                  })}
                />
                <Chip
                  label={t("adventures.steps", {
                    count: item.stepsCount,
                    defaultValue: `${item.stepsCount} steps`,
                  })}
                />
                <Chip
                  label={t("quests.exercises", {
                    count: q.exercises.length,
                    defaultValue: `${q.exercises.length} exercises`,
                  })}
                  tone="primary"
                />
                <Chip
                  label={t("quests.estimate", {
                    duration: estimate,
                    defaultValue: `≈ ${estimate}`,
                  })}
                />
              </XStack>

              <XStack gap="$2" flexWrap="wrap">
                {thumbPaths.map((p, idx) => {
                  const src = resolveImage(p);
                  return (
                    <YStack
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable enough for static image lists
                      key={`${p}-${idx}`}
                      width={50}
                      height={50}
                      rounded={14}
                      overflow="hidden"
                      bg="$surface"
                      borderWidth={1}
                      borderColor="$borderStrong"
                      items="center"
                      justify="center"
                    >
                      {src ? (
                        <Image
                          source={src}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                          transition={0}
                        />
                      ) : (
                        <Text fontSize={18}>⚔️</Text>
                      )}
                    </YStack>
                  );
                })}
              </XStack>
            </YStack>
          </Card>
        </YStack>
      );
    },
    [exercisesById, language, router, t],
  );

  const StatusMessage = () => {
    if (state.status === "error") {
      return (
        <YStack px="$5">
          <Card bg="$surface">
            <YStack gap="$3" items="center" py="$2">
              <Text fontSize={32}>😵</Text>
              <Text fontWeight="900" fontSize={16} color="$text">
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
              <Text fontWeight="900" fontSize={16} color="$text">
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
              <Text fontWeight="900" fontSize={16} color="$text">
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
      <YStack bg="$background" pt={insets.top + 12} px="$5" pb="$3" gap="$3">
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$3">
            <AppIconButton onPress={() => router.back()}>
              <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
            </AppIconButton>
            <XStack items="center" gap="$2">
              <Sparkles size={18} color="$primary" strokeWidth={2.5} />
              <Text fontWeight="900" fontSize={20} color="$text">
                {title}
              </Text>
            </XStack>
          </XStack>
        </XStack>
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
