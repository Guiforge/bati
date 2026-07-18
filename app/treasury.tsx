import { ChevronLeft, Lightbulb } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { Button, Text, useTheme, XStack, YStack } from "tamagui";

import { getResourceInventory, type ResourceAmount } from "@/db/resources";
import type { ResourceCode } from "@/db/schema";
import { useGameIcons } from "@/hooks/useGameIcon";
import { GlassCard, RPGText, RPGTitle, ScreenContainer, SolidCard } from "@/src/ui";

type ResourceInfo = {
  code: ResourceCode;
  iconName: "gold" | "wood" | "stone" | "fire" | "water" | "wind" | "grain";
  colorKey:
    | "resourceGold"
    | "resourceWood"
    | "resourceStone"
    | "resourceFire"
    | "resourceWater"
    | "resourceWind"
    | "resourceGrain";
  muscle: string;
};

const RESOURCES: ResourceInfo[] = [
  { code: "gold", iconName: "gold", colorKey: "resourceGold", muscle: "—" },
  { code: "wood", iconName: "wood", colorKey: "resourceWood", muscle: "arms" },
  { code: "stone", iconName: "stone", colorKey: "resourceStone", muscle: "back" },
  { code: "fire", iconName: "fire", colorKey: "resourceFire", muscle: "chest" },
  { code: "water", iconName: "water", colorKey: "resourceWater", muscle: "abs" },
  { code: "wind", iconName: "wind", colorKey: "resourceWind", muscle: "shoulders" },
  { code: "grain", iconName: "grain", colorKey: "resourceGrain", muscle: "legs" },
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

  const getThemeColor = (key: ResourceInfo["colorKey"]) => {
    const record = theme as unknown as Record<string, { val?: string }>;
    return record[key]?.val ?? theme.color?.val;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t("treasury.title"),
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
      <ScreenContainer edges={["bottom"]} noGutter>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <YStack items="center" gap="$3" py="$4">
            <Image source={icons.chest} style={{ width: 64, height: 64 }} contentFit="contain" />
            <RPGTitle>{t("treasury.title")}</RPGTitle>
            <RPGText muted>{t("treasury.subtitle")}</RPGText>
          </YStack>

          <XStack flexWrap="wrap" gap="$3" justify="space-between">
            {RESOURCES.map((res) => (
              <GlassCard key={res.code} p="$3" width="48%" animation="bouncy">
                <YStack items="center" gap="$2">
                  <YStack
                    bg="$surface2"
                    rounded="$5"
                    p="$2"
                    borderWidth={1}
                    borderColor="$borderStrong"
                  >
                    <Image
                      source={icons[res.iconName]}
                      style={{ width: 48, height: 48, tintColor: getThemeColor(res.colorKey) }}
                      contentFit="contain"
                    />
                  </YStack>

                  <Text fontSize={24} fontWeight="900" color="$color">
                    {getAmount(res.code)}
                  </Text>

                  <Text fontSize="$3" fontWeight="700" color="$muted" textTransform="capitalize">
                    {t(`resources.${res.code}`)}
                  </Text>
                </YStack>
              </GlassCard>
            ))}
          </XStack>

          <SolidCard bg="$surface2" borderColor="$glassBorder" mt="$2">
            <YStack gap="$3">
              <XStack gap="$2" items="center">
                <Lightbulb size={18} color="$primary" />
                <Text fontSize="$4" fontWeight="800" color="$text">
                  {t("treasury.tip_title")}
                </Text>
              </XStack>
              <RPGText muted>{t("treasury.tip_body")}</RPGText>
            </YStack>
          </SolidCard>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}
