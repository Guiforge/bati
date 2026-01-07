import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { ActionCard } from "@/src/components/common/ActionCard";
import { AdventureHeroCard } from "@/src/components/home/AdventureHeroCard";
import { HomeHeader } from "@/src/components/home/HomeHeader";
import { ResourcesOverview } from "@/src/components/home/ResourcesOverview";
import { StatsOverview } from "@/src/components/home/StatsOverview";
import { GameIcon } from "@/src/hooks/useGameIcon";

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <YStack flex={1} bg="$bgDark" pt={insets.top}>
      <YStack flex={1} position="relative">
        {/* 1. Header: Identity & Level */}
        <HomeHeader />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        >
          <YStack gap="$4">
            {/* 2. Hero Adventure Card (MAIN FOCUS) */}
            <AdventureHeroCard />

            <YStack px="$4" gap="$4">
              {/* 3. Resources Overview (compact bar) */}
              <ResourcesOverview />

              {/* 4. Secondary Actions (Village & Treasury) */}
              <XStack gap="$3">
                <ActionCard
                  flex={1}
                  title={t("tabs.village", "Village")}
                  subtitle={t("home.visit_village", "Visit Village")}
                  onPress={() => router.push("/village")}
                  icon={<GameIcon name="lorc/castle" size={32} />}
                />
                <ActionCard
                  flex={1}
                  title={t("tabs.treasury", "Treasury")}
                  subtitle={t("home.open_inventory", "Open Inventory")}
                  onPress={() => router.push("/treasury")}
                  icon={<GameIcon name="lorc/cash" size={32} />}
                />
              </XStack>

              {/* 5. Statistics Overview */}
              <YStack mt="$2">
                <Text mb="$2" fontSize="$2" fontWeight="bold" opacity={0.5} color="$color">
                  {t("home.stats", "STATISTICS")}
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
