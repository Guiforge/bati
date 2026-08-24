import { Stack } from "expo-router";

// Anchor the stack: opened from another tab, /quests/[id] would otherwise be the
// only route and the hardware back would fall through to the Home tab (firstRoute).
// biome-ignore lint/style/useComponentExportOnlyModules: expo-router reads this export from route files
export const unstable_settings = { initialRouteName: "index" };

export default function QuestsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
