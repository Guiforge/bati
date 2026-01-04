import { CurrentAdventureWidget } from "@/components/home/CurrentAdventureWidget";
import { HeroStatusCard } from "@/components/home/HeroStatusCard";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, YStack } from "tamagui";
// Components
import { HomeHeader } from "@/components/home/HomeHeader";
import { ResourcesOverview } from "@/components/home/ResourcesOverview";
import { StatsOverview } from "@/components/home/StatsOverview";
import { QuestCarousel } from "@/components/QuestCarousel";

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} bg="$background" pt={insets.top}>
      <YStack flex={1} position="relative">
        {/* 1. Header: Identity & Level */}
        <HomeHeader />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} // Space for tab bar + extra
        >
          <YStack gap="$4" pt="$2">
            {/* 2. Resources Overview (compact bar) */}
            <ResourcesOverview />

            {/* 3. Your Kingdom */}
            <YStack>
              <Text px="$4" mb="$2" fontSize="$2" fontWeight="bold" opacity={0.5} color="$color">
                {t("home.your_kingdom", "YOUR KINGDOM")}
              </Text>
              <HeroStatusCard />
            </YStack>

            {/* 4. Current Adventure / Next Step */}
            <YStack px="$4">
              <Text mb="$2" fontSize="$2" fontWeight="bold" opacity={0.5} color="$color">
                {t("home.adventure", "ADVENTURE")}
              </Text>
              <CurrentAdventureWidget />
            </YStack>

            {/* 5. Statistics Overview */}
            <YStack>
              <Text px="$4" mb="$2" fontSize="$2" fontWeight="bold" opacity={0.5} color="$color">
                {t("home.stats", "STATISTICS")}
              </Text>
              <StatsOverview />
            </YStack>

            {/* 6. Pick a Quest (Horizontal Scroll) */}
            <YStack>
              <Text px="$4" mb="$2" fontSize="$2" fontWeight="bold" opacity={0.5} color="$color">
                {t("home.pick_quest", "PICK A QUEST")}
              </Text>
              <QuestCarousel />
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    </YStack>
  );
}
