import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { ActionCard } from "@/components/common/ActionCard";
import { CurrentAdventureWidget } from "@/components/home/CurrentAdventureWidget";
import { HomeHeader } from "@/components/home/HomeHeader";
import { ResourcesOverview } from "@/components/home/ResourcesOverview";
import { StatsOverview } from "@/components/home/StatsOverview";
import { useGameIcons } from "@/hooks/useGameIcon";

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const icons = useGameIcons(["castle", "coins"]);

  return (
    <YStack flex={1} bg="$background" pt={insets.top}>
      <YStack flex={1} position="relative">
        {/* 1. Header: Identity & Level */}
        <HomeHeader />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        >
          <YStack gap="$4" pt="$2">
            {/* 2. Resources Overview (compact bar) */}
            <ResourcesOverview />

            <YStack px="$4" gap="$4">
              {/* 3. Current Adventure (HERO) */}
              <CurrentAdventureWidget />

              {/* 4. Secondary Actions (Village & Treasury) */}
              <XStack gap="$3">
                <ActionCard
                  flex={1}
                  title={t("tabs.village", "Village")}
                  subtitle={t("home.visit_village", "Visit Village")}
                  onPress={() => router.push("/village")}
                  icon={
                    <Image
                      source={icons.castle}
                      style={{ width: 32, height: 32 }}
                      contentFit="contain"
                    />
                  }
                />
                <ActionCard
                  flex={1}
                  title={t("tabs.treasury", "Treasury")}
                  subtitle={t("home.open_inventory", "Open Inventory")}
                  onPress={() => router.push("/treasury")}
                  icon={
                    <Image
                      source={icons.coins}
                      style={{ width: 32, height: 32 }}
                      contentFit="contain"
                    />
                  }
                />
              </XStack>

              {/* 5. Statistics Overview */}
              <YStack mt="$2">
                <Text mb="$2" fontSize="$2" fontWeight="700" color="$textSecondary">
                  {t("home.stats", "Stats")}
                </Text>
                <StatsOverview />
              </YStack>
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    </YStack>
  );
}
