import { Modal } from "react-native";
import { Paragraph, Text, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";

type Props = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  /** Left out for a message with nothing to decide: one button, `onConfirm` closes it. */
  cancelLabel?: string;
  /** Paints the confirm button in the error colour: the action cannot be taken back. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  testID?: string;
};

/**
 * The app's own `Alert.alert`. The native one is a grey system dialog, the only surface in a
 * dark-only app that ignores the palette. Hardware back counts as cancel (or confirm when there
 * is nothing else to press).
 *
 * No fade: callers clear their state in the same render that closes it, so a fade-out showed the
 * card already emptied (or the other dialog's title) for its whole duration.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
  testID = "confirm-dialog",
}: Props) {
  return (
    <Modal visible={open} transparent statusBarTranslucent onRequestClose={onCancel ?? onConfirm}>
      <YStack flex={1} bg="$sheetScrim" items="center" justify="center" p="$6" testID={testID}>
        <Card width="100%" maxW={360} bg="$surface">
          <YStack gap="$3">
            <Text fontWeight="700" fontSize={20} color="$text">
              {title}
            </Text>
            <Paragraph color="$textSecondary" size="$3">
              {body}
            </Paragraph>
            <YStack gap="$2" pt="$2">
              <AppButton
                backgroundColor={destructive ? "$error" : undefined}
                onPress={onConfirm}
                testID={`${testID}-confirm`}
              >
                {confirmLabel}
              </AppButton>
              {cancelLabel ? (
                <AppButton variant="outline" onPress={onCancel} testID={`${testID}-cancel`}>
                  {cancelLabel}
                </AppButton>
              ) : null}
            </YStack>
          </YStack>
        </Card>
      </YStack>
    </Modal>
  );
}
