import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";

import { Recitatif } from "@/components/common/Recitatif";
import { rawColors } from "@/constants/rawColors";
import config from "@/tamagui.config";

it("draws an ink cartouche in the title font", async () => {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <Recitatif testID="r">Couper du bois</Recitatif>
    </TamaguiProvider>,
  );
  const box = StyleSheet.flatten(screen.getByTestId("r").props.style);
  expect(box.backgroundColor).toBe(rawColors.bgDark);
  expect(box.borderTopColor).toBe(rawColors.borderStrong);
  expect(screen.getByText("Couper du bois")).toHaveStyle({ color: rawColors.text });
});
