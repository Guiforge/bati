import { X } from "@tamagui/lucide-icons";
import { Button, Text, XStack } from "tamagui";
import { useHaptics } from "@/src/hooks/useHaptics";

type FilterChipProps = {
  label: string;
  onRemove: () => void;
};

export function FilterChip({ label, onRemove }: FilterChipProps) {
  const { impact } = useHaptics();

  return (
    <XStack
      bg="$primary"
      borderRadius="$6"
      px="$3"
      py="$1.5"
      gap="$2"
      alignItems="center"
      animation="quick"
      enterStyle={{ opacity: 0, scale: 0.8 }}
      exitStyle={{ opacity: 0, scale: 0.8 }}
      shadowColor="$primaryGlow"
      shadowRadius={8}
      shadowOpacity={0.4}
    >
      <Text color="white" fontSize={13} fontWeight="700">
        {label}
      </Text>
      <Button
        unstyled
        circular
        size="$1"
        onPress={() => {
          impact();
          onRemove();
        }}
        pressStyle={{ opacity: 0.7, scale: 0.9 }}
        padding="$1"
      >
        <X size={14} color="white" />
      </Button>
    </XStack>
  );
}
