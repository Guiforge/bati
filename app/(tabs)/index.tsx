import { Menu } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Text, useTheme, XStack, YStack } from "tamagui";
import { ContinueAdventureFab } from "@/components/home/ContinueAdventureFab";
import { HeroStatusCard } from "@/components/home/HeroStatusCard";
// Components
import { HomeHeader } from "@/components/home/HomeHeader";
import { QuestCarousel } from "@/components/QuestCarousel";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
      <YStack flex={1} position="relative">
        {/* Settings Icon */}
        <XStack position="absolute" t="$2" r="$3" style={{ zIndex: 10 }}>
          <Button
            size="$3"
            circular
            chromeless
            onPress={() => router.push("/settings")}
            icon={<Menu size={22} color="$color" />}
          />
        </XStack>

        {/* 1. Header: Identity & Wealth */}
        <HomeHeader />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }} // Space for FAB + tab bar
        >
          <YStack gap="$4" pt="$2">
            {/* 2. Hero Status: Village & Stats */}
            <YStack>
              <Text px="$4" mb="$2" fontSize="$2" fontWeight="bold" opacity={0.5} color="$color">
                YOUR KINGDOM
              </Text>
              <HeroStatusCard />
            </YStack>

            {/* 3. Discovery: Pick a Quest (Horizontal Scroll) */}
            <YStack>
              <Text px="$4" mb="$2" fontSize="$2" fontWeight="bold" opacity={0.5} color="$color">
                QUICK PLAY
              </Text>
              <QuestCarousel />
            </YStack>
          </YStack>
        </ScrollView>

        {/* 5. Floating Action: The Main "Next Step" */}
        <ContinueAdventureFab />
      </YStack>
    </SafeAreaView>
  );
}
