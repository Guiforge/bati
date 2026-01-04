import { ContinueAdventureFab } from "@/components/home/ContinueAdventureFab";
import { HeroStatusCard } from "@/components/home/HeroStatusCard";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, useTheme, YStack } from "tamagui";
// Components
import { HomeHeader } from "@/components/home/HomeHeader";
import { ResourcesOverview } from "@/components/home/ResourcesOverview";
import { StatsOverview } from "@/components/home/StatsOverview";
import { QuestCarousel } from "@/components/QuestCarousel";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
      <YStack flex={1} position="relative">
        {/* 1. Header: Identity & Level */}
        <HomeHeader />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }} // Space for FAB + tab bar
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

            {/* 4. Quick Play: Pick a Quest */}
            <YStack>
              <Text px="$4" mb="$2" fontSize="$2" fontWeight="bold" opacity={0.5} color="$color">
                {t("home.quick_play", "QUICK PLAY")}
              </Text>
              <QuestCarousel />
            </YStack>

            {/* 5. Statistics Overview */}
            <YStack>
              <Text px="$4" mb="$2" fontSize="$2" fontWeight="bold" opacity={0.5} color="$color">
                {t("home.stats", "STATISTICS")}
              </Text>
              <StatsOverview />
            </YStack>
          </YStack>
        </ScrollView>

        {/* Floating Action: The Main "Next Step" */}
        <ContinueAdventureFab />
      </YStack>
    </SafeAreaView>
  );
}
