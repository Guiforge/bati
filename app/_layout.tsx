import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import Head from "expo-router/head";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PortalProvider, TamaguiProvider, Theme } from "tamagui";

import { ErrorBoundary } from "@/src/components/common/ErrorBoundary";
import { ToastProvider } from "@/src/components/common/Toast";
import { DatabaseProvider } from "@/src/components/DatabaseProvider";
import "@/src/i18n";
import { useSettingsStore } from "@/src/stores/settings";
import { useUserStore } from "@/src/stores/user";
import { AppBackground } from "@/src/ui";
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
    <>
      <Head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.css"
        />
      </Head>
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
                        <Stack screenOptions={{ headerShown: false }}>
                          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                          <Stack.Screen
                            name="(modals)"
                            options={{
                              headerShown: false,
                              presentation: "modal",
                              animation: "slide_from_bottom",
                            }}
                          />
                          <Stack.Screen
                            name="session"
                            options={{
                              headerShown: false,
                              animation: "none",
                            }}
                          />
                        </Stack>
                      </ErrorBoundary>
                    </ToastProvider>
                  </DatabaseProvider>
                </PortalProvider>
              </ThemeProvider>
            </Theme>
          </TamaguiProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </>
  );
}
