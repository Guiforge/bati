import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack } from "tamagui";
import { Skeleton } from "@/components/common/Skeleton";
import { KillReport } from "@/components/journal/KillReport";
import { NButton, NMuted, NPageHeader, NStatusScrim } from "@/components/journal/nocturne";
import { QuestLog, type QuestLogData } from "@/components/journal/QuestLog";
import { getCompletedSessionById } from "@/db";
import { pointsOf } from "@/db/gps";
import {
  getFallenRecords,
  getKillReport,
  getMuscleShift,
  getQuestStanding,
  getSessionRung,
  isLatestSession,
  type KillReport as KillReportData,
} from "@/db/journal";
import { listQuestTemplates } from "@/db/quests";
import { getUserLevelInfo } from "@/db/userLevel";
import { type LngLat, toTrace } from "@/src/gps/trace";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

type Loaded =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; log: QuestLogData; kill: KillReportData | null };

const parseId = (raw?: string | string[]): number | null => {
  const val = Array.isArray(raw) ? raw[0] : raw;
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? num : null;
};

/**
 * The run's own line, or nothing.
 *
 * `toTrace` is what the recap draws from, and its `path` is already one part per unbroken run,
 * which is what puts the gaps in: the preview query downsamples and drops the clock. Never allowed
 * to fail the screen: a missing trace is not worth losing the session over.
 */
async function traceFor(uuid: string | null): Promise<readonly (readonly LngLat[])[]> {
  if (!uuid) return [];
  const fixes = await pointsOf(uuid).catch((error) => {
    reportError("journal.trace", error);
    return [];
  });
  if (fixes.length < 2) return [];
  return toTrace(fixes).path.geometry.coordinates as LngLat[][];
}

/**
 * One session: the quest log, or the kill report when this is the session that felled a boss.
 * Same route for both, so the history row and the boss list open the same page for the same kill.
 */
export default function SessionDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[]; view?: string }>();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const sessionId = parseId(params.id);
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  const load = useCallback(
    async (id: number) => {
      try {
        const session = await getCompletedSessionById(id);
        if (!session) {
          setLoaded({ status: "error", message: t("journal.session_not_found") });
          return;
        }
        const [quests, trace, standing, records, shift, rung, latest, level, kill] =
          await Promise.all([
            listQuestTemplates(),
            traceFor(session.uuid),
            getQuestStanding(session),
            getFallenRecords(session),
            getMuscleShift(session),
            getSessionRung(session),
            isLatestSession(session),
            getUserLevelInfo(),
            getKillReport(session),
          ]);
        const quest = session.questId ? quests.find((q) => q.id === session.questId) : null;
        setLoaded({
          status: "ready",
          kill,
          log: {
            session,
            questTitle: quest ? localizedTitle(quest, language) : t("journal.own_quest"),
            questImage: quest?.imagePath ?? null,
            trace,
            standing,
            records,
            shift,
            rung,
            latest,
            level,
          },
        });
      } catch (error) {
        reportError("journal.detail", error);
        setLoaded({
          status: "error",
          message: error instanceof Error ? error.message : t("common.error"),
        });
      }
    },
    [t, language],
  );

  useEffect(() => {
    if (sessionId) load(sessionId).catch((e) => reportError("journal.detail", e));
  }, [sessionId, load]);

  if (!sessionId || loaded.status === "error") {
    return (
      <YStack flex={1} bg="$bgDark" pt={insets.top} px={11}>
        <NPageHeader
          title={t("journal.session_not_found")}
          onBack={() => router.back()}
          backLabel={t("common.go_back")}
        />
        {loaded.status === "error" && (
          <YStack gap={11} mt={11}>
            <NMuted>{loaded.message}</NMuted>
            {sessionId ? (
              <NButton onPress={() => load(sessionId)}>{t("common.retry")}</NButton>
            ) : null}
          </YStack>
        )}
      </YStack>
    );
  }

  if (loaded.status === "loading") {
    return (
      <YStack flex={1} bg="$bgDark" pt={insets.top} px={11} gap={6}>
        <Skeleton height={150} bg="$surface2" />
        <Skeleton height={90} bg="$surface2" />
        <Skeleton height={120} bg="$surface2" />
      </YStack>
    );
  }

  return (
    <YStack flex={1} bg="$bgDark">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {loaded.kill && params.view !== "log" ? (
          <KillReport
            report={loaded.kill}
            session={loaded.log.session}
            onOpenLog={() => router.push(`/journal/${sessionId}?view=log` as never)}
          />
        ) : (
          <QuestLog data={loaded.log} />
        )}
      </ScrollView>
      <NStatusScrim />
    </YStack>
  );
}
