import { fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import config from "@/tamagui.config";

/**
 * What hardware back answers. Cancel on a destructive confirm, the only button on a message, and
 * nothing at all on a choice whose cancel button is itself an answer (`onDismiss`): sync's "keep"
 * remembers for good, and back must never say it for the hero.
 */
async function back(props: Partial<Parameters<typeof ConfirmDialog>[0]>) {
  const handlers = { onConfirm: jest.fn(), onCancel: jest.fn(), onDismiss: jest.fn() };
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <ConfirmDialog open title="t" body="" confirmLabel="ok" {...handlers} {...props} />
    </TamaguiProvider>,
  );
  fireEvent(screen.getByTestId("confirm-dialog"), "requestClose");
  return handlers;
}

test("back runs onDismiss alone when the caller gave one", async () => {
  const h = await back({ cancelLabel: "keep" });
  expect(h.onDismiss).toHaveBeenCalledTimes(1);
  expect(h.onCancel).not.toHaveBeenCalled();
  expect(h.onConfirm).not.toHaveBeenCalled();
});

test("without onDismiss, back is cancel", async () => {
  const h = await back({ cancelLabel: "cancel", onDismiss: undefined });
  expect(h.onCancel).toHaveBeenCalledTimes(1);
  expect(h.onConfirm).not.toHaveBeenCalled();
});

test("a message with one button closes on back through that button", async () => {
  const h = await back({ onDismiss: undefined, onCancel: undefined });
  expect(h.onConfirm).toHaveBeenCalledTimes(1);
});
