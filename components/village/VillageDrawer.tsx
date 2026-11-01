import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { FormSheet } from "@/components/common/FormSheet";
import { ChevronUp } from "@/components/icons";
import { HAUTEUR_BANDEAU } from "@/components/village/iso/disposition";

/**
 * The foot of the iso village page (T45): one button, no badge, that opens the drawer. It says the
 * tier in a short line and nothing else; it is the first node TalkBack reads on the page.
 */
export function VillageBandeau({ tier, onPress }: { tier: number; onPress: () => void }) {
  const { t } = useTranslation();
  const label = t("village.drawer_open", { tier });
  return (
    <Pressable
      testID="village-drawer-open"
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ height: HAUTEUR_BANDEAU }}
    >
      <XStack
        flex={1}
        items="center"
        justify="space-between"
        gap="3"
        px="4"
        bg="bgDark"
        borderTopWidth={1}
        borderColor="glassBorder"
      >
        {/* One line, cut at the end: a bigger font never makes the strip taller than the map left room for. */}
        <Text flex={1} fontSize={15} fontWeight="600" color="text" numberOfLines={1}>
          {label}
        </Text>
        <ChevronUp size={20} color="textSecondary" />
      </XStack>
    </Pressable>
  );
}

/**
 * Everything the village list showed, in a sheet over the map: the tier and its bar, "Next to rise",
 * the buildings, the seasons. The same `FormSheet` as the settings forms, which already carries the
 * `Sheet.ScrollView` first-tap fix.
 */
export function VillageDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <FormSheet open={open} title={t("village.drawer_title")} onClose={onClose}>
      <YStack testID="village-drawer" gap={18}>
        {children}
      </YStack>
    </FormSheet>
  );
}
