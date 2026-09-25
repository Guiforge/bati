import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";
import { Input, Text, XStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Chip } from "@/components/common/Chip";
import { FormSheet } from "@/components/common/FormSheet";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Resolve to `true` once the server accepted the hero; the sheet then closes. */
  onConnectNextcloud: (server: string) => Promise<boolean>;
  onCancelNextcloud: () => void;
  onConnectDav: (url: string, user: string, password: string, label?: string) => Promise<boolean>;
};

/**
 * WebDAV servers a hero is likely to have, so the address is not theirs to find. The label is
 * what the Settings row says afterwards. `roundSync` is rclone served on this phone, which is how
 * Proton Drive and Google Drive get in; its password is the one set in Round Sync, not an app
 * password, hence its own hint.
 */
const PRESETS = [
  { id: "kdrive", label: "kDrive", url: "https://", hint: "sync.presetKdrive" },
  { id: "koofr", label: "Koofr", url: "https://app.koofr.net/dav/Koofr", hint: "sync.presetKoofr" },
  {
    id: "roundSync",
    label: "Round Sync",
    url: "http://127.0.0.1:8080",
    hint: "sync.presetRoundSync",
  },
  { id: "other", label: undefined, url: "", hint: "sync.webdavIntro" },
] as const;

type Mode = "nextcloud" | (typeof PRESETS)[number]["id"];

/**
 * Where device sync goes. Two doors to the same WebDAV transport (src/cloudSync.ts):
 *
 * - **Nextcloud**: one field. The hero signs in on their server's own page in their browser
 *   (Login Flow v2), so Bati never sees their password and there is no second field to get wrong.
 * - **Other WebDAV**, behind presets: address, user, password.
 */
export function SyncSetupSheet({
  open,
  onClose,
  onConnectNextcloud,
  onCancelNextcloud,
  onConnectDav,
}: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("nextcloud");
  const [waiting, setWaiting] = useState(false);
  // Lifted here so that switching presets keeps what was typed.
  const [server, setServer] = useState("");
  const [url, setUrl] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const preset = PRESETS.find((p) => p.id === mode);

  const close = () => {
    if (waiting && mode === "nextcloud") onCancelNextcloud();
    setWaiting(false);
    onClose();
  };

  const pick = (next: Mode) => {
    setMode(next);
    const chosen = PRESETS.find((p) => p.id === next);
    if (chosen && (url === "" || PRESETS.some((p) => p.url === url))) setUrl(chosen.url);
  };

  /** One connection attempt with the sheet in its waiting state; closes it on success. */
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
    <FormSheet open={open} title={t("sync.connectTitle")} onClose={close}>
      {waiting ? null : <ModeChips mode={mode} onPick={pick} />}
      {mode === "nextcloud" ? (
        <NextcloudForm
          waiting={waiting}
          server={server}
          onServer={setServer}
          onSubmit={() => attempt(() => onConnectNextcloud(server))}
          onCancel={close}
        />
      ) : (
        <WebDavForm
          hint={t(preset?.hint ?? "sync.webdavIntro")}
          roundSync={mode === "roundSync"}
          waiting={waiting}
          fields={{ url, user, password }}
          setters={{ url: setUrl, user: setUser, password: setPassword }}
          onSubmit={() => attempt(() => onConnectDav(url, user, password, preset?.label))}
        />
      )}
    </FormSheet>
  );
}

const FIELD = {
  minH: 44,
  bg: "$background",
  borderColor: "$borderStrong",
  color: "$text",
  autoCapitalize: "none",
  autoCorrect: false,
} as const;

function ModeChips({ mode, onPick }: { mode: Mode; onPick: (next: Mode) => void }) {
  const { t } = useTranslation();
  return (
    <XStack gap="$2" flexWrap="wrap">
      <Chip
        label={t("sync.modeNextcloud")}
        tone={mode === "nextcloud" ? "primary" : "default"}
        accessibilityState={{ selected: mode === "nextcloud" }}
        onPress={() => onPick("nextcloud")}
      />
      {PRESETS.map((p) => (
        <Chip
          key={p.id}
          label={p.label ?? t("sync.modeWebdav")}
          tone={mode === p.id ? "primary" : "default"}
          accessibilityState={{ selected: mode === p.id }}
          onPress={() => onPick(p.id)}
        />
      ))}
    </XStack>
  );
}

function NextcloudForm({
  waiting,
  server,
  onServer,
  onSubmit,
  onCancel,
}: {
  waiting: boolean;
  server: string;
  onServer: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const ready = server.trim() !== "";
  return (
    <>
      <Text color="$textSecondary">
        {waiting ? t("sync.connectWaiting") : t("sync.connectIntro")}
      </Text>
      {waiting ? null : (
        <Input
          testID="sync-server"
          {...FIELD}
          value={server}
          onChangeText={onServer}
          keyboardType="url"
          autoFocus
          returnKeyType="go"
          onSubmitEditing={() => ready && onSubmit()}
          placeholder={t("sync.serverPlaceholder")}
        />
      )}
      <AppButton
        testID="sync-connect"
        variant={waiting ? "outline" : "primary"}
        disabled={!waiting && !ready}
        onPress={waiting ? onCancel : onSubmit}
      >
        {waiting ? t("common.cancel") : t("sync.connectCta")}
      </AppButton>
    </>
  );
}

type DavFields = { url: string; user: string; password: string };

function WebDavForm({
  hint,
  roundSync,
  waiting,
  fields,
  setters,
  onSubmit,
}: {
  hint: string;
  roundSync: boolean;
  waiting: boolean;
  fields: DavFields;
  setters: { [K in keyof DavFields]: (value: string) => void };
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  const ready =
    fields.url.trim() !== "" && fields.user.trim() !== "" && fields.password !== "" && !waiting;
  return (
    <>
      <Text color="$textSecondary">{hint}</Text>
      <Input
        testID="sync-dav-url"
        {...FIELD}
        value={fields.url}
        onChangeText={setters.url}
        keyboardType="url"
        placeholder={t("sync.webdavUrlPlaceholder")}
      />
      <Input
        testID="sync-dav-user"
        {...FIELD}
        value={fields.user}
        onChangeText={setters.user}
        placeholder={t("sync.userPlaceholder")}
      />
      <Input
        testID="sync-dav-password"
        {...FIELD}
        value={fields.password}
        onChangeText={setters.password}
        secureTextEntry
        returnKeyType="go"
        onSubmitEditing={() => ready && onSubmit()}
        placeholder={
          roundSync ? t("sync.roundSyncPasswordPlaceholder") : t("sync.appPasswordPlaceholder")
        }
      />
      <AppButton testID="sync-dav-connect" disabled={!ready} onPress={onSubmit}>
        {waiting ? t("sync.checking") : t("sync.webdavCta")}
      </AppButton>
    </>
  );
}
