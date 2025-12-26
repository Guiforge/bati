import { ChevronLeft, Clock, Dumbbell, Repeat, Target } from "@tamagui/lucide-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { formatDuration, getCompletedSessionById } from "@/db";
import type { CompletedSession } from "@/db/completed";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import { MUSCLE_LABELS } from "@/db/muscles";
import { listQuestTemplates } from "@/db/quests";
import { useSettingsStore } from "@/stores/settings";

type Status = "loading" | "ready" | "error";

const parseId = (raw?: string | string[]): number | null => {
  const val = Array.isArray(raw) ? raw[0] : raw;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

export default function SessionDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { t } = useTranslation();
  const { language } = useSettingsStore();

  const sessionId = parseId(params.id);

  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<CompletedSession | null>(null);
  const [questTitle, setQuestTitle] = useState<string>("");
  const [error, setError] = useState("");

  const load = useCallback(
    async (id: number) => {
      setStatus("loading");
      setError("");
      try {
        const data = await getCompletedSessionById(id);
        if (!data) {
          setError(t("journal.session_not_found", "Session not found"));
          setStatus("error");
          return;
        }
        setSession(data);

        // Fetch quest title
        if (data.questId) {
          const quests = await listQuestTemplates();
          const quest = quests.find((q) => q.id === data.questId);
          if (quest) {
            setQuestTitle(language === "fr" ? quest.frTitle : quest.enTitle);
          }
        }

        setStatus("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
        setStatus("error");
      }
    },
    [t, language],
  );

  useEffect(() => {
    if (sessionId) load(sessionId);
  }, [sessionId, load]);

  const goBack = () => router.back();

  if (!sessionId) {
    return (
      <YStack
        flex={1}
        bg="$background"
        justify="center"
        items="center"
        p="$6"
        gap="$4"
      >
        <Text fontSize={48}>🤷</Text>
        <Text fontWeight="900" fontSize={18} color="$color">
          {t("journal.invalid_session", "Session not found")}
        </Text>
        <AppButton fullWidth={false} variant="secondary" onPress={goBack}>
          {t("common.go_back", "Go back")}
        </AppButton>
      </YStack>
    );
  }

  const dateLabel = session
    ? new Intl.DateTimeFormat(language, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(session.performedAt))
    : "";

  const durationLabel = session?.durationSeconds
    ? formatDuration(session.durationSeconds, language)
    : "--";

  // Group exercises by round
  const exercisesByRound = session
    ? session.exercises.reduce(
        (acc, ex) => {
          const round = ex.roundIndex;
          if (!acc[round]) acc[round] = [];
          acc[round].push(ex);
          return acc;
        },
        {} as Record<number, typeof session.exercises>,
      )
    : {};

  const roundNumbers = Object.keys(exercisesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <YStack flex={1} bg="$background">
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          minHeight: "100%",
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack p="$5" pt={insets.top + 12} gap="$5">
          {/* Header */}
          <XStack items="center" gap="$3">
            <AppIconButton onPress={goBack}>
              <ChevronLeft size={22} color="$color" strokeWidth={2.5} />
            </AppIconButton>
            <XStack items="center" gap="$2">
              <Dumbbell size={18} color="$color" strokeWidth={2.5} />
              <Text fontWeight="900" fontSize={20} color="$color">
                {t("journal.session_details", "Session Details")}
              </Text>
            </XStack>
          </XStack>

          {/* Loading State */}
          {status === "loading" && (
            <Card>
              <XStack items="center" justify="center" gap="$3" py="$4">
                <Text fontSize={28}>📜</Text>
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("common.loading", "Loading...")}
                </Text>
              </XStack>
            </Card>
          )}

          {/* Error State */}
          {status === "error" && (
            <Card>
              <YStack gap="$3" items="center" py="$2">
                <Text fontSize={32}>😵</Text>
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("common.error", "Oops!")}
                </Text>
                <Paragraph color="$color" opacity={0.6} size="$3">
                  {error}
                </Paragraph>
                <AppButton
                  fullWidth={false}
                  variant="secondary"
                  onPress={() => load(sessionId)}
                >
                  {t("common.retry", "Retry")} ↻
                </AppButton>
              </YStack>
            </Card>
          )}

          {/* Session Content */}
          {status === "ready" && session && (
            <>
              {/* Quest Title Card */}
              <Card bg="$pastelYellow">
                <YStack gap="$3">
                  <YStack gap="$1">
                    <Text fontSize={14} color="$color" opacity={0.6}>
                      {t("journal.quest_completed", "Quest Completed")}
                    </Text>
                    <H2 color="$color" fontWeight="900" fontSize={24}>
                      {questTitle || t("quests.not_found", "Unknown Quest")}
                    </H2>
                  </YStack>

                  <Text fontSize={14} color="$color" opacity={0.7}>
                    {dateLabel}
                  </Text>

                  <XStack gap="$2" flexWrap="wrap">
                    <Chip
                      icon={<Clock size={12} color="$color" />}
                      label={durationLabel}
                      tone="secondary"
                    />
                    <Chip
                      label={t(
                        `quests.level_${session.userLevel}`,
                        session.userLevel,
                      )}
                      tone="primary"
                    />
                    <Chip
                      icon={<Repeat size={12} color="$color" />}
                      label={t("journal.rounds_completed", {
                        count: roundNumbers.length,
                        defaultValue: `${roundNumbers.length} rounds`,
                      })}
                    />
                  </XStack>
                </YStack>
              </Card>

              {/* Exercises by Round */}
              {roundNumbers.map((roundIndex) => (
                <YStack key={roundIndex} gap="$3">
                  <XStack items="center" gap="$2">
                    <YStack
                      width={32}
                      height={32}
                      rounded={16}
                      bg="$primary"
                      items="center"
                      justify="center"
                    >
                      <Text
                        color="white"
                        fontWeight="900"
                        fontSize={14}
                      >
                        {roundIndex + 1}
                      </Text>
                    </YStack>
                    <Text fontWeight="900" fontSize={16} color="$color">
                      {t("journal.round", "Round")} {roundIndex + 1}
                    </Text>
                  </XStack>

                  {exercisesByRound[roundIndex].map((cex, idx) => {
                    const exName =
                      language === "fr"
                        ? cex.exercise.frName
                        : cex.exercise.enName;
                    const equipmentLabel =
                      EQUIPMENT_LABELS[cex.exercise.equipment]?.[language] ??
                      cex.exercise.equipment;

                    const resultLabel =
                      cex.result.type === "time"
                        ? `${cex.result.value}s`
                        : `${cex.result.value} reps`;

                    const targetLabel = cex.target
                      ? cex.target.type === "time"
                        ? `${cex.target.value}s`
                        : `${cex.target.value} reps`
                      : null;

                    const hitTarget =
                      cex.target && cex.result.value >= cex.target.value;

                    return (
                      <Card key={`${cex.id}-${idx}`}>
                        <XStack gap="$3" items="flex-start">
                          <YStack
                            width={44}
                            height={44}
                            rounded={22}
                            bg={hitTarget ? "$success" : "$bgLight"}
                            borderWidth={2}
                            borderColor="$color"
                            justify="center"
                            items="center"
                          >
                            <Dumbbell
                              size={20}
                              color={hitTarget ? "white" : "$color"}
                              strokeWidth={2.5}
                            />
                          </YStack>

                          <YStack flex={1} gap="$2">
                            <Text
                              fontWeight="900"
                              fontSize={16}
                              color="$color"
                            >
                              {exName}
                            </Text>

                            <XStack gap="$3" items="center">
                              <YStack>
                                <Text
                                  fontSize={12}
                                  color="$color"
                                  opacity={0.6}
                                >
                                  {t("journal.result", "Result")}
                                </Text>
                                <Text
                                  fontWeight="900"
                                  fontSize={18}
                                  color={hitTarget ? "$success" : "$color"}
                                >
                                  {resultLabel}
                                </Text>
                              </YStack>

                              {targetLabel && (
                                <YStack>
                                  <Text
                                    fontSize={12}
                                    color="$color"
                                    opacity={0.6}
                                  >
                                    {t("journal.target", "Target")}
                                  </Text>
                                  <XStack items="center" gap="$1">
                                    <Target
                                      size={14}
                                      color="$color"
                                      opacity={0.7}
                                    />
                                    <Text
                                      fontWeight="700"
                                      fontSize={16}
                                      color="$color"
                                      opacity={0.7}
                                    >
                                      {targetLabel}
                                    </Text>
                                  </XStack>
                                </YStack>
                              )}
                            </XStack>

                            <XStack gap="$2" flexWrap="wrap">
                              <Chip label={equipmentLabel} />
                              {cex.exercise.muscles.slice(0, 3).map((m) => (
                                <Chip
                                  key={m}
                                  label={MUSCLE_LABELS[m]?.[language] ?? m}
                                  tone="success"
                                />
                              ))}
                            </XStack>
                          </YStack>
                        </XStack>
                      </Card>
                    );
                  })}
                </YStack>
              ))}

              {/* Notes Section */}
              {session.notes && (
                <Card>
                  <YStack gap="$2">
                    <Text fontWeight="900" fontSize={14} color="$color">
                      {t("journal.notes", "Notes")}
                    </Text>
                    <Paragraph color="$color" opacity={0.7}>
                      {session.notes}
                    </Paragraph>
                  </YStack>
                </Card>
              )}
            </>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
