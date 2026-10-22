import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { Info } from "@/components/icons";

/**
 * "Ce que ça rapporte": the rule behind a figure, one tap away, in the one shape every surface
 * uses (the past-session sheet, the goal sheet, the outing panel, the recap). An `Info` glyph and
 * the words, underlined, on a 44 dp target; the rule unfolds in place and a second tap folds it.
 * Never a bare "ⓘ", never a sentence cut with an ellipsis, never a dialog for an explanation.
 *
 * `testID` names the rule text; the link is `${testID}-link`. Unfolding is instant: nothing here
 * animates, so there is no reduced-motion case to forget.
 */
export function RuleDisclosure({
  text,
  testID,
  open: controlled,
  onToggle,
}: {
  text: string;
  testID: string;
  /** Held by the caller when something else needs to know (the form's footer resets it). */
  open?: boolean;
  onToggle?: () => void;
}) {
  const { t } = useTranslation();
  const [inner, setInner] = useState(false);
  const open = controlled ?? inner;
  return (
    <YStack gap="1">
      <Pressable
        testID={`${testID}-link`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ minHeight: 44, justifyContent: "center" }}
        onPress={onToggle ?? (() => setInner((v) => !v))}
      >
        <XStack gap="2" items="center">
          <Info size={16} color="textSecondary" />
          <Text fontSize={14} color="textSecondary" textDecorationLine="underline">
            {t("past_session.rule_link")}
          </Text>
        </XStack>
      </Pressable>
      {open ? (
        <Text testID={testID} fontSize={14} color="text">
          {text}
        </Text>
      ) : null}
    </YStack>
  );
}
