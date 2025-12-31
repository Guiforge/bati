import { Castle, Map as MapIcon, Scroll } from "@tamagui/lucide-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
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
        // Bottom nav removed (keeps tab routing but hides the UI).
        tabBarStyle: {
          display: "none",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
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
        name="quests"
        options={{
          title: "Quêtes",
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
          title: "Journal",
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
