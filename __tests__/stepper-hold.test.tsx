import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { TamaguiProvider } from "tamagui";

import { Stepper } from "@/components/common/Stepper";
import config from "@/tamagui.config";

/**
 * Holding a stepper button, because tapping it is not a way to cross the ranges this app has:
 * a target in seconds reaches an hour in fives (714 taps) and an outing reaches twelve hours
 * (8638). The property that matters is that no tick is lost and none is counted twice, on a
 * parent that renders whenever it gets round to it.
 */

async function mount(props: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** Off, the value prop never moves: the stand-in for a parent whose render arrives late. */
  live?: boolean;
  onChange: (value: number) => void;
}) {
  function Harness() {
    const [value, setValue] = useState(props.value);
    return (
      <Stepper
        label="Rest"
        value={props.live === false ? props.value : value}
        min={props.min ?? 0}
        max={props.max ?? 300}
        step={props.step ?? 5}
        onChange={(next) => {
          props.onChange(next);
          setValue(next);
        }}
      />
    );
  }
  await act(async () => {
    await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <Harness />
      </TamaguiProvider>,
    );
  });
  const buttons = screen.getAllByRole("button");
  return { minus: buttons[0], plus: buttons[1] };
}

/** A press, whole: down, up, then the press itself, in the order RN fires them. */
async function tap(button: unknown) {
  await act(() => fireEvent(button as never, "pressIn"));
  await act(() => fireEvent(button as never, "pressOut"));
  await act(() => fireEvent.press(button as never));
}

describe("Stepper held down", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("a tap still moves exactly one step", async () => {
    const onChange = jest.fn();
    const { plus } = await mount({ value: 30, onChange });

    await tap(plus);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(35);
  });

  test("a hold repeats, and the release does not add one more on top", async () => {
    const onChange = jest.fn();
    const { plus } = await mount({ value: 30, onChange });

    await act(() => fireEvent(plus as never, "pressIn"));
    await act(() => {
      jest.advanceTimersByTime(400 + 3 * 100);
    });
    await act(() => fireEvent(plus as never, "pressOut"));
    await act(() => fireEvent.press(plus as never));

    expect(onChange.mock.calls.map(([v]) => v)).toEqual([35, 40, 45]);
  });

  test("a parent that never re-renders still loses no step", async () => {
    const onChange = jest.fn();
    const { plus } = await mount({ value: 30, live: false, onChange });

    await act(() => fireEvent(plus as never, "pressIn"));
    await act(() => {
      jest.advanceTimersByTime(400 + 3 * 100);
    });
    await act(() => fireEvent(plus as never, "pressOut"));

    expect(onChange.mock.calls.map(([v]) => v)).toEqual([35, 40, 45]);
  });

  test("held a second, the step grows and lands on round numbers", async () => {
    const onChange = jest.fn();
    const { plus } = await mount({ value: 33, max: 3600, onChange });

    await act(() => fireEvent(plus as never, "pressIn"));
    await act(() => {
      jest.advanceTimersByTime(400 + 12 * 100);
    });
    await act(() => fireEvent(plus as never, "pressOut"));

    const values = onChange.mock.calls.map(([v]) => v);
    expect(values.slice(0, 9)).toEqual([38, 43, 48, 53, 58, 63, 68, 73, 78]);
    // The tenth tick is the first fast one: 78 goes to the next multiple of 50, not to 128.
    expect(values.slice(9)).toEqual([100, 150, 200]);
  });

  test("the repeat stops at the ceiling instead of running on", async () => {
    const onChange = jest.fn();
    const { plus } = await mount({ value: 285, max: 300, onChange });

    await act(() => fireEvent(plus as never, "pressIn"));
    await act(() => {
      jest.advanceTimersByTime(400 + 10 * 100);
    });
    await act(() => fireEvent(plus as never, "pressOut"));

    expect(onChange.mock.calls.map(([v]) => v)).toEqual([290, 295, 300]);
  });
});
