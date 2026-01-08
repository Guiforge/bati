import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, YStack } from "tamagui";

import { type GameIconName, useGameIcon } from "@/src/hooks/useGameIcon";

const TabBarIcon = ({
  name,
  focused,
  size,
}: {
  name: GameIconName;
  focused: boolean;
  size: number;
}) => {
  const { GameIcon } = useGameIcon();
  return (
    <YStack
      alignItems="center"
      justifyContent="center"
      shadowColor={focused ? "$primary" : undefined}
      shadowRadius={focused ? 12 : 0}
      shadowOpacity={focused ? 0.6 : 0}
      scale={focused ? 1.3 : 1}
      animation="quick"
    >
      <GameIcon name={name} tintColor={focused ? "$primary" : "$color"} size={size ?? 22} />
    </YStack>
  );
};

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
          fontSize: 11,
          marginBottom: 4,
          paddingBottom: 0,
        },
        tabBarStyle: {
          backgroundColor: "#121421",
          borderTopWidth: 2,
          borderWidth: 2,
          borderColor: theme.borderStrong?.val || "#333",
          height: 74,
          borderRadius: 37,
          marginHorizontal: 16,
          marginBottom: insets.bottom + 10,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: 8,
          paddingBottom: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
        },
      }}
    >
      <Tabs.Screen
        name="adventures"
        options={{
          title: t("tabs.adventures", "Adventures"),
          tabBarIcon: ({ focused, size }) => (
            <TabBarIcon name="lorc/treasure-map" focused={focused} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="quests"
        options={{
          title: t("tabs.training", "Training"),
          tabBarIcon: ({ focused, size }) => (
            <TabBarIcon name="lorc/crossed-swords" focused={focused} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home", "Home"),
          tabBarIcon: ({ focused, size }) => (
            <TabBarIcon name="lorc/campfire" focused={focused} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="village"
        options={{
          title: t("tabs.village", "Village"),
          tabBarIcon: ({ focused, size }) => (
            <TabBarIcon name="lorc/castle" focused={focused} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="journal"
        options={{
          title: t("tabs.journal", "Journal"),
          tabBarIcon: ({ focused, size }) => (
            <TabBarIcon name="lorc/open-book" focused={focused} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
