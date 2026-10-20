import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { Chip } from "@/components/common/Chip";
import config from "@/tamagui.config";

function mount(chip: React.ReactElement) {
  return render(
    <TamaguiProvider config={config} defaultTheme="dark">
      {chip}
    </TamaguiProvider>,
  );
}

describe("Chip", () => {
  it("a selected chip is a selected button, filled, and wears a check besides", async () => {
    await mount(<Chip label="Walk" selected onPress={jest.fn()} />);
    const chip = screen.getByRole("button", { selected: true });
    expect(chip).toBeTruthy();
    // The check is an icon in front of the label: the pick is not carried by the fill alone.
    expect(JSON.stringify(screen.toJSON())).toMatch(/"d":"M20 6 9 17l-5-5"|lucide|Check/i);
  });

  it("a chip that is not picked says it is not selected, and has no check", async () => {
    await mount(<Chip label="Run" selected={false} onPress={jest.fn()} />);
    expect(screen.getByRole("button", { selected: false })).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/M20 6 9 17l-5-5/);
  });

  it("a pressable chip is a button even when it is not a choice", async () => {
    await mount(<Chip label="Go" onPress={jest.fn()} />);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("a chip with no press handler is plain metadata", async () => {
    await mount(<Chip label="3 min" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
