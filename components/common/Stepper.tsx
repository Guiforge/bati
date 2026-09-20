import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button, Text, XStack, YStack } from "tamagui";
import { Minus, Plus } from "@/components/icons";

/**
 * How a hold behaves. A target in seconds reaches an hour and an outing's twelve hours
 * (`targetRangeFor`), both in fives: 714 taps for the first and 8638 for the second, which is
 * why the outing's goal left this control for a sheet of presets. Repeating at a fixed rate is
 * not enough on its own, so the step grows once the finger has been down a second.
 */
const HOLD_DELAY_MS = 400;
const REPEAT_MS = 100;
const ACCELERATE_AFTER_MS = 1000;
const ACCELERATION = 10;

/**
 * Where one tick lands. Accelerated, on a multiple of the bigger unit rather than wherever the
 * value happened to be: 33s goes to 50 then 100, not to 83 then 133. A number scrolling past at
 * ten a second has to be readable while it moves, and round is what makes it readable.
 */
function nextHeldValue(from: number, direction: 1 | -1, unit: number, snap: boolean): number {
  if (!snap) return from + direction * unit;
  return direction > 0
    ? Math.floor(from / unit) * unit + unit
    : Math.ceil(from / unit) * unit - unit;
}

type StepperProps = {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Appended to the displayed value, e.g. "s" for a duration. Ignored when `display` is given. */
  suffix?: string;
  /**
   * How the value reads, when the raw number is not how a person says it. The stepper still
   * *moves* in `step` units: a 15-minute outing steps five seconds at a time and says "15 min",
   * because "900s" is a number nobody has ever used to describe a walk.
   */
  display?: (value: number) => string;
  onChange: (value: number) => void;
};

/**
 * Hold either button and the value keeps moving.
 *
 * The number it moves from is held here, not read back from `value`: the parent owns the state
 * and a render that arrives later than the next tick would hand two ticks the same number and
 * swallow a step, on a slow phone and never in dev. The props are only read when the finger goes
 * down, which is the one moment nothing is in flight.
 */
function useHoldRepeat(
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: (value: number) => void,
) {
  const held = useRef<{ value: number; ticks: number; moved: boolean } | null>(null);
  const timers = useRef<{
    delay?: ReturnType<typeof setTimeout>;
    repeat?: ReturnType<typeof setInterval>;
  }>({});

  // The object is mutated rather than replaced, so the cleanup below holds the live one.
  const stop = () => {
    const pending = timers.current;
    if (pending.delay) clearTimeout(pending.delay);
    if (pending.repeat) clearInterval(pending.repeat);
    pending.delay = undefined;
    pending.repeat = undefined;
  };

  // A hold that outlives its screen keeps calling a parent that is gone.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      if (pending.delay) clearTimeout(pending.delay);
      if (pending.repeat) clearInterval(pending.repeat);
    };
  }, []);

  const start = (direction: 1 | -1) => {
    stop();
    held.current = { value, ticks: 0, moved: false };
    timers.current.delay = setTimeout(() => {
      timers.current.repeat = setInterval(() => {
        const hold = held.current;
        if (!hold) return;
        hold.ticks += 1;
        const fast = hold.ticks * REPEAT_MS >= ACCELERATE_AFTER_MS;
        const next = nextHeldValue(hold.value, direction, fast ? step * ACCELERATION : step, fast);
        const clamped = Math.min(max, Math.max(min, next));
        // At the bound the button turns `disabled` under the finger, and a disabled button is not
        // guaranteed to report the release: stopping here is what makes sure the timer dies.
        if (clamped === hold.value) {
          stop();
          return;
        }
        hold.value = clamped;
        hold.moved = true;
        onChange(clamped);
      }, REPEAT_MS);
    }, HOLD_DELAY_MS);
  };

  /**
   * True when the hold already moved the value, so the `onPress` that follows the release does
   * not add one more step on top of it.
   *
   * This trusts `onPressOut` to arrive when the gesture is stolen, typically a scroll starting
   * under the finger. Checked on an emulator inside the quest screen's ScrollView: a press that
   * turns into a drag scrolls, moves the value not at all, and leaves nothing running behind it.
   * A timer still ticking after the finger left is the worst this feature can do, so a surface
   * that wraps the stepper in something other than a ScrollView is worth the same ten seconds.
   */
  const consumed = () => {
    const moved = held.current?.moved ?? false;
    held.current = null;
    return moved;
  };

  return { start, stop, consumed };
}

/** Label plus a −/+ pair. The only numeric input in the app that never needs a keyboard. */
export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  display,
  onChange,
}: StepperProps) {
  const { t } = useTranslation();
  const hold = useHoldRepeat(value, min, max, step, onChange);

  return (
    <XStack items="center" justify="space-between" gap="$3">
      <YStack flex={1}>
        {/* Two lines, since a label here can be a movement name: "Course du Messager" next to a
            value reading "13 min" rather than "900s" no longer fits on one, and truncating the
            movement is worse than wrapping it. */}
        <Text fontWeight="700" fontSize={15} color="$text" numberOfLines={2}>
          {label}
        </Text>
        {hint ? (
          <Text fontSize={12} color="$textSecondary">
            {hint}
          </Text>
        ) : null}
      </YStack>

      <XStack items="center" gap="$3">
        <Button
          size="$3"
          // A rep count adjusted between two sets, with the hands that just did them: `$3` is
          // 36 dp, and this is the control least able to afford a miss.
          hitSlop={8}
          circular
          icon={<Minus size={16} />}
          disabled={value <= min}
          opacity={value <= min ? 0.4 : 1}
          accessibilityLabel={t("common.decrease", { label, defaultValue: `Decrease ${label}` })}
          onPressIn={() => hold.start(-1)}
          onPressOut={hold.stop}
          onPress={() => {
            if (!hold.consumed()) onChange(Math.max(min, value - step));
          }}
        />
        <Text
          fontWeight="700"
          fontSize={18}
          color="$text"
          style={{ minWidth: 64, textAlign: "center" }}
        >
          {display ? display(value) : `${value}${suffix}`}
        </Text>
        <Button
          size="$3"
          hitSlop={8}
          circular
          icon={<Plus size={16} />}
          disabled={value >= max}
          opacity={value >= max ? 0.4 : 1}
          accessibilityLabel={t("common.increase", { label, defaultValue: `Increase ${label}` })}
          onPressIn={() => hold.start(1)}
          onPressOut={hold.stop}
          onPress={() => {
            if (!hold.consumed()) onChange(Math.min(max, value + step));
          }}
        />
      </XStack>
    </XStack>
  );
}
