import { useState } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

type Ask = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  extraLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onExtra?: () => void;
  /** Hardware back on a choice whose cancel is an answer: closes, then runs this (see ConfirmDialog). */
  onDismiss?: () => void;
};

/**
 * The imperative half of `ConfirmDialog`, for the places that used to call `Alert.alert` from a
 * handler: `ask({...})` opens it, any answer closes it first and then runs its handler, and the
 * caller renders `dialog` once. One dialog at a time: asking again replaces the one on screen.
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<Ask | null>(null);

  const answer = (pick: "onConfirm" | "onCancel" | "onExtra" | "onDismiss") => () => {
    const handler = pending?.[pick];
    setPending(null);
    handler?.();
  };

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      title={pending?.title ?? ""}
      body={pending?.body ?? ""}
      confirmLabel={pending?.confirmLabel ?? ""}
      cancelLabel={pending?.cancelLabel}
      extraLabel={pending?.extraLabel}
      destructive={pending?.destructive}
      onConfirm={answer("onConfirm")}
      // Left out with no cancel button, so hardware back on a one-button message means its button.
      onCancel={pending?.cancelLabel ? answer("onCancel") : undefined}
      onExtra={answer("onExtra")}
      onDismiss={pending?.onDismiss ? answer("onDismiss") : undefined}
    />
  );
  return { ask: setPending, dialog };
}
