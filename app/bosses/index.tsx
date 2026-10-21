import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { getBossAsset } from "@/constants/assetMap";
import { type HeroBoss, listHeroBosses } from "@/db/heroBosses";
import { reportError } from "@/src/reportError";

const THUMB = 56;

/** Every boss the hero has made, newest first: the Forge's "See all". */
export default function BossesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bosses, setBosses] = useState<HeroBoss[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      listHeroBosses()
        .then(setBosses)
        .catch((error: unknown) => reportError("bosses.list", error));
    }, []),
  );

  return (
    <YStack testID="bosses-screen" flex={1} bg="$background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
          gap: 16,
        }}
      >
        <XStack items="center" gap="$3">
          <AppIconButton
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t("quests.go_back")}
          >
            <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
          </AppIconButton>
          <Text
            flex={1}
            minW={0}
            fontFamily="$heading"
            fontWeight="700"
            fontSize={20}
            color="$text"
            numberOfLines={1}
          >
            {t("forge.bosses")}
          </Text>
        </XStack>
        {bosses?.length === 0 ? (
          <Paragraph color="$textSecondary">{t("forge.bosses_empty")}</Paragraph>
        ) : null}
        {bosses?.map((b) => (
          <XStack
            key={b.id}
            testID={`bosses-row-${b.id}`}
            minH={THUMB}
            items="center"
            gap="$3"
            onPress={() => router.push(`/bosses/edit?id=${b.id}` as never)}
            pressStyle={{ opacity: 0.7 }}
            accessibilityRole="button"
            accessibilityLabel={b.name}
          >
            <Image
              source={getBossAsset(b.monster, 0, undefined, b.art)}
              style={{ width: THUMB, height: THUMB, borderRadius: 8 }}
              contentFit="cover"
              accessible={false}
            />
            <Text flex={1} minW={0} color="$text" fontSize={15} numberOfLines={2}>
              {b.name}
            </Text>
            <ChevronRight size={16} color="$textSecondary" />
          </XStack>
        ))}
        <AppButton
          testID="bosses-new"
          variant="outline"
          onPress={() => router.push("/bosses/edit" as never)}
        >
          {t("boss_editor.title_new")}
        </AppButton>
      </ScrollView>
    </YStack>
  );
}
