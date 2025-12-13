import { useAppColorScheme } from "@/stores/theme";
import { Stack } from "expo-router";
import { TamaguiProvider, Theme } from "tamagui";
import "../i18n";
import config from "../tamagui.config";

export default function RootLayout() {
  const colorScheme = useAppColorScheme();

  return (
    <TamaguiProvider config={config} defaultTheme={colorScheme}>
      <Theme name={colorScheme}>
        <Stack screenOptions={{ headerShown: false }} />
      </Theme>
    </TamaguiProvider>
  );
}
