import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";

import { ProgressionChart } from "@/components/session/ProgressionChart";
import { rawColors } from "@/constants/rawColors";
import "@/i18n";
import config from "@/tamagui.config";

jest.mock("@/db", () => ({
  getQuestSessionHistory: jest.fn(),
  getRecentSessionHistory: jest.fn().mockResolvedValue([
    { durationSeconds: 600, performedAt: 1_700_000_000_000, userLevel: "medium" },
    { durationSeconds: 1200, performedAt: 1_700_100_000_000, userLevel: "hard" },
  ]),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("react-native-gifted-charts", () => ({ BarChart: () => null }));

async function mount() {
  const view = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <ProgressionChart />
    </TamaguiProvider>,
  );
  return view;
}

describe("ProgressionChart", () => {
  it("prints the total minutes in the text colour, not a green that means nothing", async () => {
    const view = await mount();
    const total = await view.findByText("30");
    expect(StyleSheet.flatten(total.props.style).color).toBe(rawColors.text);
  });

  it("titles itself in the heading face, in sentence case", async () => {
    const view = await mount();
    const title = await view.findByText("Your progress");
    expect(StyleSheet.flatten(title.props.style).fontFamily).toBe(
      config.fonts.heading.face[700].normal,
    );
  });
});
