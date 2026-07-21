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

import { NarrativeModal } from "@/components/adventures/NarrativeModal";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Tag } from "@/components/common/Tag";
import { getExerciseAsset, getQuestAsset } from "@/constants/assetMap";
import { getQuestColorTokensFromQuest } from "@/constants/exerciseColors";
import { Difficulty, estimateQuestSeconds, formatDuration, getQuestById } from "@/db";
import { getAdventureStepNarrative } from "@/db/adventures-narrative";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import { MUSCLE_LABELS } from "@/db/muscles";
import type { Quest, Target } from "@/db/quests";
import type { DifficultyCode } from "@/db/schema";
import { computeSessionXp } from "@/db/xp";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

type LoadState =
  | { status: "loading"; quest: Quest | null }
  | { status: "ready"; quest: Quest }
  | { status: "error"; quest: Quest | null; message: string };

function resolveQuestImage(path?: string | null): ImageSourcePropType | null {
  if (!path) return null;
  return path.startsWith("http") ? { uri: path } : getQuestAsset(path);
}

function resolveExerciseImage(path?: string | null): ImageSourcePropType | null {
  if (!path) return null;
  return path.startsWith("http") ? { uri: path } : getExerciseAsset(path);
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

function LevelChip({
  value,
  level,
  onSelect,
}: {
  value: Difficulty;
  level: Difficulty;
  onSelect: (value: Difficulty) => void;
}) {
  const { t } = useTranslation();
  const active = value === level;

  return (
    <AppButton
      onPress={() => onSelect(value)}
      fullWidth={false}
      height={40}
      px="$3"
      bg={active ? "$secondary" : "$surface"}
      borderColor={active ? "$secondary" : "$borderStrong"}
      borderWidth={1}
      rounded="$10"
      fontSize={14}
      pressStyle={{ opacity: 0.9 }}
    >
      <Text color="$text" fontWeight="700">
        {levelLabel(value, t)}
      </Text>
    </AppButton>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex screen component, refactor planned
export default function QuestDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string | string[];
    level?: string;
    runStepId?: string;
  }>();
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const { startSession } = useSessionStore();

  const questId = useMemo(() => {
    const raw = params.id;
    const v = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, [params]);

  const runStepId = useMemo(() => {
    const raw = params.runStepId;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [params.runStepId]);

  const initialLevel = useMemo((): Difficulty => {
    if (params.level === "easy") return Difficulty.Easy;
    if (params.level === "hard") return Difficulty.Hard;
    if (params.level === "medium") return Difficulty.Medium;
    return Difficulty.Medium;
  }, [params.level]);

  const [level, setLevel] = useState<Difficulty>(initialLevel);
  const [state, setState] = useState<LoadState>({
    status: "loading",
    quest: null,
  });
  const [narrative, setNarrative] = useState<string | null>(null);
  const [showNarrative, setShowNarrative] = useState(false);

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
    load(questId, level).catch(() => {
      // Error already handled
    });
  }, [questId, level, load]);

  if (!questId) {
    return (
      <YStack flex={1} bg="$background" justify="center" items="center" p="$6" gap="$3">
        <Text fontWeight="700" fontSize={18} color="$text">
          {t("quests.invalid_id", "Invalid quest")}
        </Text>
        <AppButton fullWidth={false} variant="secondary" onPress={() => router.back()}>
          {t("quests.go_back", "Go back")}
        </AppButton>
      </YStack>
    );
  }

  const quest = state.quest;
  const questTitle = quest ? (language === "fr" ? quest.frTitle : quest.enTitle) : "";
  const questDesc = quest ? (language === "fr" ? quest.frDescription : quest.enDescription) : "";
  const questTokens = quest ? getQuestColorTokensFromQuest(quest) : null;
  const estimatedSeconds = quest ? estimateQuestSeconds(quest) : null;
  const estimate = estimatedSeconds != null ? formatDuration(estimatedSeconds, language) : null;
  const xpReward =
    estimatedSeconds != null
      ? computeSessionXp({
          durationSeconds: estimatedSeconds,
          userLevel: level as unknown as DifficultyCode,
        })
      : null;

  const proceedToSession = () => {
    if (quest) {
      startSession(quest, level, { adventureRunStepId: runStepId });
      router.push("/session" as never);
    }
  };

  const handleStart = async () => {
    if (!quest) return;

    if (runStepId) {
      try {
        const text = await getAdventureStepNarrative(runStepId, language);
        if (text) {
          setNarrative(text);
          setShowNarrative(true);
          return;
        }
      } catch {
        // Error handled silently
      }
    }

    proceedToSession();
  };

  const headerImage = resolveQuestImage(quest?.imagePath);

  return (
    <YStack flex={1} bg="$background">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <YStack p="$5" pt={insets.top + 12} gap="$4">
          <XStack items="center" justify="space-between">
            <XStack items="center" gap="$3">
              <AppIconButton
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel={t("quests.go_back", "Go back")}
              >
                <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
              </AppIconButton>

              <XStack items="center" gap="$2">
                <Sparkles size={18} color="$text" />
                <Text fontWeight="700" fontSize={20} color="$text">
                  {t("quests.details_title", "Quest")}
                </Text>
              </XStack>
            </XStack>

            <Tag label={levelLabel(level, t)} tone="secondary" />
          </XStack>

          {headerImage ? (
            <YStack
              width="100%"
              aspectRatio={16 / 9}
              bg={questTokens?.bg ?? "$surface"}
              borderWidth={1}
              borderColor="$borderStrong"
              rounded="$8"
              shadowColor="$shadowColor"
              shadowRadius={6}
              shadowOffset={{ width: 0, height: 3 }}
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
            <Card bg="$surface">
              <YStack gap="$2">
                <Text fontWeight="700" fontSize={16} color="$text">
                  {t("quests.load_error", "Failed to load quest")}
                </Text>
                <Paragraph color="$textSecondary" size="$3">
                  {state.message}
                </Paragraph>
                <AppButton
                  fullWidth={false}
                  variant="secondary"
                  onPress={() => {
                    load(questId, level).catch(() => {
                      // Error already handled
                    });
                  }}
                >
                  {t("quests.retry", "Retry")} ↻
                </AppButton>
              </YStack>
            </Card>
          ) : null}

          {state.status === "loading" && !quest ? (
            <Card bg="$surface">
              <XStack items="center" justify="space-between">
                <Text fontWeight="700" fontSize={16} color="$text">
                  {t("quests.loading", "Loading quest...")}
                </Text>
                <Text fontSize={24}>🧠</Text>
              </XStack>
            </Card>
          ) : null}

          {quest ? (
            <Card bg={questTokens?.bg ?? "$surface"}>
              <YStack gap="$2">
                <H2 color="$text" fontWeight="700" fontSize={26}>
                  {questTitle}
                </H2>

                <Paragraph color="$textSecondary" size="$4" lineHeight={22}>
                  {questDesc}
                </Paragraph>

                <XStack gap="$2" flexWrap="wrap" pt="$2">
                  <Tag
                    label={t("quests.rounds", {
                      count: quest.rounds,
                      defaultValue: `${quest.rounds} rounds`,
                    })}
                  />
                  <Tag
                    label={t("quests.exercises", {
                      count: quest.exercises.length,
                      defaultValue: `${quest.exercises.length} exercises`,
                    })}
                    tone="primary"
                  />
                  <Tag
                    label={t("quests.rest", {
                      count: quest.restSeconds,
                      defaultValue: `Rest ${quest.restSeconds}s`,
                    })}
                  />
                  {estimate ? (
                    <Tag
                      label={t("quests.estimate", {
                        duration: estimate,
                        defaultValue: `≈ ${estimate}`,
                      })}
                      tone="secondary"
                    />
                  ) : null}
                  {xpReward != null ? (
                    <Tag
                      label={t("quests.reward_xp", {
                        count: xpReward,
                        defaultValue: `+${xpReward} XP`,
                      })}
                      tone="secondary"
                    />
                  ) : null}
                </XStack>

                <XStack gap="$2" flexWrap="wrap" pt="$2">
                  <Text fontWeight="700" color="$textSecondary">
                    {t("quests.level", "Level")}
                  </Text>
                  <LevelChip value={Difficulty.Easy} level={level} onSelect={setLevel} />
                  <LevelChip value={Difficulty.Medium} level={level} onSelect={setLevel} />
                  <LevelChip value={Difficulty.Hard} level={level} onSelect={setLevel} />
                </XStack>
              </YStack>
            </Card>
          ) : null}

          {quest ? (
            <YStack gap="$3">
              <Text fontWeight="700" fontSize={18} color="$text">
                {t("quests.exercises_list", "Exercises")}
              </Text>

              {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex rendering logic, refactor planned */}
              {quest.exercises.map((qex, i) => {
                const exName = language === "fr" ? qex.exercise.frName : qex.exercise.enName;
                const exDesc =
                  language === "fr" ? qex.exercise.frDescription : qex.exercise.enDescription;

                const thumbPaths = [qex.exercise.imagePath, ...qex.images].filter(Boolean);
                const uniqueThumbPaths = Array.from(new Set(thumbPaths));
                // Only keep thumbs that actually resolve to a real image; a row of
                // fallback-emoji tiles is noise, not content.
                const thumbs = uniqueThumbPaths
                  .slice(0, 10)
                  .filter((p) => resolveExerciseImage(p) != null);

                return (
                  <Card
                    key={qex.id}
                    onPress={() => router.push(`/exercises/${qex.exercise.id}` as never)}
                  >
                    <XStack gap="$3" items="flex-start">
                      <YStack
                        width={52}
                        height={52}
                        rounded={26}
                        bg="$surface"
                        borderWidth={1}
                        borderColor="$borderStrong"
                        justify="center"
                        items="center"
                      >
                        <Dumbbell size={24} color="$text" strokeWidth={2.5} />
                      </YStack>

                      <YStack flex={1} gap="$1">
                        <XStack items="center" justify="space-between" gap="$2">
                          <Text fontWeight="700" fontSize={17} color="$text" flex={1}>
                            {i + 1}. {exName}
                          </Text>
                          <Tag
                            label={formatTarget(qex.target, language)}
                            tone={qex.target.type === "time" ? "secondary" : "primary"}
                          />
                        </XStack>

                        {thumbs.length > 0 ? (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <XStack gap="$2" pt="$2" pb="$1">
                              {thumbs.map((p, idx) => (
                                <YStack
                                  // biome-ignore lint/suspicious/noArrayIndexKey: stable enough for static lists
                                  key={`${p}-${idx}`}
                                  width={42}
                                  height={42}
                                  rounded={12}
                                  overflow="hidden"
                                  bg="$surface"
                                  borderWidth={1}
                                  borderColor="$borderStrong"
                                >
                                  <Image
                                    source={resolveExerciseImage(p)}
                                    style={{ width: "100%", height: "100%" }}
                                    contentFit="cover"
                                    transition={0}
                                  />
                                </YStack>
                              ))}
                            </XStack>
                          </ScrollView>
                        ) : null}

                        <Paragraph color="$textSecondary" size="$3" numberOfLines={3}>
                          {exDesc}
                        </Paragraph>

                        <XStack gap="$2" flexWrap="wrap" pt="$2">
                          <Tag
                            label={
                              EQUIPMENT_LABELS[qex.exercise.equipment]?.[language] ??
                              qex.exercise.equipment
                            }
                          />
                          {qex.target.type === "reps" ? (
                            <Tag
                              label={t("quests.seconds_per_rep", {
                                count: qex.exercise.secondsPerRep,
                                defaultValue: `${qex.exercise.secondsPerRep}s/rep`,
                              })}
                              tone="secondary"
                            />
                          ) : null}
                          {qex.exercise.muscles.slice(0, 4).map((m) => (
                            <Tag key={m} label={MUSCLE_LABELS[m]?.[language] ?? m} />
                          ))}
                          {qex.exercise.muscles.length > 4 ? (
                            <Tag label={`+${qex.exercise.muscles.length - 4}`} />
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

      {quest ? (
        <YStack
          p="$4"
          pb={insets.bottom + 16}
          bg="$background"
          borderTopWidth={1}
          borderColor="$borderStrong"
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
        >
          <AppButton
            height={60}
            variant="primary"
            pressStyle={{ opacity: 0.9 }}
            onPress={handleStart}
            rounded="$6"
          >
            <Text color="$text" fontSize={22} fontWeight="700">
              {t("quests.start_button", "Start Quest")}
            </Text>
          </AppButton>
        </YStack>
      ) : null}

      <NarrativeModal
        visible={showNarrative}
        title={questTitle}
        text={narrative ?? ""}
        onClose={() => {
          setShowNarrative(false);
          proceedToSession();
        }}
        onDismiss={() => setShowNarrative(false)}
        type="intro"
      />
    </YStack>
  );
}
