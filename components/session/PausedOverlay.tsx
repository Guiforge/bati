import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { Paragraph, Text, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { restsBetweenRounds } from "@/components/quests/questShape";
import { ExerciseInstructionsBody } from "@/components/session/ExerciseInstructions";
import { useHaptics } from "@/hooks/useHaptics";
import { useSessionInstructions } from "@/hooks/useSessionInstructions";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

export function PausedOverlay() {
  const { t } = useTranslation();
  const router = useRouter();
  const { mediumImpact, selection, warning } = useHaptics();
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const status = useSessionStore((s) => s.status);
  const prePauseStatus = useSessionStore((s) => s.prePauseStatus);
  const resumeSession = useSessionStore((s) => s.resumeSession);
  const restartRound = useSessionStore((s) => s.restartRound);
  const quitSession = useSessionStore((s) => s.quitSession);
  const rounds = useSessionStore((s) => s.quest?.rounds ?? 1);
  // Above the early return: hook order may not depend on the paused state.
  const instruction = useSessionInstructions();

  if (status !== "paused") return null;

  // No round has begun before the first exercise, and restartRound() would jump straight to
  // "running" - skipping the rest of the warm-up and the 3-2-1 countdown with it.
  //
  // And a quest of one round has no round to go back to: "Redo the round" there is the session
  // itself, offered under a word that promises less than it does. An expedition is where that
  // showed, and any one-round quest written in the editor had it too.
  const canRestartRound =
    restsBetweenRounds({ rounds }) && prePauseStatus !== "warmup" && prePauseStatus !== "countdown";

  const handleResume = () => {
    mediumImpact();
    resumeSession();
  };

  // The beeps are reachable from Settings, which is two screens and a lost session away. The
  // moment a hero wants them off is the moment one just went off in a quiet gym, and pause is
  // the only control surface every session state can reach — warm-up, countdown, set and rest
  // all route here. Same setting, same store, same row as Settings writes: one writer.
  const handleToggleSound = () => {
    selection();
    setSoundEnabled(!soundEnabled).catch((error) => {
      reportError("session.soundWrite", error);
    });
  };

  const handleRestartRound = () => {
    warning();
    // Guarded like `handleQuit`, and for the stronger reason. `restartRound()` drops every result
    // whose roundIndex is the current one — up to five sets the hero just finished — and it sat
    // one tap away, unconfirmed, directly above the button that *was* confirmed. Worse, its label
    // reads additive: "redo the round" sounds like going again, not like erasing what is already
    // logged. The confirmation was on the button whose name already sounds dangerous.
    Alert.alert(
      t("session.restart_confirm_title", "Restart this round?"),
      t("session.restart_confirm_body", "Every set you logged in this round is erased."),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("session.restart_round_button"),
          style: "destructive",
          onPress: () => {
            mediumImpact();
            restartRound();
          },
        },
      ],
    );
  };

  const confirmQuit = () => {
    quitSession();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const handleQuit = () => {
    warning();
    // Quitting wipes the session and its saved recovery slot; one mis-tap on a button that
    // sits right under "restart round" must not cost the workout.
    Alert.alert(
      t("session.quit_confirm_title", "Abandon this session?"),
      t("session.quit_confirm_body", "This session's progress will be lost."),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        { text: t("session.quit_button"), style: "destructive", onPress: confirmQuit },
      ],
    );
  };

  return (
    <YStack
      fullscreen
      bg="$bgOverlay"
      style={{ zIndex: 1000 }}
      items="center"
      justify="center"
      gap="$6"
      p="$6"
    >
      <Card width="100%" maxW={360} bg="$surface">
        <YStack gap="$3" items="center">
          <Text fontWeight="700" fontSize={28} color="$text" style={{ textAlign: "center" }}>
            {t("session.paused_title")}
          </Text>
          <Paragraph color="$textSecondary" size="$3" style={{ textAlign: "center" }}>
            {t("session.paused_subtitle")}
          </Paragraph>

          {/* The one moment reading is free. A hero who does not know what a dead bug is was
              watching the clock run while they worked it out; here it is stopped. Same block the
              running screen opens as a modal — see ExerciseInstructions.tsx. */}
          {instruction ? (
            <YStack pt="$2">
              <ExerciseInstructionsBody instruction={instruction} artSize={120} />
            </YStack>
          ) : null}

          <YStack width="100%" gap="$3" pt="$2">
            <AppButton
              testID="session-resume"
              onPress={handleResume}
              variant="primary"
              accessibilityLabel={t("session.resume_button")}
              accessibilityRole="button"
            >
              {t("session.resume_button")}
            </AppButton>

            {/* Between resume and the two that erase things: benign, and not adjacent to quit. */}
            <AppButton
              testID="session-sound"
              onPress={handleToggleSound}
              variant="outline"
              backgroundColor="$surface2"
              pressStyle={{ opacity: 0.9 }}
              accessibilityLabel={t("settings.sound")}
              accessibilityRole="switch"
              accessibilityState={{ checked: soundEnabled }}
            >
              {soundEnabled ? t("session.sound_on") : t("session.sound_off")}
            </AppButton>

            {canRestartRound ? (
              <AppButton
                testID="session-restart-round"
                onPress={handleRestartRound}
                variant="outline"
                backgroundColor="$surface2"
                pressStyle={{ opacity: 0.9 }}
                accessibilityLabel={t("session.restart_round_button")}
                accessibilityRole="button"
              >
                {t("session.restart_round_button")}
              </AppButton>
            ) : null}

            <AppButton
              testID="session-quit"
              onPress={handleQuit}
              variant="outline"
              backgroundColor="$surface2"
              pressStyle={{ opacity: 0.9 }}
              accessibilityLabel={t("session.quit_button")}
              accessibilityRole="button"
            >
              {t("session.quit_button")}
            </AppButton>
          </YStack>
        </YStack>
      </Card>
    </YStack>
  );
}
