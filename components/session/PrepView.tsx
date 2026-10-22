import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  type StyleProp,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { H1, H3, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { AppText } from "@/components/common/AppText";
import { FONT_CAPS } from "@/components/common/fontCaps";
import { getExerciseAsset, getExerciseThumb } from "@/constants/assetMap";
import { WARMUP_PICTURE_MIN_HEIGHT } from "@/constants/layout";
import { rawColors } from "@/constants/rawColors";
import { useFontScaled } from "@/hooks/useFontScaled";
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
const DESCRIPTION_STYLE = { flexGrow: 0, flexShrink: 0 } as const;

/**
 * A movement's description, whole, scrolling rather than growing.
 *
 * `uncapped` is for a parent that scrolls already: a second scroll in the same direction never
 * gets the drag on Android, so the lines past the sixth could not be reached there.
 */
export function MovementDescription({
  text,
  uncapped = false,
  lines,
}: {
  text: string;
  uncapped?: boolean;
  /** D-64: a hard line count, for a screen whose picture needs the room back. */
  lines?: number;
}) {
  // 120 dp is six lines at font scale 1; the cap follows the scale so a large-text hero gets six
  // lines too, not four and a half cut through the middle.
  const maxHeight = useFontScaled(120);
  const body = (
    <AppText
      fontSize={14}
      color="textSecondary"
      lineHeight="20px"
      numberOfLines={lines}
      style={{ textAlign: "center" }}
    >
      {text}
    </AppText>
  );
  if (uncapped) return body;
  return (
    <FadedScroll
      testID="movement-description"
      hostStyle={FADE_HOST_STYLE}
      style={[DESCRIPTION_STYLE, { maxHeight }]}
    >
      {body}
    </FadedScroll>
  );
}

/**
 * A scroll that fades its last line while more is below. The lines past the box are there, and
 * nothing said so: a sentence cut mid-line read as the end of the text (persona audit 05, 71).
 */
function FadedScroll({
  testID,
  hostStyle,
  style,
  contentContainerStyle,
  children,
}: {
  testID: string;
  hostStyle: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const [box, setBox] = useState(0);
  const [content, setContent] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  return (
    <View style={hostStyle}>
      <ScrollView
        testID={testID}
        style={style}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => setBox(e.nativeEvent.layout.height)}
        onContentSizeChange={(_w, h) => setContent(h)}
        onScroll={(e) => {
          const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
          setAtEnd(contentOffset.y + layoutMeasurement.height >= contentSize.height - 2);
        }}
        scrollEventThrottle={64}
      >
        {children}
      </ScrollView>
      {content > box + 1 && !atEnd ? (
        <LinearGradient
          testID={`${testID}-fade`}
          pointerEvents="none"
          colors={[rawColors.bgDarkClear, rawColors.bgDark]}
          style={FADE_STYLE}
        />
      ) : null}
    </View>
  );
}

const FADE_HOST_STYLE = { ...DESCRIPTION_STYLE, alignSelf: "stretch" } as const;
const FADE_STYLE = { position: "absolute", left: 0, right: 0, bottom: 0, height: 28 } as const;

// `flexGrow` keeps the movement centred while it fits.
const PINNED_SCROLL_STYLE = { flex: 1, alignSelf: "stretch" } as const;
const PINNED_FILL_STYLE = { flex: 1 } as const;
const PINNED_CONTENT_STYLE = {
  flexGrow: 1,
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
} as const;

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
    <AppText color="textSecondary" fontSize={15} fontWeight="700">
      {target}
    </AppText>
  ) : null;

  if (compact) {
    return (
      <XStack items="center" gap="3" width="100%">
        <YStack
          width={64}
          height={64}
          bg="surface2"
          rounded="3"
          overflow="hidden"
          borderWidth={1}
          borderColor="borderStrong"
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
        <YStack flex={1} gap="1">
          <H3 color="text" fontWeight="700" numberOfLines={2}>
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
      <YStack items="center" gap="1">
        <H3 color="text" fontWeight="700" style={{ textAlign: "center" }}>
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
      <AppText color="textSecondary" fontSize={15} style={{ textAlign: "center" }}>
        {t("session.prep_tap_hint")}
      </AppText>
    );
  }

  const running = remainingSeconds > 0;
  return (
    <H1
      maxFontSizeMultiplier={FONT_CAPS.display}
      fontWeight="700"
      fontSize={running ? 64 : 40}
      lineHeight="68px"
      color="text"
      fontFamily="body"
      fontVariant={["tabular-nums"]}
      transition={reducedMotion ? undefined : "quick"}
      scale={reducedMotion ? undefined : "enter:0.92"}
      opacity={reducedMotion ? undefined : "enter:0.6"}
      key={reducedMotion ? undefined : String(remainingSeconds)}
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
  /**
   * Takes the height it is given: what the movement is scrolls, the clock and GO stay under it.
   * The warm-up's wait on a 360x640 screen had both below the fold, inside the block that
   * scrolled, and read as a movement already running (audit 2026-10-11, F3).
   */
  pinned?: boolean;
  /** D-64: clamp the description to this many lines. Only the intro at a small size asks. */
  descriptionLines?: number;
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
  pinned = false,
  descriptionLines,
}: PrepViewProps) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();

  const movement = (
    <>
      <AppText
        fontSize={13}
        fontWeight="700"
        color="textSecondary"
        letterSpacing={1}
        textTransform="uppercase"
      >
        {kicker}
      </AppText>

      <MovementIdentity
        instruction={instruction}
        name={instruction?.name ?? fallbackName}
        target={target}
        // Pinned, the full picture left the name, the dose and the instruction under the fold of
        // a 640dp screen: the thumbnail keeps all three in view, and the movement's own screen
        // shows the picture whole ten seconds later.
        // A tall window has the room for the picture: the thumbnail sat alone in the void.
        compact={compact || (pinned && height < WARMUP_PICTURE_MIN_HEIGHT)}
      />

      {instruction?.description ? (
        <MovementDescription
          text={instruction.description}
          uncapped={pinned}
          lines={descriptionLines}
        />
      ) : null}
    </>
  );

  return (
    <YStack items="center" gap="3" width="100%" flex={pinned ? 1 : undefined}>
      {pinned ? (
        // Pinned, the description is uncapped and this scroll is what cuts it: the fade goes here.
        <FadedScroll
          testID="prep-movement"
          hostStyle={PINNED_SCROLL_STYLE}
          style={PINNED_FILL_STYLE}
          contentContainerStyle={PINNED_CONTENT_STYLE}
        >
          {movement}
        </FadedScroll>
      ) : (
        movement
      )}

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
