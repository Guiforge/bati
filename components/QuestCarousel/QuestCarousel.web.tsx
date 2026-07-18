import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import { Swiper, SwiperSlide } from "swiper/react";
import { Paragraph, Text, XStack, YStack } from "tamagui";

import { Card } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Skeleton";
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
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex loading logic, refactor planned
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
  const slideWidth = useMemo(() => Math.floor(Math.min(420, width * 0.85)), [width]);

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

  const slides = useMemo(
    () =>
      quests.map((q, index) => {
        if (index === dailyQuestIndex) {
          return (
            <SwiperSlide key={q.id} style={{ display: "flex", justifyContent: "center" }}>
              <YStack width={slideWidth}>
                <DailyQuestCard quest={q} exercisesById={exercisesById} />
              </YStack>
            </SwiperSlide>
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
          <SwiperSlide key={q.id} style={{ display: "flex", justifyContent: "center" }}>
            <YStack width={slideWidth}>
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
          </SwiperSlide>
        );
      }),
    [quests, dailyQuestIndex, language, router, slideWidth, t, exercisesById],
  );

  if (state.status === "loading") {
    return (
      <Card>
        <XStack gap="$4" p="$2">
          <Skeleton width={100} height={100} radius={12} />
          <YStack flex={1} gap="$3">
            <Skeleton height={20} width="70%" />
            <Skeleton height={14} width="90%" />
            <XStack gap="$2">
              <Skeleton height={24} width={60} radius={12} />
              <Skeleton height={24} width={80} radius={12} />
            </XStack>
          </YStack>
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
      <EmptyState
        emoji="🏚️"
        title={t("quests.empty_title", "No quests yet")}
        subtitle={t("quests.empty_subtitle", "Come back soon!")}
      />
    );
  }

  return (
    <YStack gap="$2" width="100%">
      <XStack items="center" justify="space-between" px="$1">
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

      <YStack>
        <Swiper
          slidesPerView={1}
          centeredSlides
          spaceBetween={12}
          style={{ paddingBottom: 4 }}
          onSlideChangeTransitionEnd={(s) => setActive((s.activeIndex ?? 0) + 1)}
        >
          {slides}
        </Swiper>
      </YStack>

      <ProgressDots current={active} total={quests.length} />
    </YStack>
  );
}
