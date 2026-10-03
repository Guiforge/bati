import { render } from "@testing-library/react-native";

import { TabLabel } from "@/components/common/TabLabel";

// Audit 2026-10-03, font scale 1.3: the "Adventures" tab read "Advent...". The label must be
// allowed to shrink to its slot rather than truncate.
test("a tab label shrinks to fit instead of truncating", async () => {
  const view = await render(<TabLabel color="white" label="Adventures" />);
  const label = view.getByTestId("tab-label");
  expect(label.props.adjustsFontSizeToFit).toBe(true);
  expect(label.props.minimumFontScale).toBeLessThan(1);
  expect(label.props.numberOfLines).toBe(1);
});
