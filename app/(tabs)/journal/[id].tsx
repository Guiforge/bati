import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Skeleton } from "@/components/common/Skeleton";
import { KillReport } from "@/components/journal/KillReport";
import {
  NBackButton,
  NButton,
  NMuted,
  NPageHeader,
  NStatusScrim,
} from "@/components/journal/nocturne";
import { QuestLog } from "@/components/journal/QuestLog";
import { type LoadedSession, readSession } from "@/components/journal/sessionLog";
import { useConfirmForget } from "@/components/journal/useConfirmForget";
import { rawColors } from "@/constants/rawColors";
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
/** Past this the hero (and the back button it carries) has left the screen. */
const HERO_SCROLL_OFF = 160;

export default function SessionDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[]; view?: string }>();
  const { t } = useTranslation();
  const { confirmForget, dialog } = useConfirmForget();
  const language = useSettingsStore((s) => s.language);
  const sessionId = parseId(params.id);
  // The hero's own back button scrolls away with the page; once it has, a fixed one takes over.
  const [pastHero, setPastHero] = useState(false);
  const [loaded, setLoaded] = useState<LoadedSession>({ status: "loading" });

  const load = useCallback(
    async (id: number) => {
      setLoaded(
        await readSession(id, language, t).catch((error: unknown) => {
          reportError("journal.detail", error);
          return {
            status: "error" as const,
            message: t("common.error"),
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
        testID="journal-detail-scroll"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={100}
        onScroll={(e) => setPastHero(e.nativeEvent.contentOffset.y > HERO_SCROLL_OFF)}
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
          {/* An outline AppButton like every other secondary action. The red stays on the edge as
              the raw colour (the Journal theme folds `$error` into its inks); the label stays
              bone, in the family's face. */}
          <AppButton
            testID="journal-forget-session"
            variant="outline"
            borderColor={rawColors.error as never}
            onPress={() => confirmForget(sessionId, () => router.back())}
          >
            {t("journal.forget")}
          </AppButton>
        </YStack>
      </ScrollView>
      {pastHero ? (
        <View style={{ position: "absolute", top: insets.top + 11, left: 11 }}>
          <NBackButton
            testID="journal-fixed-back"
            onPress={() => router.back()}
            label={t("common.go_back")}
            veiled
          />
        </View>
      ) : null}
      <NStatusScrim />
      {dialog}
    </YStack>
  );
}
