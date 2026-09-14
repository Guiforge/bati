import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { TamaguiProvider } from "tamagui";

import { CountInput } from "@/components/session/CountInput";
import config from "@/tamagui.config";

/**
 * The count a hero types when they went well past the target, and the ± stepper would take forty
 * taps to get there. The parent owns the number; the field only ever hands it a value the store
 * would accept, so what the ghost line and the Done button read is never an empty string or a 0.
 */

async function mount(initial: number, onChange: jest.Mock, max = 999) {
  function Harness() {
    const [value, setValue] = useState(initial);
    return (
      <CountInput
        testID="count"
        value={value}
        max={max}
        fontSize={80}
        accessibilityLabel="reps"
        onChange={(next) => {
          onChange(next);
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
  return screen.getByTestId("count");
}

describe("CountInput", () => {
  test("a typed count reaches the parent as a number, as it is typed", async () => {
    const onChange = jest.fn();
    const field = await mount(12, onChange);

    await act(() => fireEvent(field, "focus"));
    await act(() => fireEvent.changeText(field, "150"));

    expect(onChange).toHaveBeenLastCalledWith(150);
    expect(field.props.value).toBe("150");
  });

  test("an emptied field or a zero never reaches the parent, and blur puts the count back", async () => {
    const onChange = jest.fn();
    const field = await mount(12, onChange);

    await act(() => fireEvent(field, "focus"));
    await act(() => fireEvent.changeText(field, ""));
    await act(() => fireEvent.changeText(field, "0"));
    expect(onChange).not.toHaveBeenCalled();

    await act(() => fireEvent(field, "blur"));
    expect(field.props.value).toBe("12");
  });

  test("a count past the ceiling lands on the ceiling", async () => {
    const onChange = jest.fn();
    const field = await mount(30, onChange, 3600);

    await act(() => fireEvent(field, "focus"));
    await act(() => fireEvent.changeText(field, "9000"));

    expect(onChange).toHaveBeenLastCalledWith(3600);
    expect(field.props.value).toBe("3600");
  });
});
