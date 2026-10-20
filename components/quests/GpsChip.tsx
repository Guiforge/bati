import { useTranslation } from "react-i18next";
import { Chip } from "@/components/common/Chip";
import { MapPin, MapPinOff } from "@/components/icons";

/**
 * "GPS : oui / non": whether the next outing is measured by the phone's position. A setting drawn
 * as a chip, remembered, that prefills every start after it (`outing_gps`, local to the phone).
 *
 * For TalkBack it is a switch: the role and `checked` carry the state, the label is "GPS" alone
 * (it adds "on" or "off" and "double tap to toggle" itself), and the state is in the word and the
 * glyph for everyone else, never in a colour: `bgLight` in both positions, because it is a setting
 * and not one pick among several (`Chip selected` is for those).
 */
export function GpsChip({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const { t } = useTranslation();
  const Glyph = value ? MapPin : MapPinOff;
  return (
    <Chip
      testID="gps-chip"
      label={t(value ? "quests.gps_on" : "quests.gps_off")}
      icon={<Glyph size={16} color="$text" />}
      accessibilityRole="switch"
      accessibilityLabel={t("quests.gps_label")}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      self="flex-start"
    />
  );
}
