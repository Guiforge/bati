import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider, Theme } from "tamagui";

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

test("a destructive confirm in the Journal reads: its label clears AA on the resolved fill", async () => {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <Theme name="journal">
        <ConfirmDialog
          open
          destructive
          title="t"
          body=""
          confirmLabel="forget"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </Theme>
    </TamaguiProvider>,
  );
  // Tamagui resolves to "rgba(r, g, b, 1)" or "#rrggbb" depending on the path: read channels.
  const rgb = (c: unknown): number[] => {
    const v = String((c as { val?: unknown }).val ?? c);
    return v.startsWith("#")
      ? [1, 3, 5].map((i) => Number.parseInt(v.slice(i, i + 2), 16))
      : (v.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  };
  const lum = (c: unknown) => {
    const [r = 0, g = 0, b = 0] = rgb(c).map((n) => {
      const s = n / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const journal = config.themes.dark_journal;
  const fill = StyleSheet.flatten(
    screen.getByTestId("confirm-dialog-confirm").props.style,
  )?.backgroundColor;
  const label = StyleSheet.flatten(screen.getByText("forget").props.style)?.color;
  expect(rgb(fill)).toEqual(rgb(journal.error));
  expect(rgb(label)).toEqual(rgb(journal.text));
  const [hi, lo] = [lum(label), lum(fill)].sort((a, b) => b - a);
  expect(((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)).toBeGreaterThanOrEqual(4.5);
});
