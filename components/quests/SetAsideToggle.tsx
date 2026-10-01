import { useTranslation } from "react-i18next";
import { Chip } from "@/components/common/Chip";
import { Check } from "@/components/icons";
import type { Exercise } from "@/db/exercises";
import { localizedName } from "@/src/i18n/localized";
import { useSettingsStore } from "@/stores/settings";

/**
 * "Leave {name} out from now on", above the list of a Replace sheet.
 *
 * A toggle that commits nothing on its own: the set-aside is written when the hero picks the
 * replacement, so toggling it and closing the sheet changes nothing. A checkbox reading rather
 * than a button, because a button here would be one more thing that acts the instant it is
 * touched, in a sheet opened between two sets.
 */
export function SetAsideToggle({
  exercise,
  checked,
  onToggle,
}: {
  exercise: Exercise;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const name = localizedName(exercise, language);

  return (
    <Chip
      self="flex-start"
      tone={checked ? "primary" : "default"}
      icon={checked ? <Check size={14} color="$white" strokeWidth={3} /> : undefined}
      label={t("setAside.leave_out", { name, defaultValue: `Leave ${name} out from now on` })}
      onPress={() => onToggle(!checked)}
      // `role`, not only `accessibilityRole`: Tamagui sets its own role on a pressable stack.
      role="checkbox"
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      testID="set-aside-toggle"
    />
  );
}
