import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Pressable } from "react-native";
import { Input, Text, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { FormSheet } from "@/components/common/FormSheet";

type Props = {
  open: boolean;
  onClose: () => void;
  /**
   * Onboarding asks where Bati already is on the other device; Settings asks where to keep it.
   * The file hand-off also points at a different door in each: "I already have a backup" there,
   * "Restore a backup" here.
   */
  context: "onboarding" | "settings";
  /** Resolve to `true` once the server accepted the hero; the sheet then closes. */
  onConnectNextcloud: (server: string) => Promise<boolean>;
  onCancelNextcloud: () => void;
  onConnectDav: (url: string, user: string, password: string, label?: string) => Promise<boolean>;
  /** A folder another app keeps in step: `uri` for one already granted, else the system picker. */
  onConnectFolder: (uri?: string) => Promise<boolean>;
  /** The automatic backup's folder, when there is one: it can carry sync too, in one tap. */
  backupFolder?: { uri: string; label: string } | null;
};

/** Where Round Sync serves rclone to Bati, on the phone itself. */
const ROUND_SYNC_URL = "http://127.0.0.1:8080";

/**
 * The name the Settings row shows for a WebDAV address, when it is one a hero would recognise.
 * These were buttons once, one per provider; they only ever filled in an address, so they are an
 * address the form recognises instead.
 */
function webdavLabelFor(url: string): string | undefined {
  if (/koofr\.net/i.test(url)) return "Koofr";
  if (/kdrive|infomaniak/i.test(url)) return "kDrive";
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/i.test(url)) return "Round Sync";
  return undefined;
}

type Mode = "nextcloud" | "webdav" | "folder";
type Step = { kind: "pick" } | { kind: "form"; mode: Mode } | { kind: "notListed" };

/**
 * Where device sync goes: three ways to connect, because there are three, and one line for every
 * cloud Bati cannot reach. Ten chips named for services, half of which led to "not yet", were a
 * promise followed by a no; kDrive and Koofr were WebDAV with the address filled in, and Round
 * Sync was an app, not a place (docs/design/audits/2026-09-26-sync-journeys.md, B4).
 *
 * - **Nextcloud**: one field; the hero signs in on their server's own page in their browser
 *   (Login Flow v2), so Bati never sees their password.
 * - **WebDAV server**: address, user, app password; the usual addresses are written under it.
 * - **A synced folder**: a folder Syncthing (or any folder-syncing app) keeps the same on every
 *   device; the automatic backup's folder can be it.
 */
export function SyncSetupSheet({
  open,
  onClose,
  context,
  onConnectNextcloud,
  onCancelNextcloud,
  onConnectDav,
  onConnectFolder,
  backupFolder,
}: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [waiting, setWaiting] = useState(false);
  // Kept across steps, so going back does not lose what was typed.
  const [server, setServer] = useState("");
  const [url, setUrl] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");

  const close = () => {
    if (waiting && step.kind === "form" && step.mode === "nextcloud") onCancelNextcloud();
    setWaiting(false);
    setStep({ kind: "pick" });
    onClose();
  };

  /** One connection attempt with the sheet in its waiting state; closes it on success. */
  const attempt = (connect: () => Promise<boolean>) => {
    Keyboard.dismiss();
    setWaiting(true);
    connect().then(
      (connected) => {
        setWaiting(false);
        if (connected) {
          setStep({ kind: "pick" });
          onClose();
        }
      },
      () => setWaiting(false),
    );
  };

  const back = () => setStep({ kind: "pick" });

  /** The form of the chosen way: a folder, a Nextcloud sign-in, or a WebDAV address. */
  const form = (mode: Mode) =>
    mode === "folder" ? (
      <FolderForm
        waiting={waiting}
        backupFolder={backupFolder ?? null}
        onPick={(uri) => attempt(() => onConnectFolder(uri))}
      />
    ) : mode === "nextcloud" ? (
      <NextcloudForm
        waiting={waiting}
        server={server}
        onServer={setServer}
        onSubmit={() => attempt(() => onConnectNextcloud(server))}
        onCancel={close}
      />
    ) : (
      <WebDavForm
        waiting={waiting}
        fields={{ url, user, password }}
        setters={{ url: setUrl, user: setUser, password: setPassword }}
        onSubmit={() => attempt(() => onConnectDav(url, user, password, webdavLabelFor(url)))}
      />
    );

  return (
    <FormSheet open={open} title={t("sync.connectTitle")} onClose={close}>
      {step.kind === "pick" ? (
        <Doors
          context={context}
          backupFolder={backupFolder ?? null}
          onDoor={(mode) => setStep({ kind: "form", mode })}
          onNotListed={() => setStep({ kind: "notListed" })}
        />
      ) : step.kind === "notListed" ? (
        <NotListed
          context={context}
          onRoundSync={() => {
            if (url === "") setUrl(ROUND_SYNC_URL);
            setStep({ kind: "form", mode: "webdav" });
          }}
          onBack={back}
        />
      ) : (
        <>
          {form(step.mode)}
          {waiting ? null : (
            <AppButton testID="sync-other-service" variant="outline" onPress={back}>
              {t("sync.pick.back")}
            </AppButton>
          )}
        </>
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

function Doors({
  context,
  backupFolder,
  onDoor,
  onNotListed,
}: {
  context: "onboarding" | "settings";
  backupFolder: { label: string } | null;
  onDoor: (mode: Mode) => void;
  onNotListed: () => void;
}) {
  const { t } = useTranslation();
  const doors: { mode: Mode; title: string; note: string }[] = [
    {
      mode: "nextcloud",
      title: t("sync.pick.doorNextcloud"),
      note: t("sync.pick.doorNextcloudNote"),
    },
    { mode: "webdav", title: t("sync.pick.doorWebdav"), note: t("sync.pick.doorWebdavNote") },
    {
      mode: "folder",
      title: t("sync.pick.doorFolder"),
      note: backupFolder
        ? t("sync.pick.doorFolderBackupNote", { folder: backupFolder.label })
        : t("sync.pick.doorFolderNote"),
    },
  ];
  return (
    <>
      <Text color="$textSecondary">
        {context === "onboarding" ? t("sync.pick.whereIsIt") : t("sync.pick.whereToKeep")}
      </Text>
      {doors.map((door) => (
        <YStack key={door.mode} gap="$1">
          <AppButton
            testID={`sync-door-${door.mode}`}
            variant="outline"
            onPress={() => onDoor(door.mode)}
          >
            {door.title}
          </AppButton>
          <Text color="$textSecondary" fontSize="$2" px="$2">
            {door.note}
          </Text>
        </YStack>
      ))}
      <Pressable testID="sync-not-listed" accessibilityRole="button" onPress={onNotListed}>
        <Text color="$textSecondary" fontSize="$3" textDecorationLine="underline" py="$2">
          {t("sync.pick.notListed")}
        </Text>
      </Pressable>
    </>
  );
}

/**
 * For a cloud Bati cannot reach: the two ways that work today, in steps. Moving once goes through
 * the backup file, which every cloud and every share sheet carries; staying in step goes through
 * Round Sync, which serves the cloud to Bati over WebDAV on the phone itself.
 */
function NotListed({
  context,
  onRoundSync,
  onBack,
}: {
  context: "onboarding" | "settings";
  onRoundSync: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const service = t("sync.pick.yourCloud");
  return (
    <>
      <Text testID="sync-handoff" color="$text">
        {t("sync.handoff.intro")}
      </Text>
      <Text color="$text" fontWeight="700">
        {t("sync.handoff.onceTitle")}
      </Text>
      <Text color="$textSecondary">
        {context === "onboarding"
          ? t("sync.handoff.onceOnboarding", { service })
          : t("sync.handoff.onceSettings", { service })}
      </Text>
      <Text color="$text" fontWeight="700">
        {t("sync.handoff.stepTitle")}
      </Text>
      <Text color="$textSecondary">{t("sync.handoff.step", { service })}</Text>
      <AppButton testID="sync-handoff-roundsync" variant="outline" onPress={onRoundSync}>
        {t("sync.handoff.roundSyncCta")}
      </AppButton>
      <AppButton testID="sync-handoff-back" variant="secondary" onPress={onBack}>
        {t("sync.pick.back")}
      </AppButton>
    </>
  );
}

/**
 * A folder another app keeps in step: no server, no password. The automatic backup's folder is
 * offered first when there is one, because a hero who already put it in a Syncthing folder should
 * not have to find it a second time in a picker.
 */
function FolderForm({
  waiting,
  backupFolder,
  onPick,
}: {
  waiting: boolean;
  backupFolder: { uri: string; label: string } | null;
  onPick: (uri?: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Text color="$textSecondary">{t("sync.folder.intro")}</Text>
      <Text color="$textSecondary" fontSize="$3">
        {t("sync.folder.versioning")}
      </Text>
      {backupFolder ? (
        <AppButton
          testID="sync-folder-use-backup"
          disabled={waiting}
          onPress={() => onPick(backupFolder.uri)}
        >
          {waiting
            ? t("sync.checking")
            : t("sync.folder.useBackup", { folder: backupFolder.label })}
        </AppButton>
      ) : null}
      <AppButton
        testID="sync-folder-pick"
        variant={backupFolder ? "outline" : "primary"}
        disabled={waiting}
        onPress={() => onPick()}
      >
        {waiting && !backupFolder
          ? t("sync.checking")
          : backupFolder
            ? t("sync.folder.pickOther")
            : t("sync.folder.pick")}
      </AppButton>
    </>
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
  waiting,
  fields,
  setters,
  onSubmit,
}: {
  waiting: boolean;
  fields: DavFields;
  setters: { [K in keyof DavFields]: (value: string) => void };
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  const ready =
    fields.url.trim() !== "" && fields.user.trim() !== "" && fields.password !== "" && !waiting;
  // Round Sync's password is the one set in Round Sync, not an app password.
  const roundSync = webdavLabelFor(fields.url) === "Round Sync";
  return (
    <>
      <Text color="$textSecondary">{t("sync.webdavIntro")}</Text>
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
      <Text testID="sync-dav-addresses" color="$textSecondary" fontSize="$2" selectable>
        {t("sync.webdavAddresses")}
      </Text>
      <AppButton testID="sync-dav-connect" disabled={!ready} onPress={onSubmit}>
        {waiting ? t("sync.checking") : t("sync.webdavCta")}
      </AppButton>
    </>
  );
}
