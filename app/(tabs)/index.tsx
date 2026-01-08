import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, YStack } from "tamagui";
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
          <YStack gap="$5">
            {/* 2. Hero Adventure Card (Main Focus) */}
            <AdventureHeroCard />

            <YStack px="$4" gap="$5">
              {/* 3. Resources Overview (HUD Bar) */}
              <YStack>
                <SectionLabel title={t("home.resources", "RESOURCES")} />
                <ResourcesOverview />
              </YStack>

              {/* 4. World Actions */}
              <YStack gap="$3">
                <SectionLabel title={t("home.world", "WORLD")} />
                <ActionCard
                  title={t("tabs.village", "Village")}
                  subtitle={t("home.visit_village", "Manage your settlement")}
                  onPress={() => router.push("/village")}
                  icon={<GameIcon name="lorc/castle" size={28} tintColor="$primary" />}
                  variant="featured"
                  ctaText={t("common.enter", "ENTER")}
                />
              </YStack>

              {/* 5. Statistics Overview */}
              <YStack>
                <SectionLabel title={t("home.stats", "STATISTICS")} />
                <StatsOverview />
              </YStack>
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
