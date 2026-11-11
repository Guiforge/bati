import { Image, type ImageProps } from "expo-image";
import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { Chip } from "@/components/common/Chip";
import { SectionLabel } from "@/components/common/SectionLabel";
import { Check } from "@/components/icons";

/**
 * One thing of a file or of the hero's own, ticked to come in or to go out: a picture when it has
 * one, its name, a line under it, and the box. The whole row is the checkbox. `children` sit under
 * it, outside the press: a choice of their own (two chips) or a fold.
 */
export function TickRow({
  testID,
  title,
  note,
  image,
  on,
  disabled = false,
  onToggle,
  children,
}: {
  testID: string;
  title: string;
  note?: string;
  /** Absent: the row has no picture and keeps no room for one. */
  image?: ImageProps["source"];
  on: boolean;
  /** Cannot be changed: it comes with something else, or cannot come at all. `note` says which. */
  disabled?: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <YStack rounded="4" borderWidth={1} borderColor="borderStrong">
      <Pressable
        testID={testID}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on, disabled }}
        accessibilityLabel={title}
        onPress={onToggle}
      >
        <XStack gap="3" items="center" p="2" opacity={on ? 1 : 0.5}>
          {image ? (
            <Image source={image} style={{ width: 48, height: 48, borderRadius: 8 }} />
          ) : null}
          <YStack flex={1}>
            <Text color="text" fontWeight="600" numberOfLines={2}>
              {title}
            </Text>
            {note ? (
              <Text fontSize={13} color="textSecondary" numberOfLines={3}>
                {note}
              </Text>
            ) : null}
          </YStack>
          <YStack
            width={28}
            height={28}
            rounded="2"
            borderWidth={2}
            borderColor="borderStrong"
            bg={`${on ? "primary" : "transparent"}`}
            items="center"
            justify="center"
          >
            {on ? <Check size={18} color="white" strokeWidth={3} /> : null}
          </YStack>
        </XStack>
      </Pressable>
      {children ? (
        <YStack px="2" pb="2">
          {children}
        </YStack>
      ) : null}
    </YStack>
  );
}

/** The heading of a list of `TickRow`s, with the two shortcuts a long list needs. */
export function TickHeader({
  testID,
  title,
  all,
  none,
  onAll,
  onNone,
}: {
  testID: string;
  title: string;
  /** The chips' labels, translated. */
  all: string;
  none: string;
  onAll: () => void;
  onNone: () => void;
}) {
  return (
    <XStack items="center" gap="2" pt="3" pb="1" bg="background">
      <SectionLabel flex={1}>{title}</SectionLabel>
      <Chip testID={`${testID}-all`} label={all} onPress={onAll} />
      <Chip testID={`${testID}-none`} label={none} onPress={onNone} />
    </XStack>
  );
}
