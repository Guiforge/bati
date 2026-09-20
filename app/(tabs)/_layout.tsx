import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "tamagui";
import { Castle, Home, Map as MapIcon, Scroll, Sparkles } from "@/components/icons";

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primaryText?.val,
        tabBarInactiveTintColor: theme.color?.val,
        tabBarLabelStyle: {
          fontWeight: "700",
          fontSize: 12,
        },
        tabBarStyle: {
          backgroundColor: theme.bgLight?.val,
          borderTopWidth: 1,
          borderTopColor: theme.borderStrong?.val,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarButtonTestID: "tab-home",
          title: t("tabs.home", "Home"),
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
          title: t("tabs.adventures", "Adventures"),
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
          title: t("tabs.quests", "Quests"),
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
          title: t("tabs.village", "Village"),
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
          title: t("tabs.journal", "Journal"),
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
