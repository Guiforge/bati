import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Text, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";

/**
 * What a create screen shows instead of its form when a free account is at its quota. Text and a
 * way back, no price and no buy button: the offer is not written yet. `children` sits under the
 * text (the quest editor keeps its import button there).
 */
export function QuotaPanel({ text, children }: { text: string; children?: ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Card>
      <YStack gap="$3">
        <Text testID="quota-panel-text" fontSize={15} color="$text">
          {text}
        </Text>
        {children}
        <AppButton variant="outline" onPress={() => router.back()}>
          {t("common.go_back")}
        </AppButton>
      </YStack>
    </Card>
  );
}
