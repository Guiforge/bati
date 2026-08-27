import { ChevronLeft, ExternalLink, ScrollText } from "@tamagui/lucide-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Paragraph, Separator, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";

type CreditLinkProps = {
  title: string;
  subtitle?: string;
  url: string;
  onPress: (url: string) => void;
};

function CreditLink({ title, subtitle, url, onPress }: CreditLinkProps) {
  return (
    <Card onPress={() => onPress(url)} p="$3">
      <XStack items="center" gap="$3">
        <ExternalLink size={20} color="$text" />
        <YStack flex={1} gap="$1">
          <Text fontSize="$4" fontWeight="700" color="$text">
            {title}
          </Text>
          {subtitle ? (
            <Text fontSize="$2" color="$textSecondary">
              {subtitle}
            </Text>
          ) : null}
        </YStack>
      </XStack>
    </Card>
  );
}

export default function CreditsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

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
    <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <Button
          size="$3"
          circular
          chromeless
          onPress={() => router.back()}
          icon={<ChevronLeft size={24} color="$text" />}
          accessibilityRole="button"
          accessibilityLabel={t("quests.go_back", "Go back")}
        />
        <XStack flex={1} items="center" gap="$2">
          <ScrollText size={20} color="$primaryText" />
          <Text fontSize={22} fontWeight="700" color="$text">
            {t("credits.title")}
          </Text>
        </XStack>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <Card gap="$3">
          <Text fontSize="$4" fontWeight="700" color="$text">
            {t("credits.third_party_title")}
          </Text>
          <Paragraph color="$textSecondary">{t("credits.third_party_body")}</Paragraph>
        </Card>

        <Card gap="$3">
          <Text fontSize="$4" fontWeight="700" color="$text">
            {t("credits.illustrations_title")}
          </Text>
          <Paragraph color="$textSecondary">{t("credits.illustrations_note")}</Paragraph>

          <Separator />

          <CreditLink
            title={t("credits.everkinetic")}
            subtitle={t("credits.everkinetic_subtitle")}
            url="https://github.com/everkinetic/data"
            onPress={openUrl}
          />
          <CreditLink
            title={t("credits.workout_guide")}
            subtitle={t("credits.workout_guide_subtitle")}
            url="https://github.com/bryllim/workout-guide"
            onPress={openUrl}
          />
          <CreditLink
            title={t("credits.cc_by_sa_40")}
            subtitle={t("credits.cc_by_sa_40_subtitle")}
            url="https://creativecommons.org/licenses/by-sa/4.0/"
            onPress={openUrl}
          />
        </Card>

        <Card gap="$3">
          <Text fontSize="$4" fontWeight="700" color="$text">
            {t("credits.icons_title")}
          </Text>
          <Paragraph color="$textSecondary">{t("credits.game_icons_note")}</Paragraph>

          <Separator />

          <CreditLink
            title={t("credits.game_icons_site")}
            subtitle={t("credits.game_icons_site_subtitle")}
            url="https://game-icons.net/"
            onPress={openUrl}
          />
          <CreditLink
            title={t("credits.game_icons_about")}
            subtitle={t("credits.game_icons_about_subtitle")}
            url="https://game-icons.net/about.html"
            onPress={openUrl}
          />
          <CreditLink
            title={t("credits.cc_by_30")}
            subtitle={t("credits.cc_by_30_subtitle")}
            url="https://creativecommons.org/licenses/by/3.0/"
            onPress={openUrl}
          />

          <Separator />

          <Paragraph color="$textSecondary">{t("credits.attribution_example")}</Paragraph>

          <XStack>
            <AppButton
              variant="secondary"
              fullWidth={false}
              onPress={() => openUrl("https://game-icons.net/about.html#authors")}
            >
              {t("credits.view_authors")}
            </AppButton>
          </XStack>
        </Card>

        <Card gap="$3">
          <Text fontSize="$4" fontWeight="700" color="$text">
            {t("credits.open_source_title")}
          </Text>
          <Paragraph color="$textSecondary">{t("credits.open_source_body")}</Paragraph>

          <Separator />

          <CreditLink
            title="Expo"
            subtitle="https://expo.dev"
            url="https://expo.dev"
            onPress={openUrl}
          />
          <CreditLink
            title="React Native"
            subtitle="https://reactnative.dev"
            url="https://reactnative.dev"
            onPress={openUrl}
          />
          <CreditLink
            title="Tamagui"
            subtitle="https://tamagui.dev"
            url="https://tamagui.dev"
            onPress={openUrl}
          />
          <CreditLink
            title="Zustand"
            subtitle="https://zustand-demo.pmnd.rs"
            url="https://zustand-demo.pmnd.rs"
            onPress={openUrl}
          />
          <CreditLink
            title="Drizzle ORM"
            subtitle="https://orm.drizzle.team"
            url="https://orm.drizzle.team"
            onPress={openUrl}
          />
        </Card>
      </RNScrollView>
    </YStack>
  );
}
