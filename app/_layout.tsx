// Per-weight subpaths, never the package root: the barrel index requires every weight it ships,
// so `from "@expo-google-fonts/noto-sans"` put all 18 Noto files in the APK for the 2 used here
// (24 .ttf, 5.9 MB compressed, measured on the v1.13.0 APK).
import { NotoSans_400Regular } from "@expo-google-fonts/noto-sans/400Regular";
import { NotoSans_700Bold } from "@expo-google-fonts/noto-sans/700Bold";
import { SpaceGrotesk_300Light } from "@expo-google-fonts/space-grotesk/300Light";
import { SpaceGrotesk_400Regular } from "@expo-google-fonts/space-grotesk/400Regular";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk/700Bold";
import { useFonts } from "expo-font";
import { DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider, Theme } from "tamagui";

import { VillagerCameo } from "@/components/chorus/VillagerCameo";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ToastProvider } from "@/components/common/Toast";
import { DatabaseProvider } from "@/components/DatabaseProvider";
import { installCrashHandler, recordCrash } from "@/src/crashLog";
import { reportError } from "@/src/reportError";
import { AppBackground } from "@/src/ui/AppBackground";
import { requestWidgetsUpdate } from "@/src/widget";
import { useChorusStore } from "@/stores/chorus";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";
import "../i18n";
import config from "../tamagui.config";

LogBox.ignoreLogs(["Expo AV has been deprecated"]);

// Module scope, so it is armed before the first component renders — a crash during startup is
// the one most worth having a trace of. Writes to the local database only; see src/crashLog.ts.
installCrashHandler();

SplashScreen.preventAutoHideAsync().catch((e) => reportError("splash.preventAutoHide", e));

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
  const hydrateChorus = useChorusStore((s) => s.hydrate);

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

  // The families tamagui.config.ts has always declared, loaded for the first time. The keys
  // match its `face` maps exactly; the bare family names cover unspecified weights. On a load
  // error the app ships system fonts rather than hanging on the splash.
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk: SpaceGrotesk_400Regular,
    SpaceGrotesk_300Light,
    SpaceGrotesk_700Bold,
    NotoSans: NotoSans_400Regular,
    NotoSans_400Regular,
    NotoSans_700Bold,
  });
  const fontsReady = fontsLoaded || fontError != null;

  // Called when database migrations are complete
  const handleDatabaseReady = useCallback(() => {
    loadUserFromDatabase();
    loadSettingsFromDatabase();
    // The streak window can roll over while the app is closed (e.g. midnight passing),
    // so a cold start is another moment the widgets need a redraw.
    // Non-blocking: never hold up the app over a widget redraw.
    requestWidgetsUpdate().catch((e) => reportError("widget.update", e));
    // The "lines said recently" ring, so the first rest of a fresh session is not where the
    // repetition shows. Nothing waits on it: an unhydrated ring costs one possible repeat.
    hydrateChorus().catch((e) => reportError("chorus.hydrate", e));
  }, [loadUserFromDatabase, loadSettingsFromDatabase, hydrateChorus]);

  useEffect(() => {
    // Wait for first render to complete
    setIsNavigationReady(true);
  }, []);

  useEffect(() => {
    if (!(isNavigationReady && userLoaded && settingsLoaded && fontsReady)) return;

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

    // A rejection here leaves the splash up forever, which reads as a frozen app. It must be
    // reported, not swallowed.
    SplashScreen.hideAsync().catch((e) => reportError("splash.hide", e));
  }, [
    hasFinishedOnboarding,
    isNavigationReady,
    router,
    segments,
    settingsLoaded,
    userLoaded,
    fontsReady,
  ]);

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
                    {/*
                      A Stack, not a Slot.
                      `Slot` renders the matched route with no navigator, so the root had no
                      history: every screen that lives outside `(tabs)` - the recap, settings,
                      the oath, an exercise, the credits - was pushed onto nothing, and its back
                      button had nothing to pop and landed on Home. Back *inside* a tab always
                      worked, because `(tabs)/quests`, `journal` and `adventures` each mount
                      their own Stack, which is exactly why this looked like a bug in one screen
                      rather than in the root.

                      `headerShown: false` because every screen here draws its own header, with
                      its own chevron; a native header would sit on top of them.
                    */}
                    <Stack screenOptions={{ headerShown: false }} />
                    {/* Above every route, mounted once. See components/chorus/VillagerCameo.tsx. */}
                    <VillagerCameo />
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
