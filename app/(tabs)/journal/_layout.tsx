import { Stack } from "expo-router";
import { Theme } from "tamagui";
import { rawColors } from "@/constants/rawColors";

/**
 * The Journal's theme (`dark_journal`, tamagui.config.ts): Bati's ground and gold, with the gold
 * as the one accent every shared component on this tab resolves `$primary` to.
 *
 * The theme wraps the stack rather than each screen, so every page pushed here (Lifetime, the
 * quest log, a boss report) inherits it without remembering to ask. The navigator's own ground
 * is set too: a push animates over `contentStyle`, and the app's translucent overlay would flash
 * between two pages. The tab bar is outside this tree and stays the app's.
 */
export default function JournalLayout() {
  return (
    <Theme name="journal">
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: rawColors.bgDark } }}
      />
    </Theme>
  );
}
