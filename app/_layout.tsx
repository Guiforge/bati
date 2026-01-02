import { Slot, useRouter, useSegments } from "expo-router";
import Head from "expo-router/head";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { LogBox, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PortalProvider, TamaguiProvider, Theme } from "tamagui";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ToastProvider } from "@/components/common/Toast";
import { DatabaseProvider } from "@/components/DatabaseProvider";
import { NotificationManager } from "@/components/NotificationManager";
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
  const {
    theme,
    isLoaded: settingsLoaded,
    loadFromDatabase: loadSettingsFromDatabase,
  } = useSettingsStore();

  // Resolve theme: use user preference or system default
  const systemScheme = useColorScheme() ?? "light";
  const colorScheme = theme === "system" ? systemScheme : theme;
  const segments = useSegments();
  const router = useRouter();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Called when database migrations are complete
  const handleDatabaseReady = useCallback(() => {
    loadUserFromDatabase();
    loadSettingsFromDatabase();
  }, [loadUserFromDatabase, loadSettingsFromDatabase]);

  useEffect(() => {
    // Wait for first render to complete
    setIsNavigationReady(true);
  }, []);

  useEffect(() => {
    if (!isNavigationReady || !userLoaded || !settingsLoaded) return;

    const inOnboardingGroup = segments[0] === "onboarding";

    if (!hasFinishedOnboarding && !inOnboardingGroup) {
      router.replace("/onboarding");
    } else if (hasFinishedOnboarding && inOnboardingGroup) {
      router.replace("/");
    }

    SplashScreen.hideAsync();
  }, [hasFinishedOnboarding, segments, router, isNavigationReady, userLoaded, settingsLoaded]);

  return (
    <>
      <Head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.css"
        />
      </Head>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <TamaguiProvider config={config} defaultTheme={colorScheme}>
            <Theme name={colorScheme}>
              <PortalProvider>
                <DatabaseProvider onReady={handleDatabaseReady}>
                  <NotificationManager />
                  <ToastProvider>
                    <ErrorBoundary>
                      <Slot />
                    </ErrorBoundary>
                  </ToastProvider>
                </DatabaseProvider>
              </PortalProvider>
            </Theme>
          </TamaguiProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </>
  );
}
