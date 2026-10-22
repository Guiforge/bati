import { Stack } from "expo-router";
import { Theme } from "tamagui";
import { rawColors } from "@/constants/rawColors";

// Anchor the stack: a detail opened from outside the list (cold bati://journal/<id>, a sync
// returnTo) would otherwise be the only route and back would fall through to Home (firstRoute).
// biome-ignore lint/style/useComponentExportOnlyModules: expo-router reads this export from route files
export const unstable_settings = { initialRouteName: "index" };

/**
 * The Journal's theme (`dark_journal`, tamagui.config.ts): Bati's ground and gold, with the gold
 * as the one accent every shared component on this tab resolves `primary` to.
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
