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
  /** A third answer between the two, as a quiet button: "change folder" next to "turn off". */
  extraLabel?: string;
  onExtra?: () => void;
  /** Paints the confirm button in the error colour: the action cannot be taken back. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  /**
   * Hardware back, when the cancel button is itself an answer ("keep", "fine"): back closes the
   * dialog and records nothing. Left out, back is cancel (or the one button of a message).
   */
  onDismiss?: () => void;
  testID?: string;
};

/**
 * The app's own `Alert.alert`. The native one is a grey system dialog, the only surface in a
 * dark-only app that ignores the palette. Hardware back counts as cancel (or confirm when there
 * is nothing else to press), unless the caller says what a dismissal means (`onDismiss`).
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
  extraLabel,
  onExtra,
  destructive,
  onConfirm,
  onCancel,
  onDismiss,
  testID = "confirm-dialog",
}: Props) {
  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      onRequestClose={onDismiss ?? onCancel ?? onConfirm}
    >
      <YStack flex={1} bg="$sheetScrim" items="center" justify="center" p="$6" testID={testID}>
        <Card width="100%" maxW={360} bg="$surface">
          <YStack gap="$3">
            <Text fontWeight="700" fontSize={20} color="$text">
              {title}
            </Text>
            {body ? (
              <Paragraph color="$textSecondary" size="$3">
                {body}
              </Paragraph>
            ) : null}
            <YStack gap="$2" pt="$2">
              <AppButton
                backgroundColor={destructive ? "$error" : undefined}
                onPress={onConfirm}
                testID={`${testID}-confirm`}
              >
                {confirmLabel}
              </AppButton>
              {extraLabel ? (
                <AppButton variant="outline" onPress={onExtra} testID={`${testID}-extra`}>
                  {extraLabel}
                </AppButton>
              ) : null}
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
