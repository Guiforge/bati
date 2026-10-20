import { fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { RuleDisclosure } from "@/components/common/RuleDisclosure";
import "@/i18n";
import config from "@/tamagui.config";

const wrap = async (ui: React.ReactElement) =>
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      {ui}
    </TamaguiProvider>,
  );

test("the rule is folded, and a tap unfolds it in place, a second one folds it", async () => {
  await wrap(<RuleDisclosure testID="rule" text="The rule." />);
  const link = screen.getByTestId("rule-link");
  expect(screen.getByText("What it earns")).toBeTruthy();
  expect(link.props.accessibilityRole).toBe("button");
  expect(link.props.accessibilityState).toEqual({ expanded: false });
  expect(screen.queryByTestId("rule")).toBeNull();

  await fireEvent.press(link);
  expect(screen.getByTestId("rule").props.children).toBe("The rule.");
  expect(screen.getByTestId("rule-link").props.accessibilityState).toEqual({ expanded: true });

  await fireEvent.press(screen.getByTestId("rule-link"));
  expect(screen.queryByTestId("rule")).toBeNull();
});

test("the target is 44 dp tall", async () => {
  await wrap(<RuleDisclosure testID="rule" text="The rule." />);
  expect(JSON.stringify(screen.getByTestId("rule-link").props.style)).toContain('"minHeight":44');
});

test("a caller may hold the state", async () => {
  const toggle = jest.fn();
  await wrap(<RuleDisclosure testID="rule" text="The rule." open onToggle={toggle} />);
  expect(screen.getByTestId("rule")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("rule-link"));
  expect(toggle).toHaveBeenCalledTimes(1);
});
