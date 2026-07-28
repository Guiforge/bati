import { DefaultTheme, Slot, ThemeProvider, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PortalProvider, TamaguiProvider, Theme } from "tamagui";

import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ToastProvider } from "@/components/common/Toast";
import { DatabaseProvider } from "@/components/DatabaseProvider";
import { rescheduleOathReminder } from "@/src/notifications";
import { AppBackground } from "@/src/ui";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";
import "../i18n";
import config from "../tamagui.config";

LogBox.ignoreLogs(["Expo AV has been deprecated"]);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const {
    hasFinishedOnboarding,
    isLoaded: userLoaded,
    loadFromDatabase: loadUserFromDatabase,
  } = useUserStore();
  const { isLoaded: settingsLoaded, loadFromDatabase: loadSettingsFromDatabase } =
    useSettingsStore();

  const segments = useSegments();
  const router = useRouter();

  // NEW_STYLE: force dark-only theme across the whole app.
  // We keep loading settings for other preferences, but the UI theme is always dark.
  const colorScheme = "dark";

  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Called when database migrations are complete
  const handleDatabaseReady = useCallback(() => {
    loadUserFromDatabase();
    loadSettingsFromDatabase();
    // The oath reminder is a single pending notification recomputed from current state, so a
    // cold start is one of the two moments it needs to be refreshed (the other is a session).
    rescheduleOathReminder().catch(() => {
      // Non-blocking: a reminder that fails to schedule must never hold up the app.
    });
  }, [loadUserFromDatabase, loadSettingsFromDatabase]);

  useEffect(() => {
    // Wait for first render to complete
    setIsNavigationReady(true);
  }, []);

  useEffect(() => {
    if (!(isNavigationReady && userLoaded && settingsLoaded)) return;

    const inOnboardingGroup = segments[0] === "onboarding";

    if (!hasFinishedOnboarding && !inOnboardingGroup) {
      router.replace("/onboarding");
    } else if (hasFinishedOnboarding && inOnboardingGroup) {
      router.replace("/");
    }

    SplashScreen.hideAsync();
  }, [hasFinishedOnboarding, isNavigationReady, router, segments, settingsLoaded, userLoaded]);

  // Custom Navigation Theme to force Cream background
  const MyTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: config.tokens.color.bgOverlay.val,
      card: config.tokens.color.surface.val,
      text: config.tokens.color.text.val,
      border: config.tokens.color.borderStrong.val,
    },
  };

  if (!isNavigationReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaProvider>
        <TamaguiProvider config={config} defaultTheme={colorScheme}>
          <Theme name={colorScheme}>
            <ThemeProvider value={MyTheme}>
              <PortalProvider>
                <DatabaseProvider onReady={handleDatabaseReady}>
                  <ToastProvider>
                    <ErrorBoundary>
                      <AppBackground />
                      <Slot />
                    </ErrorBoundary>
                  </ToastProvider>
                </DatabaseProvider>
              </PortalProvider>
            </ThemeProvider>
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
