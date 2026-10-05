import { render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { rawColors } from "@/constants/rawColors";
import config from "@/tamagui.config";

const themed = (ui: ReactElement) => (
  <TamaguiProvider config={config} defaultTheme="dark">
    {ui}
  </TamaguiProvider>
);

describe("AppButton, the seal", () => {
  it("writes its label in onPrimary on the braise", async () => {
    await render(themed(<AppButton testID="seal">Voir la quête</AppButton>));
    const flat = StyleSheet.flatten(screen.getByTestId("seal").props.style);
    expect(flat.borderBottomWidth).toBe(3);
    expect(flat.borderBottomColor).toBe(rawColors.primaryEdge);
    expect(screen.getByText("Voir la quête")).toHaveStyle({ color: rawColors.onPrimary });
  });

  it("keeps the outline variant flat and bone", async () => {
    await render(
      themed(
        <AppButton testID="out" variant="outline">
          Keep it
        </AppButton>,
      ),
    );
    const flat = StyleSheet.flatten(screen.getByTestId("out").props.style);
    expect(flat.borderBottomWidth ?? 1).toBe(1);
    expect(screen.getByText("Keep it")).toHaveStyle({ color: rawColors.text });
  });

  it("writes a destructive label in bgDark on the light red, with no braise edge", async () => {
    await render(
      themed(
        <AppButton testID="del" backgroundColor="$error">
          Delete
        </AppButton>,
      ),
    );
    const flat = StyleSheet.flatten(screen.getByTestId("del").props.style);
    expect(flat.borderBottomColor).not.toBe(rawColors.primaryEdge);
    expect(screen.getByText("Delete")).toHaveStyle({ color: rawColors.bgDark });
  });
});
