import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { LevelPips } from "@/components/village/LevelPips";
import config from "@/tamagui.config";

const draw = async (level: number, max?: number) => {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <LevelPips level={level} {...(max === undefined ? {} : { max })} />
    </TamaguiProvider>,
  );
  return {
    full: screen.queryAllByTestId("level-pip-full").length,
    empty: screen.queryAllByTestId("level-pip-empty").length,
  };
};

describe("LevelPips", () => {
  it("draws the ceiling in dots up to five: an upgrade at 3 of 3", async () => {
    expect(await draw(2, 3)).toEqual({ full: 2, empty: 1 });
  });

  it("a ceiling of 5 is five dots and no number at rank 5", async () => {
    expect(await draw(5, 5)).toEqual({ full: 5, empty: 0 });
    expect(screen.queryByText("5")).toBeNull();
  });

  it("a building that goes to 10 still draws five dots, and no number up to rank 5", async () => {
    expect(await draw(4, 10)).toEqual({ full: 4, empty: 1 });
    expect(screen.queryByText("4")).toBeNull();
  });

  it("past rank 5: five full dots, then the rank as a number", async () => {
    expect(await draw(7, 10)).toEqual({ full: 5, empty: 0 });
    expect(screen.getByText("7")).toBeTruthy();
  });

  it("rank 10 reads 10", async () => {
    await draw(10, 10);
    expect(screen.getByText("10")).toBeTruthy();
  });
});
