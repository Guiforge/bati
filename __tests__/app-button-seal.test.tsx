import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ComponentProps, ReactElement } from "react";
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
    expect(StyleSheet.flatten(screen.getByText("Voir la quête").props.style).fontFamily).toBe(
      config.fonts.heading.face[700].normal,
    );
  });

  it("gives a light signal fill, set as backgroundColor, no edge and an ink label", async () => {
    await render(
      themed(
        <AppButton testID="ok" backgroundColor="$success">
          Easy
        </AppButton>,
      ),
    );
    const flat = StyleSheet.flatten(screen.getByTestId("ok").props.style);
    expect(flat.borderBottomWidth).not.toBe(3);
    expect(screen.getByText("Easy")).toHaveStyle({ color: rawColors.bgDark });
  });

  it("keeps the seal when a caller passes an undefined backgroundColor (enabled onboarding CTAs)", async () => {
    await render(
      themed(
        <AppButton testID="cta" backgroundColor={undefined}>
          Continue
        </AppButton>,
      ),
    );
    const flat = StyleSheet.flatten(screen.getByTestId("cta").props.style);
    expect(flat.borderBottomWidth).toBe(3);
  });

  it("translates on press and never changes the border width", async () => {
    await render(themed(<AppButton testID="press">Go</AppButton>));
    await act(() => {
      fireEvent(screen.getByTestId("press"), "responderGrant", {
        nativeEvent: {},
        persist: () => {},
      });
    });
    const flat = StyleSheet.flatten(screen.getByTestId("press").props.style);
    expect(flat.borderBottomWidth).toBe(3);
    expect(JSON.stringify(flat.transform)).toContain('"translateY":2');
  });

  it("survives backgroundColor and variant toggling on a mounted instance", async () => {
    const edge = () => StyleSheet.flatten(screen.getByTestId("t").props.style).borderBottomWidth;
    const ui = (props: Partial<ComponentProps<typeof AppButton>>) =>
      themed(
        <AppButton testID="t" {...props}>
          Go
        </AppButton>,
      );
    const view = await render(ui({}));
    expect(edge()).toBe(3);
    await view.rerender(ui({ backgroundColor: "$success" }));
    expect(edge()).not.toBe(3);
    await view.rerender(ui({}));
    expect(edge()).toBe(3);
    await view.rerender(ui({ variant: "outline" }));
    expect(edge()).not.toBe(3);
    await view.rerender(ui({ variant: "primary" }));
    expect(edge()).toBe(3);
  });

  it("refuses a caller's pressStyle and rounded", () => {
    // @ts-expect-error the seal owns its press and its radius
    const a = <AppButton pressStyle={{}}>x</AppButton>;
    // @ts-expect-error the seal owns its radius
    const b = <AppButton rounded="$6">x</AppButton>;
    expect([a, b]).toHaveLength(2);
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
    expect(flat.borderBottomWidth).not.toBe(3);
    expect(flat.borderBottomColor).not.toBe(rawColors.primaryEdge);
    expect(screen.getByText("Delete")).toHaveStyle({ color: rawColors.bgDark });
  });
});
