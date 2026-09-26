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
  /** Opens the system folder picker for a folder Syncthing replicates. */
  onConnectFolder: () => Promise<boolean>;
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

type Mode = "nextcloud" | "folder" | (typeof PRESETS)[number]["id"];

/**
 * The first question, in the names a hero knows: a non-technical hero stopped at a row of chips
 * that said Nextcloud, kDrive, Koofr, Round Sync and WebDAV, none of them the cloud she had
 * (docs/design/audits/2026-09-26-sync-journeys.md, B4). Services Bati cannot reach directly lead
 * to the two ways that do work, written out.
 */
const SERVICES = [
  { id: "nextcloud", label: "Nextcloud", mode: "nextcloud" },
  { id: "kdrive", label: "kDrive", mode: "kdrive" },
  { id: "koofr", label: "Koofr", mode: "koofr" },
  { id: "gdrive", label: "Google Drive", mode: null },
  { id: "proton", label: "Proton Drive", mode: null },
  { id: "onedrive", label: "OneDrive", mode: null },
  { id: "dropbox", label: "Dropbox", mode: null },
  { id: "icloud", label: "iCloud", mode: null },
  { id: "syncthing", label: "Syncthing", mode: "folder" },
  { id: "other", label: null, mode: "other" },
  { id: "unknown", label: null, mode: null },
] as const satisfies readonly { id: string; label: string | null; mode: Mode | null }[];

type Service = (typeof SERVICES)[number];
type Step = { kind: "pick" } | { kind: "form" } | { kind: "handoff"; service: Service };

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
  context,
  onConnectNextcloud,
  onCancelNextcloud,
  onConnectDav,
  onConnectFolder,
}: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("nextcloud");
  const [step, setStep] = useState<Step>({ kind: "pick" });
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
    setStep({ kind: "pick" });
    onClose();
  };

  const choose = (service: Service) => {
    if (service.mode === null) {
      setStep({ kind: "handoff", service });
      return;
    }
    pick(service.mode);
    setStep({ kind: "form" });
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
        if (connected) {
          setStep({ kind: "pick" });
          onClose();
        }
      },
      () => setWaiting(false),
    );
  };

  /** The form of the chosen service: a folder, a Nextcloud sign-in, or a WebDAV address. */
  const form = () =>
    mode === "folder" ? (
      <FolderForm waiting={waiting} onPick={() => attempt(onConnectFolder)} />
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
        hint={t(preset?.hint ?? "sync.webdavIntro")}
        roundSync={mode === "roundSync"}
        waiting={waiting}
        fields={{ url, user, password }}
        setters={{ url: setUrl, user: setUser, password: setPassword }}
        onSubmit={() => attempt(() => onConnectDav(url, user, password, preset?.label))}
      />
    );

  return (
    <FormSheet open={open} title={t("sync.connectTitle")} onClose={close}>
      {step.kind === "pick" ? (
        <ServicePicker context={context} onChoose={choose} />
      ) : step.kind === "handoff" ? (
        <Handoff
          context={context}
          service={step.service}
          onRoundSync={() => {
            pick("roundSync");
            setStep({ kind: "form" });
          }}
          onBack={() => setStep({ kind: "pick" })}
        />
      ) : (
        <>
          {waiting || mode === "folder" ? null : <ModeChips mode={mode} onPick={pick} />}
          {form()}
          {waiting ? null : (
            <AppButton
              testID="sync-other-service"
              variant="outline"
              onPress={() => setStep({ kind: "pick" })}
            >
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

function ServicePicker({
  context,
  onChoose,
}: {
  context: "onboarding" | "settings";
  onChoose: (service: Service) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Text color="$textSecondary">
        {context === "onboarding" ? t("sync.pick.whereIsIt") : t("sync.pick.whereToKeep")}
      </Text>
      <XStack gap="$2" flexWrap="wrap">
        {SERVICES.map((service) => (
          <Chip
            key={service.id}
            testID={`sync-service-${service.id}`}
            label={service.label ?? t(`sync.pick.${service.id}`)}
            onPress={() => onChoose(service)}
          />
        ))}
      </XStack>
    </>
  );
}

/**
 * For a cloud Bati cannot reach: the two ways that work today, in steps. Moving once goes through
 * the backup file, which every cloud and every share sheet carries; staying in step goes through
 * Round Sync, which serves the cloud to Bati over WebDAV on the phone itself.
 */
function Handoff({
  context,
  service,
  onRoundSync,
  onBack,
}: {
  context: "onboarding" | "settings";
  service: Service;
  onRoundSync: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const name = service.label ?? t("sync.pick.yourCloud");
  return (
    <>
      <Text testID="sync-handoff" color="$text">
        {service.id === "unknown"
          ? t("sync.handoff.unknown")
          : t("sync.handoff.intro", { service: name })}
      </Text>
      <Text color="$text" fontWeight="700">
        {t("sync.handoff.onceTitle")}
      </Text>
      <Text color="$textSecondary">
        {context === "onboarding"
          ? t("sync.handoff.onceOnboarding", { service: name })
          : t("sync.handoff.onceSettings", { service: name })}
      </Text>
      {service.id === "unknown" ? null : (
        <>
          <Text color="$text" fontWeight="700">
            {t("sync.handoff.stepTitle")}
          </Text>
          <Text color="$textSecondary">{t("sync.handoff.step", { service: name })}</Text>
          <AppButton testID="sync-handoff-roundsync" variant="outline" onPress={onRoundSync}>
            {t("sync.handoff.roundSyncCta")}
          </AppButton>
        </>
      )}
      <AppButton testID="sync-handoff-back" variant="secondary" onPress={onBack}>
        {t("sync.pick.back")}
      </AppButton>
    </>
  );
}

/** A folder Syncthing keeps in step: no server, no password, one system picker. */
function FolderForm({ waiting, onPick }: { waiting: boolean; onPick: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      <Text color="$textSecondary">{t("sync.folder.intro")}</Text>
      <Text color="$textSecondary" fontSize="$3">
        {t("sync.folder.versioning")}
      </Text>
      <AppButton testID="sync-folder-pick" disabled={waiting} onPress={onPick}>
        {waiting ? t("sync.checking") : t("sync.folder.pick")}
      </AppButton>
    </>
  );
}

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
