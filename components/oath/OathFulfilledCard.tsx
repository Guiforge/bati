import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { GameIcon } from "@/components/common/GameIcon";
import type { OathProgress } from "@/db/oaths";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useOathText } from "./useOathText";

/**
 * Shown once, on the session that tips the oath over its target. The oath is the
 * user's own promise, so this outranks achievements on the victory screen.
 */
export function OathFulfilledCard({ oath, bonusXp }: { oath: OathProgress; bonusXp: number }) {
  const { t } = useTranslation();
  const label = useOathText(oath);
  const reducedMotion = useReducedMotion();

  return (
    <Card
      transition={reducedMotion ? undefined : "bouncy"}
      enterStyle={reducedMotion ? undefined : { opacity: 0, scale: 0.92, y: 14 }}
      width="100%"
      maxW={520}
      bg="$pastelPurple"
      borderColor="$glassBorder"
      gap="$3"
      items="center"
    >
      <XStack items="center" gap="$2">
        <GameIcon name="star" size={20} color="$primaryText" />
        <Text fontWeight="700" fontSize={16} color="$primaryText" style={{ textAlign: "center" }}>
          {t("oath.fulfilled_title")}
        </Text>
        <GameIcon name="star" size={20} color="$primaryText" />
      </XStack>

      <YStack
        width="100%"
        bg="$background"
        p="$3"
        rounded="$4"
        borderWidth={1}
        borderColor="$glassBorder"
        items="center"
        gap="$1"
      >
        <Text fontWeight="700" fontSize={18} color="$text" style={{ textAlign: "center" }}>
          {label}
        </Text>
        <Text fontSize={13} color="$text" opacity={0.7} style={{ textAlign: "center" }}>
          {t("oath.fulfilled_subtitle")}
        </Text>
        {bonusXp > 0 && (
          <Text fontWeight="700" fontSize={15} color="$primaryText" style={{ textAlign: "center" }}>
            {t("oath.fulfilled_xp_bonus", { count: bonusXp })}
          </Text>
        )}
      </YStack>
    </Card>
  );
}
