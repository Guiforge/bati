import { LegendList } from "@legendapp/list";
import { ChevronLeft, Map as MapIcon } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";

import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { QuestFiltersSheet } from "@/components/QuestFiltersSheet";
import { getQuestColorTokensFromTemplateWithExercises } from "@/constants/exerciseColors";
import {
  estimateQuestTemplateSeconds,
  formatDuration,
  listExercises,
  listQuestTemplates,
} from "@/db";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import type { Exercise } from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
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

function resolveQuestImage(path?: string | null): ImageSourcePropType | null {
  if (!path) return null;
  if (path === "assets/placeholder.jpg") return require("../../../assets/placeholder.jpg");
  return null;
}

type QuestMeta = {
  quest: QuestTemplate;
  muscles: MuscleCode[];
  equipment: EquipmentCode[];
};

const PAGE_SIZE = 10;
const FILTER_HANDLE_HEIGHT = 64;
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
      const muscles = item.muscles;
      const equipment = item.equipment;

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
        author: q.author,
        defaultValue: `By ${q.author}`,
      });

      const qTitle = language === "fr" ? q.frTitle : q.enTitle;
      const qDesc = language === "fr" ? q.frDescription : q.enDescription;

      const imagePaths = q.exercises.flatMap((qex) => qex.images ?? []).filter(Boolean);
      const uniqueImagePaths = Array.from(new Set(imagePaths));
      const thumbPaths =
        uniqueImagePaths.length > 0 ? uniqueImagePaths.slice(0, 8) : ["assets/placeholder.jpg"];

      return (
        <YStack px="$5">
          <Card bg={tokens.bg} onPress={() => router.push(`/quests/${q.id}` as never)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              <XStack gap="$2">
                {thumbPaths.map((p, idx) => {
                  const src = resolveQuestImage(p);
                  return (
                    <YStack
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable enough for static image lists
                      key={`${p}-${idx}`}
                      width={56}
                      height={56}
                      rounded={14}
                      overflow="hidden"
                      bg="$bgLight"
                      borderWidth={3}
                      borderColor="$color"
                      shadowColor="$color"
                      shadowRadius={0}
                      shadowOffset={{ width: 0, height: 4 }}
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
                        <Text fontSize={22}>{questEmoji(q.rounds, q.exercises.length)}</Text>
                      )}
                    </YStack>
                  );
                })}
              </XStack>
            </ScrollView>

            <XStack gap="$3" items="flex-start">
              <YStack
                width={54}
                height={54}
                rounded={27}
                bg="$bgLight"
                borderWidth={3}
                borderColor="$color"
                justify="center"
                items="center"
              >
                <Text fontSize={26}>{questEmoji(q.rounds, q.exercises.length)}</Text>
              </YStack>

              <YStack flex={1} gap="$2">
                <Text fontWeight="900" fontSize={18} color="$color">
                  {qTitle}
                </Text>

                <Paragraph color="$color" opacity={0.7} size="$3" numberOfLines={3}>
                  {qDesc}
                </Paragraph>

                <XStack gap="$2" flexWrap="wrap" pt="$1">
                  <Chip label={authorLabel} />
                  <Chip
                    label={t("quests.rounds", {
                      count: q.rounds,
                      defaultValue: `${q.rounds} rounds`,
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
                  <Chip
                    label={t("quests.rest", {
                      count: q.restSeconds,
                      defaultValue: `Rest ${q.restSeconds}s`,
                    })}
                  />
                  <Chip
                    label={t("quests.estimate", {
                      duration: estimate,
                      defaultValue: `≈ ${estimate}`,
                    })}
                  />
                </XStack>

                <XStack gap="$2" flexWrap="wrap">
                  {equipment.slice(0, 2).map((e) => (
                    <Chip key={e} label={EQUIPMENT_LABELS[e]?.[language] ?? e} />
                  ))}
                  {muscles.slice(0, 3).map((m) => (
                    <Chip key={m} label={MUSCLE_LABELS[m]?.[language] ?? m} />
                  ))}
                </XStack>
              </YStack>
            </XStack>
          </Card>
        </YStack>
      );
    },
    [exercisesById, language, router, t],
  );

  // Status messages shown when list is empty
  const StatusMessage = () => {
    if (state.status === "error") {
      return (
        <YStack px="$5">
          <Card>
            <YStack gap="$3" items="center" py="$2">
              <Text fontSize={32}>😵</Text>
              <Text fontWeight="900" fontSize={16} color="$color">
                {t("quests.load_error", "Oops!")}
              </Text>
              <Paragraph color="$color" opacity={0.6} size="$3">
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

    if (state.status === "loading" && quests.length === 0) {
      return (
        <YStack px="$5">
          <Card>
            <XStack items="center" justify="center" gap="$3" py="$4">
              <Text fontSize={28}>🏗️</Text>
              <Text fontWeight="900" fontSize={16} color="$color">
                {t("quests.loading", "Loading...")}
              </Text>
            </XStack>
          </Card>
        </YStack>
      );
    }

    if (state.status !== "loading" && quests.length === 0) {
      return (
        <YStack px="$5">
          <Card>
            <YStack gap="$3" items="center" py="$2">
              <Text fontSize={32}>🏚️</Text>
              <Text fontWeight="900" fontSize={16} color="$color">
                {t("quests.empty_title", "No quests yet")}
              </Text>
              <Paragraph color="$color" opacity={0.6} size="$3">
                {t("quests.empty_subtitle", "Come back soon!")}
              </Paragraph>
            </YStack>
          </Card>
        </YStack>
      );
    }

    if (state.status !== "loading" && quests.length > 0 && filtered.length === 0) {
      return (
        <YStack px="$5">
          <Card>
            <YStack gap="$3" items="center" py="$2">
              <Text fontSize={32}>🔍</Text>
              <Text fontWeight="900" fontSize={16} color="$color">
                {t("quests.empty_filters_title", "No matches")}
              </Text>
              <Paragraph color="$color" opacity={0.6} size="$3">
                {t("quests.empty_filters_subtitle", "Try removing filters.")}
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
      {/* Fixed Header - stays in place */}
      <YStack bg="$background" pt={insets.top + 12} px="$5" pb="$3" gap="$3">
        {/* Title Row */}
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$3">
            <AppIconButton onPress={() => router.back()}>
              <ChevronLeft size={22} color="$color" strokeWidth={2.5} />
            </AppIconButton>
            <XStack items="center" gap="$2">
              <MapIcon size={18} color="$color" strokeWidth={2.5} />
              <Text fontWeight="900" fontSize={20} color="$color">
                {title}
              </Text>
            </XStack>
          </XStack>
          <Chip
            label={t("quests.count", { count: filtered.length, defaultValue: "{{count}}" })}
            tone="secondary"
          />
        </XStack>
      </YStack>

      {/* Status Messages */}
      <StatusMessage />

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
              FILTER_HANDLE_HEIGHT +
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
        handleHeight={FILTER_HANDLE_HEIGHT}
      />
    </YStack>
  );
}
