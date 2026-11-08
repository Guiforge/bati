import * as Clipboard from "expo-clipboard";
import type { TFunction } from "i18next";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
// biome-ignore lint/correctness/useReactNativePlatformComponents: the scanner module is Android only (expo-module.config.json), and so is the camera permission it needs.
import { PermissionsAndroid, Pressable, useWindowDimensions } from "react-native";
import { Text, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { FormSheet } from "@/components/common/FormSheet";
import { Input } from "@/components/common/Input";
import { QrCode } from "@/components/multiplayer/QrCode";
import { useP2pSession } from "@/hooks/useP2pSession";
import { ScannerView } from "@/modules/bati-scanner";
import { groupCode, type PairingCode, readCode, readTypedCode } from "@/src/p2p/code";
import { readLink } from "@/src/p2p/link";
import type { Role, SessionCause, SessionView } from "@/src/p2p/session";
import { reportError } from "@/src/reportError";

type Props = {
  open: boolean;
  /** `pair`: the first link, side by side. `sync`: "Sync now" with the device already linked. */
  mode: "pair" | "sync";
  onClose: () => void;
  /** The link exists and is the sync account now. */
  onLinked: () => void;
};

type Step = "choose" | "show" | "scan" | "type" | "sync";

/** A code that never became a session: the camera read it, and it was no use. */
type LocalEnd = { cause: SessionCause; clock: boolean };

const nowSeconds = () => Math.floor(Date.now() / 1000);
const megabytes = (bytes: number) => (bytes / 1_048_576).toFixed(1);

/**
 * Everything the hero sees of device-to-device sync (SPEC.md section 4): choosing a side, the code
 * or the camera, "Link {name}?", each sync with its progress, and the message and action of every
 * way a session ends. The session itself lives in `useP2pSession`; this is only what it shows.
 */
export function P2pSheet({ open, mode, onClose, onLinked }: Props) {
  const { t } = useTranslation();
  const session = useP2pSession(open, onLinked);
  const [step, setStep] = useState<Step>("choose");
  const [peer, setPeer] = useState("");
  const [localEnd, setLocalEnd] = useState<LocalEnd | null>(null);
  const [asText, setAsText] = useState(false);
  const lastRole = useRef<Role | null>(null);

  const start = (role: Role, next: Step) => {
    lastRole.current = role;
    setLocalEnd(null);
    setAsText(false);
    setStep(next);
    session.begin(role).catch((e) => reportError("p2p.begin", e));
  };

  // "Sync now" has nothing to choose: the link is known, so the session opens with the sheet.
  // biome-ignore lint/correctness/useExhaustiveDependencies: opening is the only trigger.
  useEffect(() => {
    if (!open) return;
    setLocalEnd(null);
    setAsText(false);
    if (mode === "pair") {
      setStep("choose");
      return;
    }
    readLink()
      .then((link) => {
        if (link === null) return setStep("choose");
        setPeer(link.name);
        start({ kind: "sync", link }, "sync");
      })
      .catch((e) => reportError("p2p.link", e));
  }, [open, mode]);

  const close = () => {
    session.stop();
    onClose();
  };

  const found = (code: PairingCode) => {
    setPeer(code.name);
    start({ kind: "scan", code }, "scan");
  };

  const view = session.view;
  const name = (view && "name" in view ? view.name : "") || peer;
  const ended: LocalEnd | null =
    localEnd ?? (view?.step === "ended" ? { cause: view.cause, clock: false } : null);

  const retry = () => {
    const role = lastRole.current;
    if (role !== null) start(role, step);
  };

  const scanned = (text: string) => {
    const read = readCode(text, nowSeconds());
    if (read.ok) return found(read.code);
    setLocalEnd({
      cause: read.reason === "version" ? "versionMismatch" : "codeExpired",
      clock: read.reason === "expired",
    });
  };

  const body = bodyFor({
    mode,
    step,
    view,
    ended,
    name,
    asText,
    session,
    close,
    retry,
    scanned,
    found,
    toggleText: () => setAsText((v) => !v),
    show: () => start({ kind: "show" }, "show"),
    goto: setStep,
    scanAgain: () => {
      session.stop();
      setLocalEnd(null);
      setStep("scan");
    },
  });

  return (
    <FormSheet open={open} title={t("p2p.title")} onClose={close}>
      {body}
    </FormSheet>
  );
}

type Ctx = {
  mode: Props["mode"];
  step: Step;
  view: SessionView | null;
  ended: LocalEnd | null;
  name: string;
  asText: boolean;
  session: ReturnType<typeof useP2pSession>;
  close: () => void;
  retry: () => void;
  scanned: (text: string) => void;
  found: (code: PairingCode) => void;
  toggleText: () => void;
  show: () => void;
  goto: (step: Step) => void;
  scanAgain: () => void;
};

/** What the sheet shows, from where the hero is (`step`) and what the session says (`view`). */
function bodyFor(c: Ctx): ReactNode {
  const { view, session } = c;
  if (session.notice !== null)
    return <Notice offline={session.notice === "offline"} onRetry={c.retry} />;
  if (c.ended !== null) {
    // The hero's own cancel closes the sheet; nothing is left to say.
    if (c.ended.cause === "cancelled") return null;
    return (
      <Ended
        cause={c.ended.cause}
        clock={c.ended.clock}
        name={c.name}
        step={c.step}
        onRetry={c.retry}
        onNewCode={c.show}
        onScanAgain={c.scanAgain}
      />
    );
  }
  if (c.step === "choose") return <Choose onShow={c.show} onScan={() => c.goto("scan")} />;
  if (view === null && c.step === "scan")
    return <ScanStep onCode={c.scanned} onType={() => c.goto("type")} />;
  if (view === null && c.step === "type") return <TypeStep onCode={c.found} />;
  if (view?.step === "code")
    return <ShowCode text={view.text} asText={c.asText} onToggle={c.toggleText} />;
  if (view?.step === "confirm")
    return (
      <Confirm
        name={view.name}
        suffix={view.suffix}
        again={view.again}
        onAnswer={(yes) => session.confirm(yes)}
      />
    );
  if (view?.step === "waiting" && c.step !== "show")
    return <Waiting sync={c.mode === "sync"} name={c.name} onCancel={c.close} />;
  if (view?.step === "connected" || view?.step === "receiving")
    return (
      <Syncing
        view={view}
        linked={session.linked}
        done={session.done}
        name={c.name}
        onClose={c.close}
      />
    );
  return null;
}

function Notice({ offline, onRetry }: { offline: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Message testID="p2p-notice" text={t(offline ? "p2p.offline" : "p2p.finishSession")}>
      {offline ? (
        <AppButton testID="p2p-retry" onPress={onRetry}>
          {t("p2p.tryAgain")}
        </AppButton>
      ) : null}
    </Message>
  );
}

function Confirm({
  name,
  suffix,
  again,
  onAnswer,
}: {
  name: string;
  suffix: string;
  again: boolean;
  onAnswer: (yes: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <YStack gap="3">
      <Text testID="p2p-confirm" color="text" fontSize="5" accessibilityLiveRegion="polite">
        {again ? t("p2p.confirmAgain", { name }) : t("p2p.confirm", { name, suffix })}
      </Text>
      <AppButton testID="p2p-link" onPress={() => onAnswer(true)}>
        {t("p2p.confirmCta")}
      </AppButton>
      <TextLink testID="p2p-not-this" onPress={() => onAnswer(false)}>
        {t("p2p.notThis")}
      </TextLink>
    </YStack>
  );
}

function Waiting({ sync, name, onCancel }: { sync: boolean; name: string; onCancel: () => void }) {
  const { t } = useTranslation();
  return (
    <Message
      testID="p2p-waiting"
      text={sync ? t("p2p.waitOther", { name }) : t("p2p.waitConfirm", { name })}
    >
      <AppButton testID="p2p-cancel" variant="outline" onPress={onCancel}>
        {t("common.cancel")}
      </AppButton>
    </Message>
  );
}

function Syncing({
  view,
  linked,
  done,
  name,
  onClose,
}: {
  view: Extract<SessionView, { step: "connected" | "receiving" }>;
  linked: string | null;
  done: boolean;
  name: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <YStack gap="3">
      {linked !== null ? (
        <Text testID="p2p-linked" color="text" fontSize="5">
          {t("p2p.linked", { name: linked })}
        </Text>
      ) : null}
      {done ? (
        <>
          <Text testID="p2p-done" color="text" accessibilityLiveRegion="polite">
            {t("p2p.done", { name })}
          </Text>
          <AppButton testID="p2p-close" onPress={onClose}>
            {t("common.close")}
          </AppButton>
        </>
      ) : (
        <>
          <Text testID="p2p-syncing" color="text" accessibilityLiveRegion="polite">
            {t("p2p.syncing", { name })}
          </Text>
          {view.step === "receiving" ? (
            <Text testID="p2p-progress" color="textSecondary">
              {t("p2p.progress", { done: megabytes(view.done), total: megabytes(view.total) })}
            </Text>
          ) : null}
          <AppButton testID="p2p-cancel" variant="outline" onPress={onClose}>
            {t("common.cancel")}
          </AppButton>
        </>
      )}
    </YStack>
  );
}

function Choose({ onShow, onScan }: { onShow: () => void; onScan: () => void }) {
  const { t } = useTranslation();
  return (
    <YStack gap="3">
      <Text color="textSecondary">{t("p2p.chooseHelp")}</Text>
      <AppButton testID="p2p-show" onPress={onShow}>
        {t("p2p.chooseShow")}
      </AppButton>
      <AppButton testID="p2p-scan" variant="outline" onPress={onScan}>
        {t("p2p.chooseScan")}
      </AppButton>
    </YStack>
  );
}

function Message({
  text,
  testID,
  children,
}: {
  text: string;
  testID: string;
  children?: ReactNode;
}) {
  return (
    <YStack gap="3">
      <Text testID={testID} color="text" accessibilityLiveRegion="polite">
        {text}
      </Text>
      {children}
    </YStack>
  );
}

function TextLink({
  children,
  onPress,
  testID,
}: {
  children: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress}>
      <Text color="textSecondary" fontSize="3" textDecorationLine="underline" py="2">
        {children}
      </Text>
    </Pressable>
  );
}

/** A: the code, as a picture or as text for TalkBack and for a camera that will not focus. */
function ShowCode({
  text,
  asText,
  onToggle,
}: {
  text: string;
  asText: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [copied, setCopied] = useState(false);
  // 60 % of the width at most, so the button under it stays in reach at 200 % text size.
  const size = Math.min(280, Math.round(width * 0.6));
  return (
    <YStack gap="3" items="center">
      <Text color="text" style={{ textAlign: "center" }}>
        {t("p2p.showIntro")}
      </Text>
      {asText ? (
        <>
          <Text
            testID="p2p-code-text"
            color="text"
            fontSize="5"
            select="text"
            style={{ textAlign: "center" }}
          >
            {groupCode(text)}
          </Text>
          <AppButton
            testID="p2p-copy"
            variant="outline"
            onPress={() => {
              Clipboard.setStringAsync(groupCode(text)).then(
                () => setCopied(true),
                (e: unknown) => reportError("p2p.copy", e),
              );
            }}
          >
            {copied ? t("p2p.copied") : t("p2p.copy")}
          </AppButton>
        </>
      ) : (
        <YStack accessible accessibilityLabel={t("p2p.qrName")}>
          <QrCode value={text} size={size} />
        </YStack>
      )}
      <Text color="textSecondary" fontSize="3" style={{ textAlign: "center" }}>
        {t("p2p.qrNote")}
      </Text>
      {asText ? null : (
        <TextLink testID="p2p-as-text" onPress={onToggle}>
          {t("p2p.showText")}
        </TextLink>
      )}
    </YStack>
  );
}

/** B: the camera, opened only here and only once the system said yes. */
function ScanStep({ onCode, onType }: { onCode: (text: string) => void; onType: () => void }) {
  const { t } = useTranslation();
  const [camera, setCamera] = useState<"asking" | "granted" | "refused">("asking");
  const ask = () => {
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA).then(
      (answer) => setCamera(answer === PermissionsAndroid.RESULTS.GRANTED ? "granted" : "refused"),
      (e: unknown) => {
        reportError("p2p.camera", e);
        setCamera("refused");
      },
    );
  };
  useEffect(ask, []);
  return (
    <YStack gap="3">
      <Text color="text" fontSize="5">
        {t("p2p.scanTitle")}
      </Text>
      {camera === "granted" ? (
        <YStack height={280} overflow="hidden" rounded="3">
          <ScannerView
            testID="p2p-scanner"
            style={{ flex: 1 }}
            onScan={(event) => onCode(event.nativeEvent.text)}
            onCameraError={(event) => {
              reportError("p2p.camera", new Error(event.nativeEvent.message));
              setCamera("refused");
            }}
          />
        </YStack>
      ) : null}
      {camera === "refused" ? (
        <>
          <Text testID="p2p-camera-refused" color="textSecondary">
            {t("p2p.cameraNeeded")}
          </Text>
          <AppButton testID="p2p-allow-camera" onPress={ask}>
            {t("p2p.allowCamera")}
          </AppButton>
        </>
      ) : null}
      <TextLink testID="p2p-type-link" onPress={onType}>
        {t("p2p.typeLink")}
      </TextLink>
    </YStack>
  );
}

/** B: the code as text. A typo names its group and leaves the field as it was. */
function TypeStep({ onCode }: { onCode: (code: PairingCode) => void }) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState("");
  const [problem, setProblem] = useState<ReactNode>(null);
  const submit = () => {
    const read = readTypedCode(typed, nowSeconds());
    if (read.ok) return onCode(read.code);
    setProblem(
      read.reason === "typo"
        ? t("p2p.typo", { n: read.group })
        : read.reason === "version"
          ? t("p2p.versionMismatch")
          : `${t("p2p.codeExpired")} ${t("p2p.clockHint")}`,
    );
  };
  return (
    <YStack gap="3">
      <Text color="text">{t("p2p.typeHint")}</Text>
      <Input
        testID="p2p-type-field"
        minH={44}
        bg="background"
        borderColor="borderStrong"
        color="text"
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        py={8}
        value={typed}
        onChangeText={(v) => {
          setTyped(v);
          setProblem(null);
        }}
      />
      {problem === null ? null : (
        <Text testID="p2p-type-problem" color="error" accessibilityLiveRegion="polite">
          {problem}
        </Text>
      )}
      <AppButton testID="p2p-type-use" disabled={typed.trim() === ""} onPress={submit}>
        {t("p2p.typeCta")}
      </AppButton>
    </YStack>
  );
}

/** How a session ended, in the words of SPEC.md section 4, with the one action that fits. */
function Ended({
  cause,
  clock,
  name,
  step,
  onRetry,
  onNewCode,
  onScanAgain,
}: {
  cause: SessionCause;
  clock: boolean;
  name: string;
  step: Step;
  onRetry: () => void;
  onNewCode: () => void;
  onScanAgain: () => void;
}) {
  const { t } = useTranslation();
  const shower = step === "show";
  const text = endedText(t, cause, shower, name);
  // Linked before, now unknown to the other side: the reinstall hint belongs to a sync, not a first link.
  const hint = cause === "notInSight" && step === "sync" ? t("p2p.notInSightHint", { name }) : null;
  const action = endedAction(t, cause, shower, { onRetry, onNewCode, onScanAgain });
  return (
    <YStack gap="3">
      <Text testID={`p2p-ended-${cause}`} color="text" accessibilityLiveRegion="polite">
        {text}
      </Text>
      {clock ? (
        <Text testID="p2p-clock" color="textSecondary">
          {t("p2p.clockHint")}
        </Text>
      ) : null}
      {hint ? (
        <Text testID="p2p-hint" color="textSecondary">
          {hint}
        </Text>
      ) : null}
      {action ? (
        <AppButton testID="p2p-action" onPress={action.run}>
          {action.label}
        </AppButton>
      ) : null}
    </YStack>
  );
}

function endedText(t: TFunction, cause: SessionCause, shower: boolean, name: string): string {
  if (cause === "codeExpired" && shower) return t("p2p.expired");
  return t(`p2p.${cause}`, { name });
}

/** The one action a cause allows; the update message has none, and a code that died is replaced, not retried. */
function endedAction(
  t: TFunction,
  cause: SessionCause,
  shower: boolean,
  on: { onRetry: () => void; onNewCode: () => void; onScanAgain: () => void },
): { label: string; run: () => void } | null {
  if (cause === "versionMismatch") return null;
  if (cause !== "codeExpired") return { label: t("p2p.tryAgain"), run: on.onRetry };
  return shower
    ? { label: t("p2p.newCode"), run: on.onNewCode }
    : { label: t("p2p.scanAgain"), run: on.onScanAgain };
}
