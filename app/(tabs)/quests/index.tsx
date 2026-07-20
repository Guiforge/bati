import { LegendList } from "@legendapp/list";
import { Map as MapIcon } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { QuestFiltersSheet } from "@/components/QuestFiltersSheet";
import { getQuestAsset } from "@/constants/assetMap";
import { getQuestColorTokensFromTemplateWithExercises } from "@/constants/exerciseColors";
import {
  estimateQuestTemplateSeconds,
  formatDuration,
  listExercises,
  listQuestTemplates,
} from "@/db";
import type { Exercise } from "@/db/exercises";
import type { QuestTemplate } from "@/db/quests";
import type { EquipmentCode, MuscleCode } from "@/db/schema";
import { computeSessionXp } from "@/db/xp";
import { useSettingsStore } from "@/stores/settings";

type LoadState =
  | { status: "loading"; quests: QuestTemplate[]; exercisesById: Record<number, Exercise> }
  | { status: "ready"; quests: QuestTemplate[]; exercisesById: Record<number, Exercise> }
  | {
      status: "error";
      quests: QuestTemplate[];
      exercisesById: Record<number, Exercise>;
      message: string;
    };

function questEmoji(rounds: number, exerciseCount: number) {
  if (rounds >= 4) return "🧨";
  if (exerciseCount >= 4) return "⚔️";
  return "🪓";
}

function resolveCoverImage(path?: string | null): ImageSourcePropType | null {
  if (!path) return null;
  return path.startsWith("http") ? { uri: path } : getQuestAsset(path);
}

type QuestMeta = {
  quest: QuestTemplate;
  muscles: MuscleCode[];
  equipment: EquipmentCode[];
};

const PAGE_SIZE = 10;
const FILTER_TRIGGER_SPACE = 64;

function StatusMessage({
  state,
  filteredCount,
  onRetry,
  onClearFilters,
}: {
  state: LoadState;
  filteredCount: number;
  onRetry: () => void;
  onClearFilters: () => void;
}) {
  const { t } = useTranslation();

  if (state.status === "error") {
    return (
      <YStack px="$5">
        <Card>
          <YStack gap="$3" items="center" py="$2">
            <Text fontSize={32}>😵</Text>
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("quests.load_error", "Oops!")}
            </Text>
            <Paragraph color="$textSecondary" size="$3">
              {state.message}
            </Paragraph>
            <AppButton fullWidth={false} variant="secondary" onPress={onRetry}>
              {t("quests.retry", "Retry")} ↻
            </AppButton>
          </YStack>
        </Card>
      </YStack>
    );
  }

  if (state.status === "loading" && state.quests.length === 0) {
    return (
      <YStack px="$5">
        <Card>
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

  if (state.status !== "loading" && state.quests.length === 0) {
    return (
      <YStack px="$5">
        <Card>
          <YStack gap="$3" items="center" py="$2">
            <Text fontSize={32}>🏚️</Text>
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("quests.empty_title", "No quests yet")}
            </Text>
            <Paragraph color="$textSecondary" size="$3">
              {t("quests.empty_subtitle", "Come back soon!")}
            </Paragraph>
          </YStack>
        </Card>
      </YStack>
    );
  }

  if (state.status !== "loading" && state.quests.length > 0 && filteredCount === 0) {
    return (
      <YStack px="$5">
        <Card>
          <YStack gap="$3" items="center" py="$2">
            <Text fontSize={32}>🔍</Text>
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("quests.empty_filters_title", "No matches")}
            </Text>
            <Paragraph color="$textSecondary" size="$3">
              {t("quests.empty_filters_subtitle", "Try removing filters.")}
            </Paragraph>
            <AppButton fullWidth={false} variant="secondary" onPress={onClearFilters}>
              {t("quests.filters_clear", "Clear filters")}
            </AppButton>
          </YStack>
        </Card>
      </YStack>
    );
  }

  return null;
}
const ANDROID_MIN_BOTTOM_INSET = 24;

export default function QuestsGallery() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { language } = useSettingsStore();

  const [state, setState] = useState<LoadState>({
    status: "loading",
    quests: [],
    exercisesById: {},
  });

  const [selectedMuscle, setSelectedMuscle] = useState<MuscleCode | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentCode | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const selectMuscle = useCallback((m: MuscleCode | null) => {
    setSelectedMuscle(m);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const selectEquipment = useCallback((e: EquipmentCode | null) => {
    setSelectedEquipment(e);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const clearFilters = useCallback(() => {
    selectMuscle(null);
    selectEquipment(null);
  }, [selectEquipment, selectMuscle]);

  const load = useCallback(async () => {
    setState((s) => ({ status: "loading", quests: s.quests, exercisesById: s.exercisesById }));
    try {
      const [quests, exercises] = await Promise.all([listQuestTemplates(), listExercises()]);
      const exercisesById = Object.fromEntries(exercises.map((e) => [e.id, e] as const));
      setState({ status: "ready", quests, exercisesById });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setState((s) => ({
        status: "error",
        quests: s.quests,
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

  const quests = state.quests;
  const exercisesById = state.exercisesById;

  const questMeta = useMemo(() => {
    return quests.map((q): QuestMeta => {
      const muscles = new Set<MuscleCode>();
      const equipment = new Set<EquipmentCode>();

      for (const qex of q.exercises) {
        const ex = exercisesById[qex.exerciseId];
        if (!ex) continue;
        equipment.add(ex.equipment);
        for (const m of ex.muscles) muscles.add(m);
      }

      return { quest: q, muscles: [...muscles], equipment: [...equipment] };
    });
  }, [exercisesById, quests]);

  const availableMuscles = useMemo(() => {
    const s = new Set<MuscleCode>();
    for (const m of questMeta) for (const code of m.muscles) s.add(code);
    return [...s];
  }, [questMeta]);

  const availableEquipment = useMemo(() => {
    const s = new Set<EquipmentCode>();
    for (const m of questMeta) for (const code of m.equipment) s.add(code);
    return [...s];
  }, [questMeta]);

  const filtered = useMemo(() => {
    return questMeta.filter((m) => {
      const okMuscle = selectedMuscle ? m.muscles.includes(selectedMuscle) : true;
      const okEquip = selectedEquipment ? m.equipment.includes(selectedEquipment) : true;
      return okMuscle && okEquip;
    });
  }, [questMeta, selectedEquipment, selectedMuscle]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const canLoadMore = visible.length < filtered.length;

  const onEndReached = useCallback(() => {
    if (!canLoadMore) return;
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
  }, [canLoadMore, filtered.length]);

  const title = t("quests.gallery_title", "Quests");

  const renderItem = useCallback(
    ({ item }: { item: QuestMeta }) => {
      const q = item.quest;

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

      const qTitle = language === "fr" ? q.frTitle : q.enTitle;
      const qDesc = language === "fr" ? q.frDescription : q.enDescription;
      const cover = resolveCoverImage(q.imagePath);

      return (
        <YStack px="$5">
          <Card bg={tokens.bg} onPress={() => router.push(`/quests/${q.id}` as never)}>
            <XStack gap="$3" items="flex-start">
              <YStack
                width={54}
                height={54}
                rounded="$4"
                bg="$surface"
                borderWidth={1}
                borderColor="$borderStrong"
                justify="center"
                items="center"
                overflow="hidden"
              >
                {cover ? (
                  <Image
                    source={cover}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={200}
                    accessible={false}
                  />
                ) : (
                  <Text fontSize={26}>{questEmoji(q.rounds, q.exercises.length)}</Text>
                )}
              </YStack>

              <YStack flex={1} gap="$2">
                <Text fontWeight="700" fontSize={18} color="$text">
                  {qTitle}
                </Text>

                <Paragraph color="$textSecondary" size="$3" numberOfLines={2}>
                  {qDesc}
                </Paragraph>

                <XStack gap="$2" flexWrap="wrap" pt="$1">
                  <Chip
                    label={t("quests.estimate", {
                      duration: estimate,
                      defaultValue: `≈ ${estimate}`,
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
                    label={t("quests.reward_xp", {
                      count: xp,
                      defaultValue: `+${xp} XP`,
                    })}
                    tone="secondary"
                  />
                </XStack>
              </YStack>
            </XStack>
          </Card>
        </YStack>
      );
    },
    [exercisesById, language, router, t],
  );

  return (
    <YStack flex={1} bg="$background">
      {/* Fixed Header - stays in place */}
      <YStack bg="$background" pt={insets.top + 12} px="$5" pb="$3" gap="$1">
        {/* Title Row */}
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$2">
            <MapIcon size={18} color="$text" strokeWidth={2.5} />
            <Text fontWeight="700" fontSize={20} color="$text">
              {title}
            </Text>
          </XStack>
          <Chip
            label={t("quests.count", { count: filtered.length, defaultValue: "{{count}} quests" })}
            tone="secondary"
          />
        </XStack>
        <Text color="$textSecondary" fontSize={13}>
          {t("quests.gallery_subtitle", "Single workouts — pick one and go")}
        </Text>
      </YStack>

      {/* Status Messages */}
      <StatusMessage
        state={state}
        filteredCount={filtered.length}
        onRetry={() => {
          load().catch(() => {
            // Error already handled
          });
        }}
        onClearFilters={clearFilters}
      />

      {/* Scrollable Quest List */}
      {filtered.length > 0 && (
        <LegendList
          data={visible}
          renderItem={renderItem}
          keyExtractor={(m) => String(m.quest.id)}
          ItemSeparatorComponent={() => <YStack height={12} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          recycleItems
          estimatedItemSize={260}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom:
              Math.max(insets.bottom, Platform.OS === "android" ? ANDROID_MIN_BOTTOM_INSET : 0) +
              FILTER_TRIGGER_SPACE +
              30,
          }}
        />
      )}

      <QuestFiltersSheet
        language={language}
        availableMuscles={availableMuscles}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={selectMuscle}
        availableEquipment={availableEquipment}
        selectedEquipment={selectedEquipment}
        onSelectEquipment={selectEquipment}
        bottomInset={insets.bottom}
        resultCount={filtered.length}
      />
    </YStack>
  );
}
