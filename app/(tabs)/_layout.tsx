import { Castle, Map as MapIcon, Scroll, Sparkles } from "@tamagui/lucide-icons";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "rgba(20,20,22,0.55)",
        tabBarLabelStyle: {
          fontWeight: "800",
          fontSize: 12,
        },
        tabBarStyle: {
          backgroundColor: "#FDFBF7",
          borderTopWidth: 2,
          borderTopColor: "#2C3E50",
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
            <Castle
              color={focused ? "$primary" : "$color"}
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
