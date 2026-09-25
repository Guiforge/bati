import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input, Sheet, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Chip } from "@/components/common/Chip";
import { X } from "@/components/icons";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Nextcloud: resolves once the browser sign-in is approved and the first sync ran. */
  onConnectNextcloud: (server: string) => Promise<boolean>;
  onCancelNextcloud: () => void;
  /** Any WebDAV server: resolves once the server accepted the folder and the first sync ran. */
  onConnectDav: (url: string, user: string, password: string) => Promise<boolean>;
};

type Mode = "nextcloud" | "webdav";

/**
 * Where device sync goes. Two doors to the same WebDAV transport (src/cloudSync.ts):
 *
 * - **Nextcloud**: one field. The hero signs in on their server's own page in their browser
 *   (Login Flow v2), so Bati never sees their password and there is no second field to get wrong.
 * - **Other WebDAV**: address, user, app password. kDrive, Koofr, a NAS, or rclone served on this
 *   phone by Round Sync, which is how Proton Drive and Google Drive get in.
 *
 * Built like `EncryptionSheet`, keyboard lift included.
 */
export function SyncSetupSheet({
  open,
  onClose,
  onConnectNextcloud,
  onCancelNextcloud,
  onConnectDav,
}: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("nextcloud");
  const [waiting, setWaiting] = useState(false);

  const close = () => {
    Keyboard.dismiss();
    if (waiting && mode === "nextcloud") onCancelNextcloud();
    setWaiting(false);
    onClose();
  };

  /** Runs one connection attempt with the sheet in its waiting state; closes it on success. */
  const attempt = (connect: () => Promise<boolean>) => {
    Keyboard.dismiss();
    setWaiting(true);
    connect().then(
      (connected) => {
        setWaiting(false);
        if (connected) onClose();
      },
      () => setWaiting(false),
    );
  };

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={(next: boolean) => (next ? undefined : close())}
      snapPointsMode="fit"
      disableDrag
      moveOnKeyboardChange
      transition={reducedMotion ? undefined : "quick"}
      zIndex={100_000}
    >
      <Sheet.Overlay
        bg="rgba(0,0,0,0.5)"
        transition={reducedMotion ? undefined : "quick"}
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame bg="$surface">
        <YStack px="$4" pt="$4" pb={insets.bottom + 16} gap="$3">
          <XStack items="center" justify="space-between" gap="$3">
            <Text flex={1} fontWeight="700" fontSize={18} color="$text">
              {t("sync.connectTitle")}
            </Text>
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("common.close", "Close")}
              onPress={close}
            >
              <X size={20} color="$textSecondary" />
            </Pressable>
          </XStack>

          {waiting ? null : (
            <XStack gap="$2">
              <Chip
                label={t("sync.modeNextcloud")}
                tone={mode === "nextcloud" ? "primary" : "default"}
                accessibilityState={{ selected: mode === "nextcloud" }}
                onPress={() => setMode("nextcloud")}
              />
              <Chip
                label={t("sync.modeWebdav")}
                tone={mode === "webdav" ? "primary" : "default"}
                accessibilityState={{ selected: mode === "webdav" }}
                onPress={() => setMode("webdav")}
              />
            </XStack>
          )}

          {mode === "nextcloud" ? (
            <NextcloudForm
              waiting={waiting}
              onSubmit={(server) => attempt(() => onConnectNextcloud(server))}
              onCancel={close}
            />
          ) : (
            <WebDavForm
              waiting={waiting}
              onSubmit={(url, user, password) => attempt(() => onConnectDav(url, user, password))}
            />
          )}
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

function NextcloudForm({
  waiting,
  onSubmit,
  onCancel,
}: {
  waiting: boolean;
  onSubmit: (server: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [server, setServer] = useState("");
  const submit = () => {
    if (server.trim() !== "" && !waiting) onSubmit(server);
  };

  return (
    <>
      <Text color="$textSecondary">
        {waiting ? t("sync.connectWaiting") : t("sync.connectIntro")}
      </Text>
      {waiting ? null : (
        <Input
          testID="sync-server"
          minH={44}
          value={server}
          onChangeText={setServer}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          autoFocus
          returnKeyType="go"
          onSubmitEditing={submit}
          placeholder={t("sync.serverPlaceholder")}
          bg="$background"
          borderColor="$borderStrong"
          color="$text"
        />
      )}
      <AppButton
        testID="sync-connect"
        variant={waiting ? "outline" : "primary"}
        disabled={!waiting && server.trim() === ""}
        onPress={waiting ? onCancel : submit}
      >
        {waiting ? t("common.cancel") : t("sync.connectCta")}
      </AppButton>
    </>
  );
}

function WebDavForm({
  waiting,
  onSubmit,
}: {
  waiting: boolean;
  onSubmit: (url: string, user: string, password: string) => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const ready = url.trim() !== "" && user.trim() !== "" && password !== "" && !waiting;
  const submit = () => {
    if (ready) onSubmit(url, user, password);
  };
  const field = {
    minH: 44,
    bg: "$background",
    borderColor: "$borderStrong",
    color: "$text",
  } as const;

  return (
    <>
      <Text color="$textSecondary">{t("sync.webdavIntro")}</Text>
      <Input
        testID="sync-dav-url"
        {...field}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        autoFocus
        placeholder={t("sync.webdavUrlPlaceholder")}
      />
      <Input
        testID="sync-dav-user"
        {...field}
        value={user}
        onChangeText={setUser}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={t("sync.userPlaceholder")}
      />
      <Input
        testID="sync-dav-password"
        {...field}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={submit}
        placeholder={t("sync.appPasswordPlaceholder")}
      />
      <AppButton testID="sync-dav-connect" disabled={!ready} onPress={submit}>
        {waiting ? t("sync.running") : t("sync.webdavCta")}
      </AppButton>
    </>
  );
}
