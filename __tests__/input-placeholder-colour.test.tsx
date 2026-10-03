import { render, screen } from "@testing-library/react-native";
import { Input, TamaguiProvider } from "tamagui";
import { rawColors } from "@/constants/rawColors";
import config from "@/tamagui.config";

/**
 * An empty field must not read as a filled one: the quest editor's "Morning forge" rendered in the
 * platform's default grey, a hair off the typed text, and a hero thought the name was set. The
 * colour comes from the shared config, so no field has to remember it.
 */
test("an Input with no placeholderTextColor of its own gets the muted one from the config", async () => {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <Input
        testID="field"
        placeholder="Morning forge"
        bg="$background"
        borderColor="$borderStrong"
        color="$text"
      />
    </TamaguiProvider>,
  );
  expect(screen.getByTestId("field").props.placeholderTextColor).toBe(rawColors.textSecondary);
});
