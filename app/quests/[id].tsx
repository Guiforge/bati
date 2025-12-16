import { ChevronLeft, Dumbbell, Sparkles } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { Difficulty, estimateQuestSeconds, formatDuration, getQuestById } from "@/db";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import { MUSCLE_LABELS } from "@/db/muscles";
import type { Quest, Target } from "@/db/quests";
import { useSettingsStore } from "@/stores/settings";

type LoadState =
  | { status: "loading"; quest: Quest | null }
  | { status: "ready"; quest: Quest }
  | { status: "error"; quest: Quest | null; message: string };

function resolveQuestImage(path?: string | null): ImageSourcePropType | { uri: string } | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return { uri: path };
  if (path === "assets/placeholder.jpg") return require("../../assets/placeholder.jpg");
  return null;
}

function formatTarget(target: Target, lang: "en" | "fr") {
  if (target.type === "time") return lang === "fr" ? `${target.value}s` : `${target.value}s`;
  return lang === "fr" ? `${target.value} reps` : `${target.value} reps`;
}

function levelLabel(level: Difficulty, t: TFunction) {
  if (level === Difficulty.Easy) return t("quests.level_easy", "Easy");
  if (level === Difficulty.Hard) return t("quests.level_hard", "Hard");
  return t("quests.level_medium", "Medium");
}

export default function QuestDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { t } = useTranslation();
  const { language } = useSettingsStore();

  const questId = useMemo(() => {
    const raw = params.id;
    const v = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, [params]);

  const [level, setLevel] = useState<Difficulty>(Difficulty.Medium);
  const [state, setState] = useState<LoadState>({ status: "loading", quest: null });

  const load = useCallback(
    async (id: number, nextLevel: Difficulty) => {
      setState((s) => ({ status: "loading", quest: s.quest }));
      try {
        const quest = await getQuestById(id, nextLevel);
        if (!quest) {
          setState({
            status: "error",
            quest: null,
            message: t("quests.not_found", "Quest not found"),
          });
          return;
        }
        setState({ status: "ready", quest });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setState((s) => ({ status: "error", quest: s.quest, message }));
      }
    },
    [t],
  );

  useEffect(() => {
    if (!questId) return;
    void load(questId, level);
  }, [questId, level, load]);

  if (!questId) {
    return (
      <YStack flex={1} bg="$background" justify="center" items="center" p="$6" gap="$3">
        <Text fontWeight="900" fontSize={18} color="$color">
          {t("quests.invalid_id", "Invalid quest")}
        </Text>
        <AppButton fullWidth={false} variant="secondary" onPress={() => router.back()}>
          {t("quests.go_back", "Go back")}
        </AppButton>
      </YStack>
    );
  }

  const quest = state.status === "ready" ? state.quest : state.quest;
  const questTitle = quest ? (language === "fr" ? quest.frTitle : quest.enTitle) : "";
  const questDesc = quest ? (language === "fr" ? quest.frDescription : quest.enDescription) : "";
  const estimate = quest ? formatDuration(estimateQuestSeconds(quest), language) : null;

  const headerImage = resolveQuestImage(quest?.exercises?.[0]?.images?.[0]);

  const LevelChip = ({ value }: { value: Difficulty }) => {
    const active = value === level;

    return (
      <AppButton
        onPress={() => setLevel(value)}
        fullWidth={false}
        height={40}
        px="$3"
        bg={active ? "$primary" : "$bgLight"}
        borderColor={active ? "$primary" : "$color"}
        borderWidth={3}
        rounded="$10"
        fontSize={14}
        pressStyle={{ opacity: 0.9 }}
      >
        <Text color={active ? "white" : "$color"} fontWeight="900">
          {levelLabel(value, t)}
        </Text>
      </AppButton>
    );
  };

  return (
    <YStack flex={1} bg="$background">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
        <YStack p="$5" pt={insets.top + 12} gap="$4">
          <XStack items="center" justify="space-between">
            <XStack items="center" gap="$3">
              <AppIconButton onPress={() => router.back()}>
                <ChevronLeft size={22} color="#1A1A2E" strokeWidth={2.5} />
              </AppIconButton>

              <XStack items="center" gap="$2">
                <Sparkles size={18} color="#1A1A2E" />
                <Text fontWeight="900" fontSize={20} color="$color">
                  {t("quests.details_title", "Quest")}
                </Text>
              </XStack>
            </XStack>

            <Chip label={levelLabel(level, t)} tone="secondary" />
          </XStack>

          {headerImage ? (
            <YStack
              width="100%"
              aspectRatio={16 / 9}
              bg="$bgLight"
              borderWidth={3}
              borderColor="$color"
              rounded="$8"
              shadowColor="$color"
              shadowRadius={0}
              shadowOffset={{ width: 0, height: 6 }}
              overflow="hidden"
            >
              <Image
                source={headerImage}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={0}
              />
            </YStack>
          ) : null}

          {state.status === "error" ? (
            <Card bg="$bgLight">
              <YStack gap="$2">
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("quests.load_error", "Failed to load quest")}
                </Text>
                <Paragraph color="$color" opacity={0.7} size="$3">
                  {state.message}
                </Paragraph>
                <AppButton
                  fullWidth={false}
                  variant="secondary"
                  onPress={() => void load(questId, level)}
                >
                  {t("quests.retry", "Retry")} ↻
                </AppButton>
              </YStack>
            </Card>
          ) : null}

          {state.status === "loading" && !quest ? (
            <Card bg="$bgLight">
              <XStack items="center" justify="space-between">
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("quests.loading", "Loading quest...")}
                </Text>
                <Text fontSize={24}>🧠</Text>
              </XStack>
            </Card>
          ) : null}

          {quest ? (
            <Card>
              <YStack gap="$2">
                <H2 color="$color" fontWeight="900" fontSize={26}>
                  {questTitle}
                </H2>

                <Paragraph color="$color" opacity={0.7} size="$4" lineHeight={22}>
                  {questDesc}
                </Paragraph>

                <XStack gap="$2" flexWrap="wrap" pt="$2">
                  <Chip
                    label={t("quests.rounds", {
                      count: quest.rounds,
                      defaultValue: `${quest.rounds} rounds`,
                    })}
                  />
                  <Chip
                    label={t("quests.exercises", {
                      count: quest.exercises.length,
                      defaultValue: `${quest.exercises.length} exercises`,
                    })}
                    tone="primary"
                  />
                  <Chip
                    label={t("quests.rest", {
                      count: quest.restSeconds,
                      defaultValue: `Rest ${quest.restSeconds}s`,
                    })}
                    tone="warning"
                  />
                  {estimate ? (
                    <Chip
                      label={t("quests.estimate", {
                        duration: estimate,
                        defaultValue: `≈ ${estimate}`,
                      })}
                      tone="secondary"
                    />
                  ) : null}
                </XStack>

                <XStack gap="$2" flexWrap="wrap" pt="$2">
                  <Text fontWeight="900" color="$color" opacity={0.8}>
                    {t("quests.level", "Level")}
                  </Text>
                  <LevelChip value={Difficulty.Easy} />
                  <LevelChip value={Difficulty.Medium} />
                  <LevelChip value={Difficulty.Hard} />
                </XStack>
              </YStack>
            </Card>
          ) : null}

          {quest ? (
            <YStack gap="$3">
              <Text fontWeight="900" fontSize={18} color="$color">
                {t("quests.exercises_list", "Exercises")}
              </Text>

              {quest.exercises.map((qex, i) => {
                const exName = language === "fr" ? qex.exercise.frName : qex.exercise.enName;
                const exDesc =
                  language === "fr" ? qex.exercise.frDescription : qex.exercise.enDescription;

                return (
                  <Card key={`${qex.exercise.id}-${i}`}>
                    <XStack gap="$3" items="flex-start">
                      <YStack
                        width={52}
                        height={52}
                        rounded={26}
                        bg="$bgLight"
                        borderWidth={3}
                        borderColor="$color"
                        justify="center"
                        items="center"
                      >
                        <Dumbbell size={24} color="#1A1A2E" strokeWidth={2.5} />
                      </YStack>

                      <YStack flex={1} gap="$1">
                        <XStack items="center" justify="space-between" gap="$2">
                          <Text fontWeight="900" fontSize={17} color="$color" flex={1}>
                            {i + 1}. {exName}
                          </Text>
                          <Chip
                            label={formatTarget(qex.target, language)}
                            tone={qex.target.type === "time" ? "secondary" : "primary"}
                          />
                        </XStack>

                        <Paragraph color="$color" opacity={0.65} size="$3" numberOfLines={3}>
                          {exDesc}
                        </Paragraph>

                        <XStack gap="$2" flexWrap="wrap" pt="$2">
                          <Chip
                            label={
                              EQUIPMENT_LABELS[qex.exercise.equipment]?.[language] ??
                              qex.exercise.equipment
                            }
                          />
                          {qex.target.type === "reps" ? (
                            <Chip
                              label={t("quests.seconds_per_rep", {
                                count: qex.exercise.secondsPerRep,
                                defaultValue: `${qex.exercise.secondsPerRep}s/rep`,
                              })}
                              tone="secondary"
                            />
                          ) : null}
                          {qex.exercise.muscles.slice(0, 4).map((m) => (
                            <Chip key={m} label={MUSCLE_LABELS[m]?.[language] ?? m} />
                          ))}
                          {qex.exercise.muscles.length > 4 ? (
                            <Chip label={`+${qex.exercise.muscles.length - 4}`} />
                          ) : null}
                        </XStack>
                      </YStack>
                    </XStack>
                  </Card>
                );
              })}
            </YStack>
          ) : null}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
