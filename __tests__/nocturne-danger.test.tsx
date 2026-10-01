import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider, Theme } from "tamagui";
import { NButton } from "@/components/journal/nocturne";
import { rawColors } from "@/constants/rawColors";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

/**
 * "Remove from the journal" is the one action on a session page that cannot be undone, and the
 * hero asked for it in red. The Journal theme folds `$danger` and `$error` into its inks on
 * purpose, so a red written as a token there renders grey and nothing else would notice: this
 * renders the button inside that theme and reads the colour it actually paints.
 */
test("the danger button is red inside the Journal's theme, which greys every red token", async () => {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <Theme name="journal">
        <NButton variant="danger" onPress={() => undefined}>
          Remove from the journal
        </NButton>
        <NButton onPress={() => undefined}>Share</NButton>
      </Theme>
    </TamaguiProvider>,
  );

  const colourOf = (text: string) =>
    StyleSheet.flatten(screen.getByText(text).props.style as never) as { color?: string };
  expect(colourOf("Remove from the journal").color).toBe(rawColors.error);
  expect(colourOf("Share").color).not.toBe(rawColors.error);
});
