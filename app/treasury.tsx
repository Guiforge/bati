import { ChevronLeft } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Text, useTheme, XStack, YStack } from "tamagui";
import { getResourceInventory, type ResourceAmount } from "@/db/resources";
import type { ResourceCode } from "@/db/schema";
import { useGameIcons } from "@/hooks/useGameIcon";

type ResourceInfo = {
  code: ResourceCode;
  iconName: "gold" | "wood" | "stone" | "fire" | "water" | "wind" | "grain";
  color: string;
  muscle: string;
};

const RESOURCES: ResourceInfo[] = [
  { code: "gold", iconName: "gold", color: "#FFD700", muscle: "—" },
  { code: "wood", iconName: "wood", color: "#8B4513", muscle: "arms" },
  { code: "stone", iconName: "stone", color: "#808080", muscle: "back" },
  { code: "fire", iconName: "fire", color: "#FF6B35", muscle: "chest" },
  { code: "water", iconName: "water", color: "#4ECDC4", muscle: "abs" },
  { code: "wind", iconName: "wind", color: "#C9B1FF", muscle: "shoulders" },
  { code: "grain", iconName: "grain", color: "#DAA520", muscle: "legs" },
];

export default function TreasuryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const [resources, setResources] = useState<ResourceAmount[]>([]);
  const icons = useGameIcons(["gold", "wood", "stone", "fire", "water", "wind", "grain", "chest"]);

  useEffect(() => {
    getResourceInventory().then(setResources);
  }, []);

  const getAmount = (code: ResourceCode) => {
    return resources.find((r) => r.resource === code)?.amount ?? 0;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t("treasury.title", "Treasury"),
          headerShown: true,
          headerStyle: { backgroundColor: theme.background?.val },
          headerTintColor: theme.color?.val,
          headerLeft: () => (
            <Button chromeless circular onPress={() => router.back()}>
              <ChevronLeft size={24} color="$color" />
            </Button>
          ),
        }}
      />
      <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: theme.background?.val }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Header */}
          <YStack items="center" gap="$3" py="$4">
            <Image source={icons.chest} style={{ width: 64, height: 64 }} contentFit="contain" />
            <Text fontSize="$6" fontWeight="900" color="$color">
              {t("treasury.title", "Treasury")}
            </Text>
            <Text fontSize="$3" color="$color" opacity={0.6} style={{ textAlign: "center" }}>
              {t("treasury.subtitle", "Your collected resources from battles and quests")}
            </Text>
          </YStack>

          {/* Resource Cards Grid */}
          <XStack flexWrap="wrap" gap="$3" justify="space-between">
            {RESOURCES.map((res) => (
              <Card
                key={res.code}
                bg="$bgLight"
                borderWidth={3}
                borderColor="$color"
                borderRadius="$5"
                p="$3"
                width="48%" // ~50% minus gap
                pressStyle={{ scale: 0.98 }}
                animation="bouncy"
              >
                <YStack items="center" gap="$2">
                  {/* Icon */}
                  <YStack bg="$bgLight" rounded="$4" p="$2" borderWidth={2} borderColor="$color">
                    <Image
                      source={icons[res.iconName]}
                      style={{
                        width: 48,
                        height: 48,
                        tintColor: res.color,
                      }}
                      contentFit="contain"
                    />
                  </YStack>

                  {/* Quantity */}
                  <Text fontSize="$6" fontWeight="900" color="$color">
                    {getAmount(res.code)}
                  </Text>

                  {/* Name */}
                  <Text
                    fontSize="$3"
                    fontWeight="bold"
                    color="$color"
                    opacity={0.6}
                    textTransform="capitalize"
                  >
                    {t(`resources.${res.code}`, res.code)}
                  </Text>
                </YStack>
              </Card>
            ))}
          </XStack>

          {/* Info Card */}
          <Card
            bg="$pastelBlue"
            borderWidth={2}
            borderColor="$color"
            borderRadius="$4"
            p="$4"
            mt="$2"
          >
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="bold" color="$color">
                💡 {t("treasury.tip_title", "How to earn resources")}
              </Text>
              <Text fontSize="$2" color="$color" opacity={0.7}>
                {t(
                  "treasury.tip_body",
                  "Complete quests targeting specific muscle groups to earn their corresponding resources. Use resources to upgrade buildings in your village!",
                )}
              </Text>
            </YStack>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
