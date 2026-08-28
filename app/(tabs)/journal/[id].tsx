import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Tag } from "@/components/common/Tag";
import { ChevronLeft, Clock, Dumbbell, Repeat, Target } from "@/components/icons";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { formatDuration, getCompletedSessionById } from "@/db";
import type { CompletedSession } from "@/db/completed";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import { MUSCLE_LABELS } from "@/db/muscles";
import { getCached, setCached } from "@/db/queryCache";
import { listQuestTemplates } from "@/db/quests";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
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
  const language = useSettingsStore((s) => s.language);

  const sessionId = parseId(params.id);

  const [status, setStatus] = useState<Status>(() =>
    sessionId != null && getCached<CompletedSession>(`session:${sessionId}`) ? "ready" : "loading",
  );
  const [session, setSession] = useState<CompletedSession | null>(() =>
    sessionId != null ? (getCached<CompletedSession>(`session:${sessionId}`) ?? null) : null,
  );
  const [questTitle, setQuestTitle] = useState<string>(() =>
    sessionId != null ? (getCached<string>(`sessionTitle:${sessionId}:${language}`) ?? "") : "",
  );
  const [error, setError] = useState("");

  const load = useCallback(
    async (id: number) => {
      // Keep the already-rendered session visible while revalidating; only show the
      // loading card when there is nothing to show yet.
      setStatus((s) => (s === "ready" ? "ready" : "loading"));
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
            const title = localizedTitle(quest, language);
            setQuestTitle(title);
            setCached(`sessionTitle:${id}:${language}`, title);
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
    if (sessionId) load(sessionId).catch((e) => reportError("journal.detail", e));
  }, [sessionId, load]);

  const goBack = () => router.back();

  if (!sessionId) {
    return (
      <YStack flex={1} bg="$background" justify="center" items="center" p="$6" gap="$4">
        <Text fontSize={48}>🤷</Text>
        <Text fontWeight="700" fontSize={18} color="$text">
          {t("journal.invalid_session", "Session not found")}
        </Text>
        <AppButton fullWidth={false} variant="secondary" onPress={goBack}>
          {t("common.go_back", "Go back")}
        </AppButton>
      </YStack>
    );
  }

  const dateLabel = session
    ? getDateTimeFormat(language, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(session.performedAt))
    : "";

  const durationLabel = session?.durationSeconds ? formatDuration(session.durationSeconds) : "--";

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
    <YStack testID="session-details-screen" flex={1} bg="$background">
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
            <AppIconButton
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel={t("quests.go_back", "Go back")}
            >
              <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
            </AppIconButton>
            <XStack items="center" gap="$2">
              <Dumbbell size={18} color="$primaryText" strokeWidth={2.5} />
              <Text fontWeight="700" fontSize={20} color="$text">
                {t("journal.session_details", "Session Details")}
              </Text>
            </XStack>
          </XStack>

          {/* Loading State */}
          {status === "loading" && (
            <Card bg="$surface">
              <XStack items="center" justify="center" gap="$3" py="$4">
                <Text fontSize={28}>📜</Text>
                <Text fontWeight="700" fontSize={16} color="$text">
                  {t("common.loading", "Loading...")}
                </Text>
              </XStack>
            </Card>
          )}

          {/* Error State */}
          {status === "error" && (
            <Card bg="$surface">
              <YStack gap="$3" items="center" py="$2">
                <Text fontSize={32}>😵</Text>
                <Text fontWeight="700" fontSize={16} color="$text">
                  {t("common.error", "Oops!")}
                </Text>
                <Paragraph color="$textSecondary" size="$3" style={{ textAlign: "center" }}>
                  {error}
                </Paragraph>
                <AppButton fullWidth={false} variant="secondary" onPress={() => load(sessionId)}>
                  {t("common.retry", "Retry")} ↻
                </AppButton>
              </YStack>
            </Card>
          )}

          {/* Session Content */}
          {status === "ready" && session && (
            <>
              {/* Quest Title Card */}
              <Card bg="$surface">
                <YStack gap="$3">
                  <YStack gap="$1">
                    <Text fontSize={14} color="$textSecondary">
                      {t("journal.quest_completed", "Quest Completed")}
                    </Text>
                    <H2 color="$text" fontWeight="700" fontSize={24}>
                      {questTitle || t("quests.not_found", "Unknown Quest")}
                    </H2>
                  </YStack>

                  <Text fontSize={14} color="$textSecondary">
                    {dateLabel}
                  </Text>

                  <XStack gap="$2" flexWrap="wrap">
                    <Tag
                      icon={<Clock size={12} color="$text" />}
                      label={durationLabel}
                      tone="secondary"
                    />
                    <Tag
                      label={t(`quests.level_${session.userLevel}`, session.userLevel)}
                      tone="primary"
                    />
                    <Tag
                      icon={<Repeat size={12} color="$text" />}
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
                      bg="$surface2"
                      borderWidth={1}
                      borderColor="$borderStrong"
                      items="center"
                      justify="center"
                    >
                      <Text color="$text" fontWeight="700" fontSize={14}>
                        {roundIndex + 1}
                      </Text>
                    </YStack>
                    <Text fontWeight="700" fontSize={16} color="$text">
                      {t("journal.round", "Round")} {roundIndex + 1}
                    </Text>
                  </XStack>

                  {/* ponytail: per-exercise rendering with target/result/record branches; extract a row
                      component when the record badge grows a second variant. */}
                  {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: see the ponytail note above */}
                  {(exercisesByRound[roundIndex] ?? []).map((cex) => {
                    const exName = language === "fr" ? cex.exercise.frName : cex.exercise.enName;
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

                    const hitTarget = cex.target && cex.result.value >= cex.target.value;

                    return (
                      <Card key={cex.id}>
                        <XStack gap="$3" items="flex-start">
                          <YStack
                            width={44}
                            height={44}
                            rounded={22}
                            bg={hitTarget ? "$pastelGreen" : "$bgLight"}
                            borderWidth={1}
                            borderColor="$borderStrong"
                            justify="center"
                            items="center"
                          >
                            <Dumbbell size={20} color="$text" strokeWidth={2.5} />
                          </YStack>

                          <YStack flex={1} gap="$2">
                            <Text fontWeight="700" fontSize={16} color="$text">
                              {exName}
                            </Text>

                            <XStack gap="$3" items="center">
                              <YStack>
                                <Text fontSize={12} color="$text" opacity={0.6}>
                                  {t("journal.result", "Result")}
                                </Text>
                                <Text
                                  fontWeight="700"
                                  fontSize={18}
                                  color={hitTarget ? "$success" : "$text"}
                                >
                                  {resultLabel}
                                </Text>
                              </YStack>

                              {!!targetLabel && (
                                <YStack>
                                  <Text fontSize={12} color="$text" opacity={0.6}>
                                    {t("journal.target", "Target")}
                                  </Text>
                                  <XStack items="center" gap="$1">
                                    <Target size={14} color="$text" opacity={0.7} />
                                    <Text
                                      fontWeight="700"
                                      fontSize={16}
                                      color="$text"
                                      opacity={0.7}
                                    >
                                      {targetLabel}
                                    </Text>
                                  </XStack>
                                </YStack>
                              )}
                            </XStack>

                            <XStack gap="$2" flexWrap="wrap">
                              <Tag label={equipmentLabel} />
                              {cex.exercise.muscles.slice(0, 3).map((m) => (
                                <Tag
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
              {!!session.notes && (
                <Card>
                  <YStack gap="$2">
                    <Text fontWeight="700" fontSize={14} color="$text">
                      {t("journal.notes", "Notes")}
                    </Text>
                    <Paragraph color="$text" opacity={0.7}>
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
