import { YStack } from "tamagui";
import { fade, rawColors } from "@/constants/rawColors";
import { useLivePanelProps } from "@/hooks/useLivePanelProps";
import { figureContext } from "@/src/gps/liveFigures";
import { useSettingsStore } from "@/stores/settings";
import { BigReading } from "./ExpeditionPanelView";

/**
 * The hero's big figure, floating on the big map. The same figure as the panel's, from the same
 * source and the same context, on a chip so it reads over any basemap. It takes no touch: the
 * map's pocket guard is unchanged.
 */
export function MapBigFigure() {
  const props = useLivePanelProps();
  const unit = useSettingsStore((s) => s.distanceUnit);
  const language = useSettingsStore((s) => s.language);
  return (
    <YStack
      testID="live-map-big"
      bg={fade(rawColors.bgDark, 0.8)}
      rounded="$4"
      px="$3"
      py="$1"
      self="flex-start"
      maxW="100%"
      pointerEvents="none"
    >
      <BigReading ctx={figureContext(props, unit, language)} view={props.view} fontSize={56} />
    </YStack>
  );
}
