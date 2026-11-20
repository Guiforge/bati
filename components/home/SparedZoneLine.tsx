import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/common/AppText";
import { Card } from "@/components/common/Card";
import { shortDate } from "@/components/journal/journalFormat";
import { MUSCLE_LABELS } from "@/db/labels";
import { dayOf } from "@/db/reminders";
import type { Zone } from "@/db/zone";
import { useSettingsStore } from "@/stores/settings";

/** The zone the hero is sparing, said on Home; a tap opens the screen that ends it early. */
export function SparedZoneLine({ zone }: { zone: Zone }) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  return (
    <Card
      testID="home-zone-line"
      mx="4"
      mt="3"
      py="2"
      accessibilityRole="button"
      onPress={() => router.push("/pause" as never)}
    >
      <AppText fontSize="3" color="primaryText">
        {t("pause.zone_active", {
          zones: zone.groups.map((m) => MUSCLE_LABELS[m][language]).join(", "),
          date: shortDate(language, dayOf(zone.until)),
        })}
      </AppText>
    </Card>
  );
}
