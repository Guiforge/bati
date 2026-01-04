import { ChevronLeft, ExternalLink, ScrollText } from "@tamagui/lucide-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView } from "react-native";
import { Button, Paragraph, Separator, Text, XStack, YStack } from "tamagui";

import { GlassCard, RPGButton, RPGTitle, ScreenContainer, SolidCard } from "@/src/ui";

type CreditLinkProps = {
  title: string;
  subtitle?: string;
  url: string;
};

function CreditLink({ title, subtitle, url }: CreditLinkProps) {
  return (
    <GlassCard onPress={() => Linking.openURL(url)} p="$3">
      <XStack items="center" gap="$3">
        <ExternalLink size={20} color="$color" />
        <YStack flex={1} gap="$1">
          <Text fontSize="$4" fontWeight="900" color="$color">
            {title}
          </Text>
          {subtitle ? (
            <Text fontSize="$2" color="$muted">
              {subtitle}
            </Text>
          ) : null}
        </YStack>
      </XStack>
    </GlassCard>
  );
}

export default function CreditsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const openUrl = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) return;
      await Linking.openURL(url);
    } catch {
      // Ignore: opening links can fail on simulators / restricted environments.
    }
  }, []);

  return (
    <ScreenContainer noGutter>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <Button
          size="$3"
          circular
          chromeless
          onPress={() => router.back()}
          icon={<ChevronLeft size={24} color="$color" />}
        />
        <XStack flex={1} items="center" gap="$2">
          <ScrollText size={20} color="$color" />
          <RPGTitle>{t("credits.title")}</RPGTitle>
        </XStack>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <SolidCard p="$4" gap="$3">
          <Text fontSize="$4" fontWeight="900" color="$color">
            {t("credits.third_party_title")}
          </Text>
          <Paragraph color="$muted">{t("credits.third_party_body")}</Paragraph>
        </SolidCard>

        <SolidCard p="$4" gap="$3">
          <Text fontSize="$4" fontWeight="900" color="$color">
            {t("credits.icons_title")}
          </Text>
          <Paragraph color="$muted">{t("credits.game_icons_note")}</Paragraph>

          <Separator />

          <CreditLink
            title={t("credits.game_icons_site")}
            subtitle={t("credits.game_icons_site_subtitle")}
            url="https://game-icons.net/"
          />
          <CreditLink
            title={t("credits.game_icons_about")}
            subtitle={t("credits.game_icons_about_subtitle")}
            url="https://game-icons.net/about.html"
          />
          <CreditLink
            title={t("credits.cc_by_30")}
            subtitle={t("credits.cc_by_30_subtitle")}
            url="https://creativecommons.org/licenses/by/3.0/"
          />

          <Separator />

          <Paragraph color="$muted">{t("credits.attribution_example")}</Paragraph>

          <XStack>
            <RPGButton
              variant="secondary"
              onPress={() => openUrl("https://game-icons.net/about.html#authors")}
            >
              {t("credits.view_authors")}
            </RPGButton>
          </XStack>
        </SolidCard>

        <SolidCard p="$4" gap="$3">
          <Text fontSize="$4" fontWeight="900" color="$color">
            {t("credits.open_source_title")}
          </Text>
          <Paragraph color="$muted">{t("credits.open_source_body")}</Paragraph>

          <Separator />

          <CreditLink title="Expo" subtitle="https://expo.dev" url="https://expo.dev" />
          <CreditLink
            title="React Native"
            subtitle="https://reactnative.dev"
            url="https://reactnative.dev"
          />
          <CreditLink title="Tamagui" subtitle="https://tamagui.dev" url="https://tamagui.dev" />
          <CreditLink
            title="Zustand"
            subtitle="https://zustand-demo.pmnd.rs"
            url="https://zustand-demo.pmnd.rs"
          />
          <CreditLink
            title="Drizzle ORM"
            subtitle="https://orm.drizzle.team"
            url="https://orm.drizzle.team"
          />
        </SolidCard>
      </RNScrollView>
    </ScreenContainer>
  );
}
