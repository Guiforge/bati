import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack } from "tamagui";
import { VillagerSays } from "@/components/chorus/VillagerLine";
import { AppButton } from "@/components/common/AppButton";
import { AppText } from "@/components/common/AppText";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";

/**
 * The screen after "I'm stopping, it hurts", in the victory screen's place: one line and the way to
 * the Safety page. No figure and no feast: what the sets earned is credited all the same, and the
 * Journal shows it.
 *
 * A stop before any set has nothing to write (a session with no sets cannot exist, and an empty one
 * would light the flame), so it only says the line and leaves.
 */
export function PainStopView() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const saveSession = useSessionStore((s) => s.saveSession);
  const quitSession = useSessionStore((s) => s.quitSession);
  const [hasSets] = useState(() => useSessionStore.getState().results.length > 0);
  const [saved, setSaved] = useState(!hasSets);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` is what Retry changes. The save is idempotent (`ensureSessionRow`).
  useEffect(() => {
    if (!hasSets) return;
    saveSession(null)
      .then(() => setSaved(true))
      .catch((error: unknown) => {
        reportError("session.painStopSave", error);
        setFailed(true);
      });
  }, [attempt, hasSets, saveSession]);

  // Quit clears the session state, and it keeps the row: `savedSessionId` is set by now.
  const leave = useCallback(() => {
    quitSession();
    router.dismissTo("/");
  }, [quitSession, router]);

  // Back from here is the session that just ended. Until the save lands, there is nowhere to go.
  // On focus only: the Safety page opens over this screen, and back there must return here.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (saved) leave();
        return true;
      });
      return () => subscription.remove();
    }, [saved, leave]),
  );

  const safetyLink = (
    <Pressable
      testID="pain-stop-safety"
      hitSlop={12}
      accessibilityRole="link"
      onPress={() => router.push("/safety" as never)}
    >
      <AppText py="2" color="primaryText" fontWeight="700">
        {t("pause.safety_link")}
      </AppText>
    </Pressable>
  );

  return (
    <YStack
      flex={1}
      justify="center"
      gap="4"
      px="4"
      pt={insets.top}
      pb={insets.bottom}
      testID="pain-stop-view"
    >
      {failed ? (
        <>
          <AppText color="text" testID="pain-stop-save-failed">
            {t("errors.save_session_failed")}
          </AppText>
          <AppButton
            testID="pain-stop-retry"
            onPress={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            {t("common.retry")}
          </AppButton>
          {safetyLink}
        </>
      ) : saved ? (
        <>
          <VillagerSays villager="herbalist" pose="talk" shown={t("session.pain_stop_line")} />
          {safetyLink}
          <AppButton testID="pain-stop-continue" onPress={leave}>
            {t("session.continue")}
          </AppButton>
        </>
      ) : null}
    </YStack>
  );
}
