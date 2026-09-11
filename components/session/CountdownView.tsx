import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, XStack, YStack } from "tamagui";
import { Pause } from "@/components/icons";
import { getBossAsset, getExerciseAsset, getQuestAsset } from "@/constants/assetMap";
import { rawColors } from "@/constants/rawColors";
import { formatTarget } from "@/db/targets";
import { useCountdownCues } from "@/hooks/useCountdownCues";
import { useHaptics } from "@/hooks/useHaptics";
import { describeExercise } from "@/hooks/useSessionInstructions";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { localizedName, localizedTitle } from "@/src/i18n/localized";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { getHpPercent, getPhaseFromHp, getPhaseLook } from "./bossPhase";
import { ExerciseHero } from "./ExerciseHero";
import { PrepView } from "./PrepView";
import { sessionArtHeight } from "./sessionArt";

/** Same shadow `ExerciseHero` gives its title: contrast of its own, so no scrim covers the art. */
const OVER_ART_SHADOW = {
  textShadowColor: "rgba(6, 8, 18, 0.85)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
} as const;

/**
 * The session's first screen: what the hero is setting out against, and the first thing they
 * will do about it.
 *
 * It was a sword and a 3-2-1, which said "something is about to start" and never what. Now the
 * painting of the quest, or of the boss when there is one, takes the top of the screen the way the
 * monster does during the fight, and under it is the same wait the warm-up uses between its
 * movements: the first exercise, its target and its description, then ten seconds or GO.
 *
 * Its colours are the first exercise's, or the fight's, computed the way `ActiveExerciseView`
 * computes them, so leaving this screen for the first set changes what is on it and not the room.
 */
export function CountdownView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const language = useSettingsStore((s) => s.language);
  const { remainingSeconds } = useSessionTimer();
  // The same cue the rest and the timed set use: 3-2-1, then go.
  useCountdownCues(remainingSeconds);
  const status = useSessionStore((s) => s.status);
  const quest = useSessionStore((s) => s.quest);
  const bossFight = useSessionStore((s) => s.bossFight);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const timerStartTimestamp = useSessionStore((s) => s.timerStartTimestamp);
  const finishCountdown = useSessionStore((s) => s.finishCountdown);
  const pauseSession = useSessionStore((s) => s.pauseSession);
  const { lightImpact, selection, success } = useHaptics();
  const prevSecondsRef = useRef(remainingSeconds);
  // No clock is a wait for GO (`prepTimer` in stores/session.ts), and its zero is not an ending.
  const timed = timerStartTimestamp !== null;

  // A light tick on the seconds that beep. It ticked on every second when there were three of
  // them; on ten, a phone tapping the palm the whole way down reads as a call coming in.
  useEffect(() => {
    if (status !== "countdown") return;
    if (
      remainingSeconds !== prevSecondsRef.current &&
      remainingSeconds > 0 &&
      remainingSeconds <= 3
    ) {
      lightImpact();
    }
    prevSecondsRef.current = remainingSeconds;
  }, [remainingSeconds, status, lightImpact]);

  // Success haptic on "Let's go!", then the first set.
  useEffect(() => {
    if (status !== "countdown" || !timed || remainingSeconds !== 0) return;

    success();

    const id = setTimeout(() => {
      finishCountdown();
    }, 450);

    return () => clearTimeout(id);
  }, [finishCountdown, remainingSeconds, status, success, timed]);

  const first = quest?.exercises[currentExerciseIndex];
  if (!quest || !first) return null;

  // A fight owns the room's colour, the same rule and the same inputs as the running screen.
  const phaseLook = bossFight
    ? getPhaseLook(getPhaseFromHp(getHpPercent(bossFight.currentHp, bossFight.totalHp)))
    : null;
  const _firstStep = { exercise: first.exercise, targetType: first.target.type };
  // The same dark ground the set screen it counts into uses. A countdown in the muscle's pastel
  // and a session in the dark would change the room's colour the moment the number hits zero.
  const screenBg = phaseLook?.bgToken ?? "$bgDark";
  const screenBgRaw = phaseLook?.bgRaw ?? rawColors.bgDark;

  // What the hero is setting out against: the monster, else the quest's own cover. A quest a hero
  // wrote may have no cover, and then the first movement is the picture.
  const art = bossFight
    ? getBossAsset(bossFight.imagePath, bossFight.tier)
    : quest.imagePath
      ? getQuestAsset(quest.imagePath)
      : getExerciseAsset(first.exercise.imagePath);
  const title = bossFight ? localizedName(bossFight, language) : localizedTitle(quest, language);

  return (
    <YStack flex={1} bg={screenBg} pb={insets.bottom + 16} gap="$3">
      <ExerciseHero
        source={art}
        name={title}
        minHeight={Math.round(
          sessionArtHeight(width, height, bossFight ? "boss" : "exercise") * 0.5,
        )}
        fadeTo={screenBgRaw}
        topInset={insets.top}
      />

      <XStack
        position="absolute"
        t={insets.top + 8}
        l="$4"
        r="$4"
        z={10}
        justify="space-between"
        items="center"
      >
        <Text
          fontSize={13}
          fontWeight="700"
          color="$text"
          letterSpacing={1}
          textTransform="uppercase"
          {...OVER_ART_SHADOW}
        >
          {bossFight ? t("session.start_boss") : t("session.start_quest")}
        </Text>
        <Button
          testID="session-pause"
          size="$3"
          hitSlop={8}
          circular
          icon={<Pause size={20} color="$text" />}
          onPress={pauseSession}
          chromeless
          pressStyle={{ opacity: 0.7 }}
          accessibilityLabel={t("session.pause_accessibility")}
          accessibilityRole="button"
        />
      </XStack>

      <YStack px="$5">
        <PrepView
          compact
          kicker={t("session.start_first")}
          instruction={describeExercise(first.exercise, language)}
          fallbackName={localizedName(first.exercise, language)}
          target={formatTarget(first.target)}
          remainingSeconds={timed ? remainingSeconds : null}
          onGo={() => {
            selection();
            finishCountdown();
          }}
          goTestID="session-start-go"
        />
      </YStack>
    </YStack>
  );
}
