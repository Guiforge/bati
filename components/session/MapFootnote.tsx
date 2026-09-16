import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppState, Linking } from "react-native";
import { Text, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { MAP_ATTRIBUTION } from "@/constants/mapStyle";
import { isNetworkBlocked } from "@/modules/bati-location";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * Whether Android refuses Bati the network, asked again each time the app comes back, since the
 * way out of that state is the phone's own settings screen.
 */
function useNetworkBlocked(): boolean {
  const [blocked, setBlocked] = useState(isNetworkBlocked);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setBlocked(isNetworkBlocked());
    });
    return () => subscription.remove();
  }, []);
  return blocked;
}

/**
 * The line under a map, and which of the lines it is says what actually happened.
 *
 * Allowed, it is the credit: ODbL requires the OSM one and OpenFreeMap requires its own to be
 * displayed once MapLibre's attribution button is off, which it is on every map in this app.
 * Refused, that credit would be a claim rather than a courtesy, because nothing of theirs was ever
 * fetched, so its place is taken by the offer.
 *
 * Allowed but blocked by the phone (a per-app "Network access" switch on LineageOS and /e/OS, a
 * firewall app), no tile ever arrives and MapLibre says nothing about it: the map was a trace on
 * black under a credit, and read as broken. That case names the switch and opens the settings.
 *
 * The offer's sentence is the confirmation. It names the host and says what leaves before a
 * single byte does, which is the whole of what a dialog would have asked twice; the tap is the
 * answer, and the basemap arrives under the trace that is already on screen.
 *
 * One component for the recap and the live map, so the two screens that can fetch a tile ask
 * with the same sentence and credit with the same line.
 */
export function MapFootnote() {
  const { t } = useTranslation();
  const enabled = useSettingsStore((s) => s.mapTilesEnabled);
  const setEnabled = useSettingsStore((s) => s.setMapTilesEnabled);
  const blocked = useNetworkBlocked();

  if (enabled && blocked) {
    return (
      <YStack testID="map-blocked" gap="$3">
        <Text fontSize={12} color="$textSecondary" style={{ textAlign: "center" }}>
          {t("recap.map_blocked")}
        </Text>
        <AppButton
          testID="map-open-settings"
          variant="outline"
          fontSize={16}
          onPress={() => {
            Linking.openSettings().catch((error) => reportError("map.openSettings", error));
          }}
        >
          {t("recap.map_open_settings")}
        </AppButton>
      </YStack>
    );
  }

  if (enabled) {
    return (
      <Text testID="map-attribution" fontSize={11} color="$muted" style={{ textAlign: "center" }}>
        {MAP_ATTRIBUTION} {t("recap.privacy")}
      </Text>
    );
  }

  return (
    <YStack testID="map-offer" gap="$3">
      <Text fontSize={12} color="$textSecondary" style={{ textAlign: "center" }}>
        {t("recap.map_offer")}
      </Text>
      <AppButton
        testID="map-enable"
        variant="outline"
        fontSize={16}
        onPress={() => {
          setEnabled(true).catch((error) => reportError("map.tilesWrite", error));
        }}
      >
        {t("recap.map_enable")}
      </AppButton>
    </YStack>
  );
}
