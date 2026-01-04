import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Slot, useRouter, useSegments } from "expo-router";
import Head from "expo-router/head";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PortalProvider, TamaguiProvider, Theme } from "tamagui";

import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ToastProvider } from "@/components/common/Toast";
import { DatabaseProvider } from "@/components/DatabaseProvider";
import { SplashScreen as CustomSplashScreen } from "@/components/SplashScreen";
import { AppBackground } from "@/src/ui";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";
import "../i18n";
import config from "../tamagui.config";

LogBox.ignoreLogs(["Expo AV has been deprecated"]);

if (__DEV__) {
  console.log("[RootLayout] Module loading...");
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  if (__DEV__) {
    console.log("[RootLayout] Rendering...");
  }
  const {
    hasFinishedOnboarding,
    isLoaded: userLoaded,
    loadFromDatabase: loadUserFromDatabase,
  } = useUserStore();
  const { isLoaded: settingsLoaded, loadFromDatabase: loadSettingsFromDatabase } =
    useSettingsStore();

  // NEW_STYLE: force dark-only theme across the whole app.
  // We keep loading settings for other preferences, but the UI theme is always dark.
  const colorScheme = "dark";

  const segments = useSegments();
  const router = useRouter();
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Called when database migrations are complete
  const handleDatabaseReady = useCallback(() => {
    if (__DEV__) {
      console.log("[RootLayout] handleDatabaseReady called");
    }
    loadUserFromDatabase();
    loadSettingsFromDatabase();
  }, [loadUserFromDatabase, loadSettingsFromDatabase]);

  useEffect(() => {
    if (__DEV__) {
      console.log("[RootLayout] First useEffect - setting navigation ready");
    }
    // Wait for first render to complete
    setIsNavigationReady(true);
  }, []);

  useEffect(() => {
    if (isNavigationReady && userLoaded && settingsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isNavigationReady, userLoaded, settingsLoaded]);

  const onSplashFinish = useCallback(() => {
    setShowSplash(false);

    const inOnboardingGroup = segments[0] === "onboarding";
    if (!hasFinishedOnboarding && !inOnboardingGroup) {
      router.replace("/onboarding");
    } else if (hasFinishedOnboarding && inOnboardingGroup) {
      router.replace("/");
    }
  }, [hasFinishedOnboarding, segments, router]);

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
        <SafeAreaProvider>
          <TamaguiProvider config={config} defaultTheme={colorScheme}>
            <Theme name={colorScheme}>
              <ThemeProvider value={MyTheme}>
                <PortalProvider>
                  <DatabaseProvider onReady={handleDatabaseReady}>
                    <ToastProvider>
                      <ErrorBoundary>
                        <AppBackground />
                        {showSplash ? (
                          <CustomSplashScreen
                            onFinish={onSplashFinish}
                            isReady={userLoaded && settingsLoaded}
                          />
                        ) : (
                          <Slot />
                        )}
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
