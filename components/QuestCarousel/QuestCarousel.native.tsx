import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { FlatList, useWindowDimensions } from "react-native";
import { Paragraph, Text, XStack, YStack } from "tamagui";

import { Card } from "@/components/common/Card";
import { Tag } from "@/components/common/Tag";
import { ProgressDots } from "@/components/ProgressDots";
import { getQuestColorTokensFromTemplateWithExercises } from "@/constants/exerciseColors";
import { listExercises, listQuestTemplates } from "@/db";
import type { Exercise } from "@/db/exercises";
import type { QuestTemplate } from "@/db/quests";
import { useSettingsStore } from "@/stores/settings";
import { DailyQuestCard } from "./DailyQuestCard";

type LoadState =
  | {
      status: "loading";
      quests: QuestTemplate[];
      exercisesById: Record<number, Exercise>;
    }
  | {
      status: "ready";
      quests: QuestTemplate[];
      exercisesById: Record<number, Exercise>;
    }
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

export function QuestCarousel() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const { width } = useWindowDimensions();

  const [state, setState] = useState<LoadState>({
    status: "loading",
    quests: [],
    exercisesById: {},
  });
  const [active, setActive] = useState(1);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [quests, exercises] = await Promise.all([listQuestTemplates(), listExercises()]);
        const exercisesById = Object.fromEntries(exercises.map((e) => [e.id, e] as const));
        if (!mounted) return;
        setState({ status: "ready", quests, exercisesById });
        setActive(quests.length > 0 ? 1 : 0);
      } catch (e) {
        if (!mounted) return;
        setState({
          status: "error",
          quests: [],
          exercisesById: {},
          message: e instanceof Error ? e.message : "Unknown error",
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const quests = state.quests;
  const exercisesById = state.exercisesById;

  // Full-bleed carousel container, but cards are narrower to show a "peek" of the next one.
  const edgeInset = 24;
  const cardSpacing = 12;
  const peek = 40;
  const slideWidth = useMemo(() => {
    const computed = Math.floor(width - edgeInset * 2 - peek);
    // Keep reasonable width on very small devices.
    return Math.max(280, Math.min(420, computed));
  }, [width]);
  const snapInterval = slideWidth + cardSpacing;

  const updateActiveFromOffset = useCallback(
    (x: number) => {
      if (quests.length === 0) return;
      const idx = Math.round(x / snapInterval) + 1;
      const clamped = Math.min(Math.max(idx, 1), quests.length);
      setActive((prev) => (prev === clamped ? prev : clamped));
    },
    [quests.length, snapInterval],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      updateActiveFromOffset(e.nativeEvent.contentOffset.x);
    },
    [updateActiveFromOffset],
  );

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      // In some cases momentum doesn't fire (very short drags). This keeps dots in sync.
      updateActiveFromOffset(e.nativeEvent.contentOffset.x);
    },
    [updateActiveFromOffset],
  );

  const dailyQuestIndex = useMemo(() => {
    if (quests.length === 0) return -1;
    const today = new Date().toISOString().split("T")[0];
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = (hash << 5) - hash + today.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % quests.length;
  }, [quests]);

  const renderItem = useCallback(
    ({ item: q, index }: { item: QuestTemplate; index: number }) => {
      if (index === dailyQuestIndex) {
        return (
          <YStack width={slideWidth} mr={cardSpacing}>
            <DailyQuestCard quest={q} exercisesById={exercisesById} />
          </YStack>
        );
      }

      const title = language === "fr" ? q.frTitle : q.enTitle;
      const desc = language === "fr" ? q.frDescription : q.enDescription;
      const emoji = questEmoji(q.rounds, q.exercises.length);
      const tokens = getQuestColorTokensFromTemplateWithExercises({
        quest: q,
        exercisesById,
      });

      return (
        <YStack width={slideWidth} mr={cardSpacing}>
          <Card bg={tokens.bg} onPress={() => router.push(`/quests/${q.id}` as never)}>
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
                <Text fontSize={26}>{emoji}</Text>
              </YStack>

              <YStack flex={1} gap="$2">
                <Text fontWeight="900" fontSize={18} color="$color" numberOfLines={2}>
                  {title}
                </Text>
                <Paragraph color="$color" opacity={0.7} size="$3" numberOfLines={2}>
                  {desc}
                </Paragraph>

                <XStack gap="$2" flexWrap="wrap" pt="$1">
                  <Tag
                    label={t("quests.rounds", {
                      count: q.rounds,
                      defaultValue: `${q.rounds} rounds`,
                    })}
                    tone="secondary"
                  />
                  <Tag
                    label={t("quests.exercises", {
                      count: q.exercises.length,
                      defaultValue: `${q.exercises.length} exercises`,
                    })}
                    tone="primary"
                  />
                  <Tag
                    label={t("quests.rest", {
                      count: q.restSeconds,
                      defaultValue: `Rest ${q.restSeconds}s`,
                    })}
                  />
                </XStack>
              </YStack>
            </XStack>
          </Card>
        </YStack>
      );
    },
    [language, slideWidth, router, t, exercisesById, dailyQuestIndex],
  );

  if (state.status === "loading") {
    return (
      <Card>
        <XStack items="center" justify="center" gap="$3" py="$4">
          <Text fontSize={28}>🗺️</Text>
          <Text fontWeight="900" fontSize={16} color="$color">
            {t("quests.loading", "Loading...")}
          </Text>
        </XStack>
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card>
        <YStack gap="$3" items="center" py="$2">
          <Text fontSize={32}>😵</Text>
          <Text fontWeight="900" fontSize={16} color="$color">
            {t("quests.load_error", "Oops!")}
          </Text>
          <Paragraph color="$color" opacity={0.6} size="$3">
            {state.message}
          </Paragraph>
        </YStack>
      </Card>
    );
  }

  if (quests.length === 0) {
    return (
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
    );
  }

  return (
    <YStack gap="$2" width="100%">
      <XStack items="center" justify="space-between" px={24}>
        <Text fontWeight="900" fontSize={16} color="$color">
          {t("quests.home_overview_title", "Pick a quest")}
        </Text>
        <Text
          fontWeight="900"
          fontSize={14}
          color="$primary"
          onPress={() => router.push("/quests" as never)}
        >
          {t("quests.see_all", "See all")} →
        </Text>
      </XStack>

      <FlatList
        data={quests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: edgeInset, paddingBottom: 4 }}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollEndDrag}
      />

      <ProgressDots current={active} total={quests.length} />
    </YStack>
  );
}
