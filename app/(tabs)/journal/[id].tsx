import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack } from "tamagui";
import { Skeleton } from "@/components/common/Skeleton";
import { KillReport } from "@/components/journal/KillReport";
import { NButton, NMuted, NPageHeader, NStatusScrim } from "@/components/journal/nocturne";
import { QuestLog } from "@/components/journal/QuestLog";
import { type LoadedSession, readSession } from "@/components/journal/sessionLog";
import { useConfirmForget } from "@/components/journal/useConfirmForget";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

const parseId = (raw?: string | string[]): number | null => {
  const val = Array.isArray(raw) ? raw[0] : raw;
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? num : null;
};

/**
 * One session: the quest log, or the kill report when this is the session that felled a boss.
 * Same route for both, so the history row and the boss list open the same page for the same kill.
 */
export default function SessionDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[]; view?: string }>();
  const { t } = useTranslation();
  const { confirmForget, dialog } = useConfirmForget();
  const language = useSettingsStore((s) => s.language);
  const sessionId = parseId(params.id);
  const [loaded, setLoaded] = useState<LoadedSession>({ status: "loading" });

  const load = useCallback(
    async (id: number) => {
      setLoaded(
        await readSession(id, language, t).catch((error: unknown) => {
          reportError("journal.detail", error);
          return {
            status: "error" as const,
            message: error instanceof Error ? error.message : t("common.error"),
          };
        }),
      );
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
          <QuestLog data={loaded.log} onChanged={() => load(sessionId)} />
        )}
        <YStack px={11} mt={24}>
          <NButton
            testID="journal-forget-session"
            variant="danger"
            onPress={() => confirmForget(sessionId, () => router.back())}
          >
            {t("journal.forget")}
          </NButton>
        </YStack>
      </ScrollView>
      <NStatusScrim />
      {dialog}
    </YStack>
  );
}
