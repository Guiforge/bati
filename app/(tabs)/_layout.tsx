import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "tamagui";
import { TabLabel } from "@/components/common/TabLabel";
import { interceptTabPress } from "@/components/common/useTabLeaveGuard";
import { Castle, Home, Map as MapIcon, Scroll, Sparkles } from "@/components/icons";

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <Tabs
      screenListeners={({ navigation, route }) => ({
        // `popToTopOnBlur` only runs after a tab-bar transition, so a deep link (bati://village)
        // left a dirty editor mounted under the next visit. Unwind whatever moved the tab.
        blur: () => {
          if (route.name !== "quests" && route.name !== "adventures") return;
          const tabs = navigation.getState();
          // A root screen pushed over the tabs blurs this tab too; only a real tab change unwinds.
          if (tabs.routes[tabs.index]?.key === route.key) return;
          const key = tabs.routes.find(
            (r: { key: string; state?: { key?: string } }) => r.key === route.key,
          )?.state?.key;
          // Plain action: importing StackActions pulls @react-navigation/native, which Expo Router 56+ refuses.
          if (key) navigation.dispatch({ type: "POP_TO_TOP", target: key });
        },
        // An open editor with unsaved edits asks before another tab takes over (see the hook).
        tabPress: (e) => interceptTabPress(e, navigation),
      })}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primaryText?.val,
        tabBarInactiveTintColor: theme.color?.val,
        tabBarLabel: ({ color, children }) => <TabLabel color={color} label={children} />,
        tabBarStyle: {
          backgroundColor: theme.bgLight?.val,
          borderTopWidth: 1,
          borderTopColor: theme.borderStrong?.val,
          // The labels need their own margin above the inset: with 3-button navigation the system
          // bar below is scrimmed darker than the tab bar, and 4 dp read as text cut off at its edge.
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarButtonTestID: "tab-home",
          title: t("tabs.home"),
          tabBarIcon: ({ focused, size }) => (
            <Home
              color={focused ? "$primaryText" : "$text"}
              fill={focused ? theme.primaryText?.val : "none"}
              opacity={focused ? 1 : 0.55}
              size={size ?? 22}
              strokeWidth={2.5}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="adventures"
        options={{
          tabBarButtonTestID: "tab-adventures",
          title: t("tabs.adventures"),
          // Home's "Continue the adventure" opens a sheet on this stack from outside the tab; left
          // there, the tab reopened on that sheet and its back went to a gallery nobody visited.
          popToTopOnBlur: true,
          tabBarIcon: ({ focused, size }) => (
            <Sparkles
              color={focused ? "$primaryText" : "$text"}
              fill={focused ? theme.primaryText?.val : "none"}
              opacity={focused ? 1 : 0.55}
              size={size ?? 22}
              strokeWidth={2.5}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="quests"
        options={{
          tabBarButtonTestID: "tab-quests",
          title: t("tabs.quests"),
          // The only tab entered from outside itself: the home CTA and every adventure step
          // push /quests/{id}. Without this the detail stays on the stack, so tapping the
          // Quests tab later dropped the hero straight back into a quest instead of the
          // gallery. The tab is a section, and a section opens on its index.
          popToTopOnBlur: true,
          tabBarIcon: ({ focused, size }) => (
            <MapIcon
              color={focused ? "$primaryText" : "$text"}
              fill={focused ? theme.primaryText?.val : "none"}
              opacity={focused ? 1 : 0.55}
              size={size ?? 22}
              strokeWidth={2.5}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="village"
        options={{
          tabBarButtonTestID: "tab-village",
          title: t("tabs.village"),
          tabBarIcon: ({ focused, size }) => (
            <Castle
              color={focused ? "$primaryText" : "$text"}
              fill={focused ? theme.primaryText?.val : "none"}
              opacity={focused ? 1 : 0.55}
              size={size ?? 22}
              strokeWidth={2.5}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="journal"
        options={{
          tabBarButtonTestID: "tab-journal",
          title: t("tabs.journal"),
          tabBarIcon: ({ focused, size }) => (
            <Scroll
              color={focused ? "$primaryText" : "$text"}
              fill={focused ? theme.primaryText?.val : "none"}
              opacity={focused ? 1 : 0.55}
              size={size ?? 22}
              strokeWidth={2.5}
            />
          ),
        }}
      />
    </Tabs>
  );
}
