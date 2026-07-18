import { Castle, Home, Map as MapIcon, Scroll, Sparkles } from "@tamagui/lucide-icons";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "tamagui";

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary?.val,
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
          title: t("tabs.home", "Home"),
          tabBarIcon: ({ focused, size }) => (
            <Home
              color={focused ? "$primary" : "$color"}
              fill={focused ? theme.primary?.val : "none"}
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
          title: t("tabs.adventures", "Adventures"),
          tabBarIcon: ({ focused, size }) => (
            <Sparkles
              color={focused ? "$primary" : "$color"}
              fill={focused ? theme.primary?.val : "none"}
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
          title: t("tabs.quests", "Quests"),
          tabBarIcon: ({ focused, size }) => (
            <MapIcon
              color={focused ? "$primary" : "$color"}
              fill={focused ? theme.primary?.val : "none"}
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
          title: t("tabs.village", "Village"),
          tabBarIcon: ({ focused, size }) => (
            <Castle
              color={focused ? "$primary" : "$color"}
              fill={focused ? theme.primary?.val : "none"}
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
          title: t("tabs.journal", "Journal"),
          tabBarIcon: ({ focused, size }) => (
            <Scroll
              color={focused ? "$primary" : "$color"}
              fill={focused ? theme.primary?.val : "none"}
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
