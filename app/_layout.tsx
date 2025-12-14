import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { TamaguiProvider, Theme } from "tamagui";
import { DatabaseProvider } from "@/components/DatabaseProvider";
import { useAppColorScheme } from "@/stores/theme";
import { useUserStore } from "@/stores/user";
import "../i18n";
import config from "../tamagui.config";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useAppColorScheme();
  const { hasFinishedOnboarding, isLoaded, loadFromDatabase } = useUserStore();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Called when database migrations are complete
  const handleDatabaseReady = useCallback(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  useEffect(() => {
    // Wait for first render to complete
    setIsNavigationReady(true);
  }, []);

  useEffect(() => {
    if (!isNavigationReady || !isLoaded) return;

    const inOnboardingGroup = segments[0] === "onboarding";

    if (!hasFinishedOnboarding && !inOnboardingGroup) {
      router.replace("/onboarding");
    } else if (hasFinishedOnboarding && inOnboardingGroup) {
      router.replace("/");
    }

    SplashScreen.hideAsync();
  }, [hasFinishedOnboarding, segments, router, isNavigationReady, isLoaded]);

  return (
    <TamaguiProvider config={config} defaultTheme={colorScheme}>
      <Theme name={colorScheme}>
        <DatabaseProvider onReady={handleDatabaseReady}>
          <Slot />
        </DatabaseProvider>
      </Theme>
    </TamaguiProvider>
  );
}
