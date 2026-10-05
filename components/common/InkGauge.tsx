import { useEffect, useState } from "react";
import { type ColorTokens, Text, XStack, YStack } from "tamagui";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const GAUGE_HEIGHT = 10;

type ColorToken = ColorTokens;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const pct = (n: number): `${number}%` => `${+(clamp01(n) * 100).toFixed(2)}%`;

/**
 * The inked gauge: a 10 dp framed track with an optional figure beside it. The boss's health and
 * the hero's level card both draw it, so progress, lost or earned, reads one way. `animate` fills
 * it once from empty when it mounts; reduced motion skips every transition.
 */
export function InkGauge({
  progress,
  fill,
  track = "$bgDark",
  figure,
  figureColor = "$text",
  figureLabel,
  animate = false,
  testIDPrefix,
  trail,
}: {
  /** 0..1. */
  progress: number;
  fill: ColorToken;
  track?: ColorToken;
  figure?: string;
  figureColor?: ColorToken;
  figureLabel?: string;
  animate?: boolean;
  testIDPrefix: string;
  /** A second, fainter bar behind the fill (the arena's damage trail), 0..1. */
  trail?: number;
}) {
  const reducedMotion = useReducedMotion();
  const quick = reducedMotion ? undefined : ("quick" as const);
  const target = clamp01(progress);
  // One-shot fill: mount empty, then move to the target.
  const [shown, setShown] = useState(animate && !reducedMotion ? 0 : target);
  useEffect(() => setShown(target), [target]);

  return (
    <XStack items="center" gap="$2">
      <YStack
        flex={1}
        height={GAUGE_HEIGHT}
        bg={track}
        borderWidth={1.5}
        borderColor="$borderStrong"
        rounded="$1"
        overflow="hidden"
      >
        {trail === undefined ? null : (
          <YStack
            testID={`${testIDPrefix}-trail`}
            position="absolute"
            t={0}
            b={0}
            l={0}
            width={pct(trail)}
            bg="$error"
            opacity={0.45}
            transition={quick}
          />
        )}
        <YStack
          testID={`${testIDPrefix}-fill`}
          position="absolute"
          t={0}
          b={0}
          l={0}
          width={pct(shown)}
          bg={fill}
          transition={quick}
        />
      </YStack>
      {figure === undefined ? null : (
        <Text
          testID={`${testIDPrefix}-figure`}
          fontFamily="$body"
          fontWeight="700"
          fontSize={13}
          color={figureColor}
          fontVariant={["tabular-nums"]}
          accessibilityLabel={figureLabel ?? figure}
        >
          {figure}
        </Text>
      )}
    </XStack>
  );
}
