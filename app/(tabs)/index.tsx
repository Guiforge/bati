import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, YStack } from "tamagui";
import { ActiveAdventureSection } from "@/src/components/home/ActiveAdventureSection";
import { AdventuresGallery } from "@/src/components/home/AdventuresGallery";
import { ImmersiveHeader } from "@/src/components/home/ImmersiveHeader";
import { StatsOverview } from "@/src/components/home/StatsOverview";
import { StylizedResourcesBar } from "@/src/components/home/StylizedResourcesBar";
import { VillageHeroCard } from "@/src/components/home/VillageHeroCard";
import { getAnyActiveAdventureRun } from "@/src/db/adventures";

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [hasActiveAdventure, setHasActiveAdventure] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkActiveAdventure() {
      try {
        const result = await getAnyActiveAdventureRun();
        setHasActiveAdventure(!!result);
      } catch {
        setHasActiveAdventure(false);
      }
    }
    checkActiveAdventure();
  }, []);

  return (
    <YStack flex={1} bg="$bgDark" pt={insets.top}>
      <YStack flex={1} position="relative">
        {/* 1. Immersive Header: Avatar, Level & XP */}
        <ImmersiveHeader />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        >
          <YStack gap="$5" pt="$3">
            {/* 2. Adventures Section */}
            <YStack>
              <YStack px="$4" mb="$2">
                <SectionLabel title={t("home.adventures", "ADVENTURES")} />
              </YStack>
              {hasActiveAdventure === null ? null : hasActiveAdventure ? (
                <ActiveAdventureSection />
              ) : (
                <AdventuresGallery />
              )}
            </YStack>

            {/* 3. Resources Section */}
            <YStack px="$4">
              <SectionLabel title={t("home.resources", "RESOURCES")} />
              <StylizedResourcesBar />
            </YStack>

            {/* 4. Village Card */}
            <YStack>
              <YStack px="$4" mb="$2">
                <SectionLabel title={t("home.world", "WORLD")} />
              </YStack>
              <VillageHeroCard />
            </YStack>

            {/* 5. Statistics Overview */}
            <YStack px="$4">
              <SectionLabel title={t("home.stats", "STATISTICS")} />
              <StatsOverview />
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    </YStack>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <Text
      fontSize={11}
      fontWeight="900"
      color="$textSecondary"
      opacity={0.5}
      mb="$2"
      letterSpacing={1}
      textTransform="uppercase"
    >
      {title}
    </Text>
  );
}
