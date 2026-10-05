import { Text, type TextProps } from "tamagui";
import { useSettingsStore } from "@/stores/settings";

/**
 * The one section label: small, bold, tracked, upper case in the hero's language. Settings,
 * the exercise detail, Quick actions and the village lists all say "what this group is" with it.
 * Kickers that carry a state or a date (Victory's gold line, the session phase labels) keep
 * their own styles on purpose.
 */
export function SectionLabel({ children, ...props }: TextProps & { children: string }) {
  const language = useSettingsStore((s) => s.language);
  return (
    <Text fontSize={12} fontWeight="700" letterSpacing={1.5} color="$textSecondary" {...props}>
      {children.toLocaleUpperCase(language)}
    </Text>
  );
}
