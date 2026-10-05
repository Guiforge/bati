import { useEffect, useState } from "react";
import { type ColorTokens, Text, XStack, YStack } from "tamagui";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const GAUGE_HEIGHT = 10;
const SWEEP_DELAY_MS = 400;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const pct = (n: number): `${number}%` => `${+(clamp01(n) * 100).toFixed(2)}%`;

/**
 * The inked gauge: a 10 dp framed track with an optional figure beside it. The boss's health and
 * the hero's level card both draw it, so progress, lost or earned, reads one way. `from` sets the
 * fill at that point on mount, then moves it once to `progress` (a slow sweep after a beat);
 * reduced motion skips every transition and shows `progress` at once.
 */
export function InkGauge({
  progress,
  fill,
  track = "$bgDark",
  figure,
  figureColor = "$text",
  figureLabel,
  from,
  testIDPrefix,
  trail,
}: {
  /** 0..1. */
  progress: number;
  fill: ColorTokens;
  track?: ColorTokens;
  figure?: string;
  figureColor?: ColorTokens;
  figureLabel?: string;
  /** 0..1. Fill starts here on mount and sweeps once to `progress`. */
  from?: number;
  testIDPrefix: string;
  /** A second, fainter bar behind the fill (the arena's damage trail), 0..1. */
  trail?: number;
}) {
  const reducedMotion = useReducedMotion();
  const sweeps = from !== undefined && !reducedMotion;
  const transition = reducedMotion ? undefined : sweeps ? ("slow" as const) : ("quick" as const);
  const target = clamp01(progress);
  const [shown, setShown] = useState(sweeps ? clamp01(from) : target);
  useEffect(() => {
    if (!sweeps) return setShown(target);
    const id = setTimeout(() => setShown(target), SWEEP_DELAY_MS);
    return () => clearTimeout(id);
  }, [sweeps, target]);

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
            transition={transition}
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
          transition={transition}
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
