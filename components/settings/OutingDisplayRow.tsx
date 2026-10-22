import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal } from "@/components/icons";
import { SettingRow } from "@/components/settings/SettingRow";
import { isOutingDisplayCustomised } from "@/constants/outingDisplay";
import { useHaptics } from "@/hooks/useHaptics";
import { useSettingsStore } from "@/stores/settings";

/**
 * "Affichage des sorties" in Settings, under the map rows. The value says whether anything was
 * changed, on the synced blob or on this phone's screen choice: either alone is enough.
 */
export function OutingDisplayRow() {
  const { t } = useTranslation();
  const router = useRouter();
  const haptics = useHaptics();
  const customised = useSettingsStore((s) =>
    isOutingDisplayCustomised(s.outingDisplay, s.outingKeepAwake),
  );
  return (
    <SettingRow
      testID="settings-outing-display"
      icon={<SlidersHorizontal size={22} color="text" />}
      label={t("settings.outing_display")}
      value={
        customised ? t("settings.outing_display_custom") : t("settings.outing_display_default")
      }
      onPress={() => {
        haptics.selection();
        router.push("/outing-display" as never);
      }}
    />
  );
}
