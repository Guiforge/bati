import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { H1, H3, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { getExerciseAsset, getExerciseThumb } from "@/constants/assetMap";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { SessionInstruction } from "@/hooks/useSessionInstructions";

/**
 * The how-to box: caps at ~6 lines and scrolls past that, and refuses to be squeezed.
 *
 * `flexShrink` is 1 by default on an RN ScrollView, so the overflowing column above shrank this
 * to three lines and cut the sentence mid-word, the same defect `FilterRail`'s `RAIL_STYLE`
 * exists to prevent, and the exact complaint that started this: a hero who does not know the
 * movement, reading half a sentence while the clock runs.
 */
const DESCRIPTION_STYLE = { maxHeight: 120, flexGrow: 0, flexShrink: 0 } as const;

/** A movement's description, whole, scrolling rather than growing. */
export function MovementDescription({ text }: { text: string }) {
  return (
    <ScrollView style={DESCRIPTION_STYLE} showsVerticalScrollIndicator={false}>
      <Text fontSize={14} color="$textSecondary" lineHeight={20} style={{ textAlign: "center" }}>
        {text}
      </Text>
    </ScrollView>
  );
}

/** The picture, the name and what the movement asks for: stacked, or a thumbnail beside them. */
function MovementIdentity({
  instruction,
  name,
  target,
  compact,
}: {
  instruction: SessionInstruction | null;
  name: string;
  target: string | null;
  compact: boolean;
}) {
  const targetLine = target ? (
    <Text color="$textSecondary" fontSize={15} fontWeight="700">
      {target}
    </Text>
  ) : null;

  if (compact) {
    return (
      <XStack items="center" gap="$3" width="100%">
        <YStack
          width={64}
          height={64}
          bg="$surface2"
          rounded="$3"
          overflow="hidden"
          borderWidth={1}
          borderColor="$borderStrong"
        >
          {instruction ? (
            <Image
              source={getExerciseThumb(instruction.imagePath)}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={150}
            />
          ) : null}
        </YStack>
        <YStack flex={1} gap="$1">
          <H3 color="$text" fontWeight="700" numberOfLines={2}>
            {name}
          </H3>
          {targetLine}
        </YStack>
      </XStack>
    );
  }

  return (
    <>
      {instruction ? (
        <Image
          source={getExerciseAsset(instruction.imagePath)}
          style={{ width: 160, height: 160, borderRadius: 16 }}
          contentFit="cover"
        />
      ) : null}
      <YStack items="center" gap="$1">
        <H3 color="$text" fontWeight="700" style={{ textAlign: "center" }}>
          {name}
        </H3>
        {targetLine}
      </YStack>
    </>
  );
}

/** The seconds left, "Let's go!" on the last one, or the line that says GO is the way on. */
function PrepClock({ remainingSeconds }: { remainingSeconds: number | null }) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  if (remainingSeconds === null) {
    return (
      <Text color="$textSecondary" fontSize={15} style={{ textAlign: "center" }}>
        {t("session.prep_tap_hint")}
      </Text>
    );
  }

  const running = remainingSeconds > 0;
  return (
    <H1
      fontWeight="700"
      fontSize={running ? 64 : 40}
      lineHeight={68}
      color="$primaryText"
      fontFamily="$body"
      transition={reducedMotion ? undefined : "quick"}
      key={reducedMotion ? undefined : String(remainingSeconds)}
      enterStyle={reducedMotion ? undefined : { scale: 0.92, opacity: 0.6 }}
      style={{ textAlign: "center" }}
    >
      {running ? remainingSeconds : t("session.countdown_letsgo")}
    </H1>
  );
}

type PrepViewProps = {
  /** What this wait is before: "Get ready · 2/6", "First trial". */
  kicker: string;
  /** Null while the catalogue loads, which is when `fallbackName` is all there is to show. */
  instruction: SessionInstruction | null;
  fallbackName: string;
  /** What the movement asks for, in the words the hero reads it in: "30s", "12 reps". */
  target: string | null;
  /** Seconds before the movement starts on its own, or `null` when it waits for GO. */
  remainingSeconds: number | null;
  onGo: () => void;
  goTestID: string;
  /**
   * A thumbnail beside the name rather than the picture above it. The start screen already has
   * a painting at its top, and a second full picture under it pushed GO off a 640dp screen.
   */
  compact?: boolean;
};

/**
 * The wait before a movement: what it is, before its clock runs.
 *
 * One block for both waits the session has, the warm-up's transitions and the start screen, so
 * the rule behind them has one shape: the name, the picture and the whole description are on
 * screen first, and the thirty seconds start after. It used to be the other way round, and four
 * players described the same thing from four angles, a clock running on a movement they were
 * still reading about.
 *
 * GO is there in both modes. With the timer it starts the movement early; without it, it is the
 * only way forward, which is what the hero asked for in Settings.
 */
export function PrepView({
  kicker,
  instruction,
  fallbackName,
  target,
  remainingSeconds,
  onGo,
  goTestID,
  compact = false,
}: PrepViewProps) {
  const { t } = useTranslation();

  return (
    <YStack items="center" gap="$3" width="100%">
      <Text
        fontSize={13}
        fontWeight="700"
        color="$primaryText"
        letterSpacing={1}
        textTransform="uppercase"
      >
        {kicker}
      </Text>

      <MovementIdentity
        instruction={instruction}
        name={instruction?.name ?? fallbackName}
        target={target}
        compact={compact}
      />

      {instruction?.description ? <MovementDescription text={instruction.description} /> : null}

      <PrepClock remainingSeconds={remainingSeconds} />

      <AppButton
        testID={goTestID}
        variant="primary"
        onPress={onGo}
        accessibilityLabel={t("session.prep_go_accessibility")}
        accessibilityRole="button"
      >
        {t("session.prep_go")}
      </AppButton>
    </YStack>
  );
}
