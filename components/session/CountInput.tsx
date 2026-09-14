import { useState } from "react";
import { Input, YStack } from "tamagui";

interface CountInputProps {
  value: number;
  onChange: (value: number) => void;
  /** The store clamps too; this keeps the field from showing a number it will not keep. */
  max: number;
  fontSize: number;
  accessibilityLabel: string;
  testID?: string;
}

/**
 * A count the hero can type, for the set that went forty reps past the target where the stepper
 * beside it would take forty taps.
 *
 * The parent owns the number and gets it on every keystroke that makes one, so whatever reads it
 * (the ghost line, the crit odds, the Done button) is live and never sees the half-typed states:
 * an emptied field or a 0 stays in the draft and blur puts the last real count back.
 *
 * The underline is the whole affordance. The numeral used to be a heading, and a heading does not
 * say it can be tapped; the line turns to the primary colour while the keyboard is up.
 */
export function CountInput({
  value,
  onChange,
  max,
  fontSize,
  accessibilityLabel,
  testID,
}: CountInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, "");
    const typed = Number(digits);
    if (typed > max) {
      setDraft(String(max));
      onChange(max);
      return;
    }
    setDraft(digits);
    if (typed >= 1) onChange(typed);
  };

  return (
    <YStack borderBottomWidth={2} borderColor={draft === null ? "$borderStrong" : "$primary"}>
      <Input
        unstyled
        testID={testID}
        value={draft ?? String(value)}
        onChangeText={handleChangeText}
        onFocus={() => setDraft(String(value))}
        onBlur={() => setDraft(null)}
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        maxLength={String(max).length}
        fontSize={fontSize}
        lineHeight={Math.round(fontSize * 1.1)}
        fontWeight="700"
        fontFamily="$body"
        color="$text"
        text="center"
        p={0}
        minW={fontSize}
        accessibilityLabel={accessibilityLabel}
      />
    </YStack>
  );
}
