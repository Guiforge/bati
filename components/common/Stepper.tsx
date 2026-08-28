import { useTranslation } from "react-i18next";
import { Button, Text, XStack, YStack } from "tamagui";
import { Minus, Plus } from "@/components/icons";

type StepperProps = {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Appended to the displayed value, e.g. "s" for a duration. */
  suffix?: string;
  onChange: (value: number) => void;
};

/** Label plus a −/+ pair. The only numeric input in the app that never needs a keyboard. */
export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: StepperProps) {
  const { t } = useTranslation();

  return (
    <XStack items="center" justify="space-between" gap="$3">
      <YStack flex={1}>
        <Text fontWeight="700" fontSize={15} color="$text" numberOfLines={1}>
          {label}
        </Text>
        {hint ? (
          <Text fontSize={12} color="$textSecondary">
            {hint}
          </Text>
        ) : null}
      </YStack>

      <XStack items="center" gap="$3">
        <Button
          size="$3"
          circular
          icon={<Minus size={16} />}
          disabled={value <= min}
          opacity={value <= min ? 0.4 : 1}
          accessibilityLabel={t("common.decrease", { label, defaultValue: `Decrease ${label}` })}
          onPress={() => onChange(Math.max(min, value - step))}
        />
        <Text
          fontWeight="700"
          fontSize={18}
          color="$text"
          style={{ minWidth: 52, textAlign: "center" }}
        >
          {value}
          {suffix}
        </Text>
        <Button
          size="$3"
          circular
          icon={<Plus size={16} />}
          disabled={value >= max}
          opacity={value >= max ? 0.4 : 1}
          accessibilityLabel={t("common.increase", { label, defaultValue: `Increase ${label}` })}
          onPress={() => onChange(Math.min(max, value + step))}
        />
      </XStack>
    </XStack>
  );
}
