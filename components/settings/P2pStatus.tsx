import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { Text, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { FormSheet } from "@/components/common/FormSheet";
import { useConfirmDialog } from "@/components/common/useConfirmDialog";
import { idSuffix } from "@/src/p2p/link";
import { keptCopies } from "@/src/p2pSync";
import { reportError } from "@/src/reportError";
import { syncAgo } from "@/src/syncWords";
import { useSyncStore } from "@/stores/sync";

type Props = {
  open: boolean;
  account: { name: string; peerId: string };
  onClose: () => void;
  /** Opens the session sheet. */
  onSyncNow: () => void;
  /** Forgets the device (the caller closes the sheet and disconnects). */
  onForget: () => void;
  /** Links a different device, which replaces this one. */
  onLinkOther: () => void;
};

/** `bati-<id>-kept-20261108T140312-ab12.batb` as `2026-11-08 14:03`. */
function keptWhen(file: string): string {
  const m = /-kept-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/.exec(file);
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}` : file;
}

/** Settings › Sync once the other device is linked: who, when, and the three things to do with it. */
export function P2pStatus({ open, account, onClose, onSyncNow, onForget, onLinkOther }: Props) {
  const { t } = useTranslation();
  const running = useSyncStore((s) => s.running);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const [copies, setCopies] = useState<ReturnType<typeof keptCopies>>([]);
  const { ask, dialog } = useConfirmDialog();
  const who = { name: account.name, suffix: idSuffix(account.peerId) };

  const reload = () => {
    try {
      setCopies(keptCopies());
    } catch (e) {
      reportError("p2p.copies", e);
    }
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: read when the sheet opens.
  useEffect(() => {
    if (open) reload();
  }, [open]);

  return (
    <>
      <FormSheet open={open} title={t("sync.row")} onClose={onClose}>
        <Text testID="p2p-row" color="text" fontSize="4">
          {lastSyncAt === null
            ? t("p2p.rowNever", who)
            : t("p2p.row", { ...who, when: syncAgo(t, lastSyncAt) })}
        </Text>
        <AppButton testID="p2p-sync-now" disabled={running} onPress={onSyncNow}>
          {t("sync.now")}
        </AppButton>

        <YStack gap="1">
          <Text color="text" fontWeight="700">
            {t("p2p.copies")}
          </Text>
          {copies.length === 0 ? (
            <Text testID="p2p-copies-empty" color="textSecondary" fontSize="3">
              {t("p2p.copiesEmpty")}
            </Text>
          ) : (
            copies.map((file) => (
              <YStack key={file.name} gap="1">
                <Text testID="p2p-copy-row" color="textSecondary" fontSize="3">
                  {t("p2p.copyLabel", { when: keptWhen(file.name) })}
                </Text>
                <AppButton
                  testID="p2p-copy-delete"
                  variant="outline"
                  size="2"
                  onPress={() => {
                    try {
                      file.delete();
                    } catch (e) {
                      reportError("p2p.copyDelete", e);
                    }
                    reload();
                  }}
                >
                  {t("p2p.deleteCopy")}
                </AppButton>
              </YStack>
            ))
          )}
        </YStack>

        <Pressable testID="p2p-link-other" accessibilityRole="button" onPress={onLinkOther}>
          <Text color="textSecondary" fontSize="3" textDecorationLine="underline" py="2">
            {t("p2p.linkOther")}
          </Text>
        </Pressable>
        <AppButton
          testID="p2p-forget"
          variant="outline"
          onPress={() =>
            ask({
              title: t("p2p.forget"),
              body: t("p2p.forgetBody", { name: account.name }),
              cancelLabel: t("common.cancel"),
              confirmLabel: t("p2p.forget"),
              destructive: true,
              onConfirm: onForget,
            })
          }
        >
          {t("p2p.forget")}
        </AppButton>
      </FormSheet>
      {dialog}
    </>
  );
}
