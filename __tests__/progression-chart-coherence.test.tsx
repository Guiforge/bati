import assert from "node:assert/strict";
import { render } from "@testing-library/react-native";
import i18n from "i18next";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";

import { ProgressionChart } from "@/components/session/ProgressionChart";
import { rawColors } from "@/constants/rawColors";
import "@/i18n";
import config from "@/tamagui.config";

jest.mock("@/db", () => ({
  getQuestSessionHistory: jest.fn().mockResolvedValue([
    { durationSeconds: 600, performedAt: 1_700_000_000_000, userLevel: "medium" },
    { durationSeconds: 1200, performedAt: 1_700_100_000_000, userLevel: "hard" },
  ]),
  getRecentSessionHistory: jest.fn().mockResolvedValue([
    { durationSeconds: 600, performedAt: 1_700_000_000_000, userLevel: "medium" },
    { durationSeconds: 1200, performedAt: 1_700_100_000_000, userLevel: "hard" },
  ]),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
const mockBarChart = jest.fn((_props: Record<string, unknown>) => null);
jest.mock("react-native-gifted-charts", () => ({
  BarChart: (props: Record<string, unknown>) => mockBarChart(props),
}));

// The way VictoryView calls it: the title is its own key, not the chart's default.
async function mount() {
  const view = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <ProgressionChart questId={5} limit={10} title={i18n.t("chart.your_progress")} />
    </TamaguiProvider>,
  );
  return view;
}

describe("ProgressionChart layout", () => {
  it("keeps the axis inside the card and centres a label under its bar", async () => {
    const view = await mount();
    await view.findByText("30");
    const props = mockBarChart.mock.lastCall?.[0] as Record<string, number> | undefined;
    assert(props);
    // `width` is the plot alone: y labels plus plot must fit the 320 dp card interior.
    expect(props["yAxisLabelWidth"]).toBe(35);
    expect(props["width"]).toBe(320 - 35);
    const slot = (props["barWidth"] ?? 0) + (props["spacing"] ?? 0);
    expect((props["initialSpacing"] ?? 0) + slot * 2).toBeLessThanOrEqual(props["width"] ?? 0);
    // A label box is centred on its bar only when labelWidth equals barWidth.
    expect(props["labelWidth"]).toBe(props["barWidth"]);
  });
});

describe("ProgressionChart legend", () => {
  it("names the three difficulties", async () => {
    const view = await mount();
    await view.findByText("30");
    for (const level of ["easy", "medium", "hard"] as const) {
      expect(view.getByTestId(`chart-legend-${level}`)).toHaveTextContent(
        i18n.t(`quests.level_${level}`),
      );
    }
  });
});

describe("ProgressionChart", () => {
  it("prints the total minutes in the text colour, not a green that means nothing", async () => {
    const view = await mount();
    const total = await view.findByText("30");
    expect(StyleSheet.flatten(total.props.style).color).toBe(rawColors.text);
  });

  it("titles itself in the heading face, in sentence case", async () => {
    const view = await mount();
    const title = await view.findByText("Your progress on this quest");
    expect(StyleSheet.flatten(title.props.style).fontFamily).toBe(
      config.fonts.heading.face[700].normal,
    );
  });
});
