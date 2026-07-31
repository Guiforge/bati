import { DefaultTheme, Slot, ThemeProvider, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider, Theme } from "tamagui";

import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ToastProvider } from "@/components/common/Toast";
import { DatabaseProvider } from "@/components/DatabaseProvider";
import { installCrashHandler, recordCrash } from "@/src/crashLog";
import { rescheduleOathReminder } from "@/src/notifications";
import { AppBackground } from "@/src/ui/AppBackground";
import { requestFlameWidgetUpdate } from "@/src/widget";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";
import "../i18n";
import config from "../tamagui.config";

LogBox.ignoreLogs(["Expo AV has been deprecated"]);

// Module scope, so it is armed before the first component renders — a crash during startup is
// the one most worth having a trace of. Writes to the local database only; see src/crashLog.ts.
installCrashHandler();

SplashScreen.preventAutoHideAsync();

// Custom Navigation Theme to force Cream background. Module scope: built from static tokens,
// and a fresh object per render would invalidate the ThemeProvider context for the whole
// navigator tree on every navigation.
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

export default function RootLayout() {
  // Selector subscriptions: the root layout re-renders the entire tree, so it must not
  // subscribe to whole stores (any settings write would re-render every screen).
  const hasFinishedOnboarding = useUserStore((s) => s.hasFinishedOnboarding);
  const userLoaded = useUserStore((s) => s.isLoaded);
  const loadUserFromDatabase = useUserStore((s) => s.loadFromDatabase);
  const settingsLoaded = useSettingsStore((s) => s.isLoaded);
  const loadSettingsFromDatabase = useSettingsStore((s) => s.loadFromDatabase);

  // Typed as `string[]` rather than expo-router's tuple, which is built from the route types
  // generated into .expo/types by a dev server run. CI has never run one, so there the tuple is
  // `[string]` and reading `segments[1]` below is a compile error — green locally, red in CI,
  // for eight runs. The values are plain strings either way.
  const segments = useSegments() as string[];
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
    // The streak window can roll over while the app is closed (e.g. midnight passing),
    // so a cold start is the other moment the flame widget needs a redraw.
    requestFlameWidgetUpdate().catch(() => {
      // Non-blocking: never hold up the app over a widget redraw.
    });
  }, [loadUserFromDatabase, loadSettingsFromDatabase]);

  useEffect(() => {
    // Wait for first render to complete
    setIsNavigationReady(true);
  }, []);

  useEffect(() => {
    if (!(isNavigationReady && userLoaded && settingsLoaded)) return;

    const inOnboardingGroup = segments[0] === "onboarding";
    // Onboarding is marked finished one step before this offer screen on purpose (see
    // app/onboarding/first-session.tsx docstring), so it must stay reachable even though
    // hasFinishedOnboarding is already true — only stale re-entries into the rest of the
    // onboarding group should be kicked back to "/".
    const isPostOnboardingOffer = segments[1] === "first-session";

    if (!hasFinishedOnboarding && !inOnboardingGroup) {
      router.replace("/onboarding");
    } else if (hasFinishedOnboarding && inOnboardingGroup && !isPostOnboardingOffer) {
      router.replace("/");
    }

    SplashScreen.hideAsync();
  }, [hasFinishedOnboarding, isNavigationReady, router, segments, settingsLoaded, userLoaded]);

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
              {/* No PortalProvider here: TamaguiProvider already mounts one, and nesting a
                  second root host is what the "hydration mismatches" warning was about. */}
              <DatabaseProvider onReady={handleDatabaseReady}>
                <ToastProvider>
                  <ErrorBoundary onError={(error) => recordCrash("render", error)}>
                    <AppBackground />
                    <Slot />
                  </ErrorBoundary>
                </ToastProvider>
              </DatabaseProvider>
            </ThemeProvider>
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
