import { useTranslation } from "react-i18next";
import { Text } from "tamagui";
import { Map as MapIcon } from "@/components/icons";
import { SettingRow } from "@/components/settings/SettingRow";
import { MAP_STYLE_IDS, type MapStyleId } from "@/constants/mapStyle";
import { useHaptics } from "@/hooks/useHaptics";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/** Literal keys, so `tsc` refuses a style without copy and the key tests can see each one. */
const STYLE_LABEL = {
  ember: "settings.map_style_ember",
  dark: "settings.map_style_dark",
  fiord: "settings.map_style_fiord",
} as const satisfies Record<MapStyleId, string>;

/**
 * Which look the map has, under the tiles switch. Hidden, not disabled, while the tiles are off: a
 * style for a map that draws no tiles would be a control wired to nothing. A tap cycles.
 */
export function MapStyleRow() {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const tiles = useSettingsStore((s) => s.mapTilesEnabled);
  const style = useSettingsStore((s) => s.mapStyle);
  const setStyle = useSettingsStore((s) => s.setMapStyle);
  if (!tiles) return null;

  const next = MAP_STYLE_IDS[(MAP_STYLE_IDS.indexOf(style) + 1) % MAP_STYLE_IDS.length] ?? "ember";
  return (
    <>
      <SettingRow
        testID="settings-map-style"
        icon={<MapIcon size={22} color="text" />}
        label={t("settings.map_style")}
        value={t(STYLE_LABEL[style])}
        onPress={() => {
          haptics.selection();
          setStyle(next).catch((error) => reportError("settings.mapStyleWrite", error));
        }}
      />
      <Text testID="settings-map-style-note" fontSize="2" color="textSecondary" px="3">
        {t("settings.map_style_note")}
      </Text>
    </>
  );
}
