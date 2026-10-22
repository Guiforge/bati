import { render, screen } from "@testing-library/react-native";
import * as tamagui from "tamagui";

import { Paragraph } from "@/components/common/Paragraph";
import config from "@/tamagui.config";

// A variable: the raw-text rule trusts `Paragraph` by name, not `tamagui.Paragraph`.
const STOCK = "stock";

const mount = (node: React.ReactNode) =>
  render(
    <tamagui.TamaguiProvider config={config} defaultTheme="dark">
      {node}
    </tamagui.TamaguiProvider>,
  );

/**
 * Tamagui 3 turns the stock Paragraph's `userSelect: "auto"` into RN's `selectable`: a long press
 * on any paragraph opened a selection, which v2 never did. The app's Paragraph switches it off.
 */
test("the app's Paragraph is not selectable, and select=text still opts one in", async () => {
  await mount(
    <>
      <tamagui.Paragraph>{STOCK}</tamagui.Paragraph>
      <Paragraph>plain</Paragraph>
      <Paragraph select="text">chosen</Paragraph>
    </>,
  );
  // The stock one proves the trap still exists: when it stops, this wrapper can go.
  expect(screen.getByText("stock").props.selectable).toBe(true);
  expect(screen.getByText("plain").props.selectable).toBe(false);
  expect(screen.getByText("chosen").props.selectable).toBe(true);
});
