import { LegendList, useRecyclingState } from "@legendapp/list/react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Separator, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { ScrollText } from "@/components/icons";
import notices from "@/src/licenses.json";

const Rule = () => <Separator />;

type Pkg = (typeof notices.packages)[number];

function PackageRow({ pkg }: { pkg: Pkg }) {
  const [open, setOpen] = useRecyclingState(false);
  return (
    <YStack
      px="$4"
      py="$2"
      gap="$2"
      onPress={() => setOpen((o) => !o)}
      accessibilityRole="button"
      aria-expanded={open}
    >
      <XStack items="center" justify="space-between" gap="$3">
        <YStack flex={1}>
          <Text fontSize="$3" fontWeight="700" color="$text">
            {pkg.name}
          </Text>
          <Text fontSize="$2" color="$textSecondary">
            {pkg.version}
          </Text>
        </YStack>
        <Text fontSize="$3" color="$textSecondary">
          {pkg.license}
        </Text>
      </XStack>
      {open
        ? pkg.notices.map((n) => (
            // Third-party legal text, verbatim and in English: it is not app copy.
            <YStack key={n.text} gap="$1">
              {n.copyright.map((line) => (
                <Text key={line} fontSize={11} color="$text" selectable>
                  {line}
                </Text>
              ))}
              <Text fontSize={11} color="$textSecondary" selectable>
                {notices.texts[n.text]}
              </Text>
            </YStack>
          ))
        : null}
    </YStack>
  );
}

function IconAuthors() {
  const { t } = useTranslation();
  return (
    <Card gap="$2" mx="$4" mb="$3" testID="licenses-icon-authors">
      <Text fontSize="$4" fontWeight="700" color="$text">
        {t("credits.licenses_icons_title")}
      </Text>
      <Paragraph color="$textSecondary">{t("credits.licenses_icons_body")}</Paragraph>
      {notices.gameIcons.map((g) => (
        <Text key={g.author} fontSize="$2" color="$textSecondary">
          {t("credits.licenses_icons_by", { author: g.author })}
          {": "}
          {g.icons.join(", ")}
        </Text>
      ))}
    </Card>
  );
}

export default function LicensesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} bg="$background" pt={insets.top}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <ScreenBackButton />
        <XStack flex={1} items="center" gap="$2">
          <ScrollText size={20} color="$primaryText" />
          <Text fontFamily="$heading" fontSize={22} fontWeight="700" color="$text">
            {t("credits.licenses_title")}
          </Text>
        </XStack>
      </XStack>

      <LegendList
        data={notices.packages}
        keyExtractor={(p) => `${p.name}@${p.version}`}
        renderItem={({ item }) => <PackageRow pkg={item} />}
        ItemSeparatorComponent={Rule}
        ListHeaderComponent={
          <YStack>
            <Paragraph color="$textSecondary" px="$4" pb="$3">
              {t("credits.licenses_body")}
            </Paragraph>
            <IconAuthors />
          </YStack>
        }
        recycleItems
        estimatedItemSize={56}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      />
    </YStack>
  );
}
