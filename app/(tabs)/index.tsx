import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, YStack } from "tamagui";
import { CurrentAdventureWidget } from "@/components/home/CurrentAdventureWidget";
import { HomeHeader } from "@/components/home/HomeHeader";
import { OathCard } from "@/components/home/OathCard";
import { StatsOverview } from "@/components/home/StatsOverview";
import { VillageTeaser } from "@/components/home/VillageTeaser";

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
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        >
          <YStack px="$4" gap="$4" pt="$2">
            {/* 2. Current Adventure (HERO) */}
            <CurrentAdventureWidget />

            {/* 3. Active oath (hidden when none is sworn) */}
            <OathCard />

            {/* 4. Statistics Overview */}
            <YStack mt="$2">
              <Text mb="$2" fontSize="$2" fontWeight="700" color="$textSecondary">
                {t("home.stats", "Stats")}
              </Text>
              <StatsOverview />
            </YStack>

            {/* 5. What the training built, as a way into the village */}
            <VillageTeaser />
          </YStack>
        </ScrollView>
      </YStack>
    </YStack>
  );
}
