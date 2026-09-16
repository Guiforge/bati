import { type GetProps, YStack } from "tamagui";

type TimerBarProps = Omit<GetProps<typeof YStack>, "children"> & {
  /** 0 to 1, clamped. */
  value: number;
  fill: GetProps<typeof YStack>["bg"];
  fillOpacity?: number;
};

/**
 * The bar under a running clock. It steps once a second, with the numeral, and never animates.
 *
 * It was Tamagui's `Progress`. On the phone, a rest or a timed set held the JS thread at 33-42 %
 * of a core and drew ~40 frames a second for as long as it was on screen, where a set counted in
 * reps sat at 0 %. Not only the spring: the warm-up's `Progress` had no `transition` at all and
 * cost the same 41 %. Measured on the Fairphone, same flow, rest screen (perf audit B2, 16/09):
 *
 * - `Progress` + `transition="quick"`: ~400 frames / 10 s, JS 33-36 %, UI thread 24-29 %.
 * - Reanimated `withTiming` (250 ms), UI thread: ~170 frames, JS 6 %, UI 30 %, p50 29 ms.
 * - A plain width, no easing (this): 20 frames, JS 6 %, UI 15-17 %.
 *
 * What is left is the tick itself. Moving the numeral and the bar into their own component, so a
 * tick stopped re-rendering the whole rest, measured the same 6 %, so the views were left alone.
 *
 * `__tests__/timer-bar.test.tsx` fails if `Progress` comes back anywhere, or if the fill animates.
 */
export function TimerBar({ value, fill, fillOpacity, ...track }: TimerBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 1000) / 10;
  return (
    <YStack
      testID="timer-bar"
      height={11}
      width="100%"
      overflow="hidden"
      rounded="$6"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      {...track}
    >
      <YStack
        testID="timer-bar-fill"
        height="100%"
        width={`${percent}%`}
        bg={fill}
        opacity={fillOpacity}
      />
    </YStack>
  );
}
