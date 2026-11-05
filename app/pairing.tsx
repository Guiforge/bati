import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
// biome-ignore lint/correctness/useReactNativePlatformComponents: the scanner module is Android only (expo-module.config.json), and so is the one screen that opens it.
import { PermissionsAndroid, ScrollView, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Input } from "@/components/common/Input";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { QrCode } from "@/components/multiplayer/QrCode";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { setDuel } from "@/db/duo";
import {
  acceptInvite,
  acceptLinkInvite,
  cancelInvite,
  completeLinkInvite,
  createLinkInvite,
  createPair,
  listInvites,
  listPairs,
  MAX_PAIRS,
  type Pair,
  unlinkPair,
} from "@/db/pairs";
import { ScannerView } from "@/modules/bati-scanner";
import { weekStart } from "@/src/multiplayer/duoWeek";
import { MULTIPLAYER_ENABLED } from "@/src/multiplayer/flag";
import { encodeInvite, type Invite } from "@/src/multiplayer/invite";
import { linkFor, takeIncomingLink } from "@/src/multiplayer/link";
import { encodeLinkInvite, type LinkInvite } from "@/src/multiplayer/linkInvite";
import { type Received, readCode, type TakenWeek, takeWeeks } from "@/src/multiplayer/received";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * Companions (multiplayer lot 1, LOT1-SPEC.md § 5.5): invite face to face or by message, join, the
 * list with its duel switch and unlink, the invitations waiting, and whatever a code or a link
 * brought. Nothing it receives changes anything until the hero says so, except a companion's week,
 * which is kept and said (E5).
 *
 * A code shown in the room holds the pair's secret: that one never reaches a share sheet.
 */
const NAME_MAX = 40;

/** What a received code asks of the hero before anything is written, if it asks anything. */
function askingOf(received: Received | null): "received_reply" | "received_invite" | null {
  if (received === null) return null;
  return received.kind === "reply" ? "received_reply" : "received_invite";
}

/** A pairing that did not happen, as the screen says it. */
function refusal(outcome: string): string {
  if (outcome === "full") return "refused.full";
  return outcome === "known" ? "refused.alreadyCompanion" : "refused.damaged";
}

/** What the screen says, by locale key under `duo.`, with what it needs. */
type Note = { key: string; values?: Record<string, string | number> };

export default function PairingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const { n } = useLocalSearchParams<{ n?: string }>();
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [invites, setInvites] = useState<{ id: string; madeAt: Date }[]>([]);
  const [name, setName] = useState("");
  const [faceCode, setFaceCode] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [received, setReceived] = useState<Received | null>(null);
  const [taken, setTaken] = useState<TakenWeek[] | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [busy, setBusy] = useState<"preparing" | "reading" | null>(null);

  const date = (at: Date) =>
    getDateTimeFormat(language, { day: "numeric", month: "short" }).format(at);
  const refresh = async () => {
    const [p, i] = await Promise.all([listPairs(), listInvites()]);
    setPairs(p);
    setInvites(i);
  };
  const fail = (context: string) => (error: unknown) => {
    reportError(context, error);
    setBusy(null);
    setNote({ key: "failed" });
  };
  const say = (key: string, values?: Note["values"]) => setNote({ key, values });

  const showWeeks = async (weeks: Uint8Array[]) => {
    const result = await takeWeeks(weeks);
    if (typeof result === "string") say(`refused.${result}`);
    else setTaken(result);
    await refresh();
  };

  const receive = (text: string, via: "link" | "scan") => {
    setScanning(false);
    setNote(null);
    setTaken(null);
    setBusy("reading");
    readCode(text, via)
      .then((read) => {
        setBusy(null);
        if (read.kind === "weeks") return showWeeks(read.weeks);
        if (read.kind === "unreadable") return say(`refused.${read.why}`);
        setReceived(read);
      })
      .catch(fail("pairing.read"));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: `n` is what says a new link is held.
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;
    refresh().catch(fail("pairing.list"));
    const link = takeIncomingLink();
    if (link !== null) receive(link, "link");
  }, [n]);

  // A build where this is off still answers bati://pairing: home, not a blank screen with no way out.
  if (!MULTIPLAYER_ENABLED) return <Redirect href="/" />;

  const showFaceCode = async () => {
    const made = await createPair(name);
    if (typeof made === "string") return say(refusal(made));
    setFaceCode(linkFor(encodeInvite(made)));
    setName("");
    await refresh();
  };

  const sendInvite = async () => {
    setBusy("preparing");
    const made = await createLinkInvite();
    setBusy(null);
    if (made === "full") return say("refused.full");
    await refresh();
    await Share.share({ message: linkFor(encodeLinkInvite(made)) });
  };

  const scan = async () => {
    // Here and nowhere earlier: the permission is asked when the scanner opens, and only then.
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (granted === PermissionsAndroid.RESULTS.GRANTED) setScanning(true);
    else say("camera_needed");
  };

  const joinFaceToFace = async (invite: Invite, chosen: string) => {
    const outcome = await acceptInvite(invite, chosen);
    say(outcome === "paired" ? "joined" : refusal(outcome), { name: chosen });
  };

  const joinByLink = async (invite: LinkInvite, chosen: string) => {
    setBusy("preparing");
    const outcome = await acceptLinkInvite(invite, chosen);
    setBusy(null);
    if (!(outcome instanceof Uint8Array)) return say(refusal(outcome));
    setAnswer(linkFor(outcome));
    say("joined_link");
  };

  /** Phone A: the answer, and the weeks that rode with it, read once the pair is written. */
  const keepAnswer = async (bytes: Uint8Array, weeks: Uint8Array[], chosen: string) => {
    const outcome = await completeLinkInvite(bytes, chosen);
    if (outcome !== "paired") return say(refusal(outcome));
    say("joined", { name: chosen });
    if (weeks.length > 0) await showWeeks(weeks);
  };

  const accept = async () => {
    const chosen = name.trim();
    if (received?.kind === "invite") await joinFaceToFace(received.invite, chosen);
    if (received?.kind === "linkInvite") await joinByLink(received.invite, chosen);
    if (received?.kind === "reply") await keepAnswer(received.bytes, received.weeks, chosen);
    setReceived(null);
    setName("");
    await refresh();
  };

  const asking = askingOf(received);

  return (
    <YStack flex={1} bg="background" pt={insets.top} pb={insets.bottom}>
      <XStack px="4" py="3" items="center" gap="3">
        <ScreenBackButton />
        <Text fontSize={20} fontWeight="700" color="text">
          {t("duo.companions_title")}
        </Text>
      </XStack>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          maxWidth: 520,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {busy !== null ? (
          <Text color="textSecondary" testID="pairing-busy" accessibilityLiveRegion="polite">
            {t(`duo.${busy}`)}
          </Text>
        ) : null}

        {asking !== null ? (
          <YStack gap="2" testID="pairing-received-invite">
            <Text color="text">{t(`duo.${asking}`)}</Text>
            <NameField value={name} onChange={setName} testID="pairing-receive-name" />
            <AppButton
              minH={48}
              testID="pairing-accept"
              disabled={name.trim() === ""}
              onPress={() => accept().catch(fail("pairing.accept"))}
            >
              {t(asking === "received_reply" ? "duo.keep" : "duo.join")}
            </AppButton>
            <AppButton
              minH={48}
              testID="pairing-decline"
              variant="outline"
              onPress={() => setReceived(null)}
            >
              {t("duo.ignore")}
            </AppButton>
          </YStack>
        ) : null}

        {note !== null ? (
          <Text color="text" testID="pairing-note" accessibilityLiveRegion="polite">
            {t(`duo.${note.key}`, note.values)}
          </Text>
        ) : null}

        {answer !== null ? (
          <AppButton
            minH={48}
            testID="pairing-tell-now"
            variant="outline"
            onPress={() => Share.share({ message: answer }).catch(fail("pairing.answer"))}
          >
            {t("duo.reply_send")}
          </AppButton>
        ) : null}

        {taken !== null ? (
          <TakenWeeks
            taken={taken}
            date={date}
            onSee={() => router.replace("/journal/bosses" as never)}
          />
        ) : null}

        {scanning || asking === null ? (
          <Scanner
            scanning={scanning}
            onStart={() => scan().catch(fail("pairing.scan"))}
            onScan={(text) => receive(text, "scan")}
            onError={() => {
              setScanning(false);
              say("camera_failed");
            }}
          />
        ) : null}

        {faceCode !== null ? (
          <FaceCode code={faceCode} onDone={() => setFaceCode(null)} />
        ) : asking === null ? (
          <InviteButtons
            full={pairs.length >= MAX_PAIRS}
            name={name}
            setName={setName}
            onFace={() => showFaceCode().catch(fail("pairing.invite"))}
            onLink={() => sendInvite().catch(fail("pairing.sendLink"))}
          />
        ) : null}

        {invites.map((pending) => (
          <XStack key={pending.id} items="center" justify="space-between" gap="3" flexWrap="wrap">
            <Text color="textSecondary" flex={1} minW={140}>
              {t("duo.invited_on", { date: date(pending.madeAt) })}
            </Text>
            <AppButton
              minH={48}
              testID="pairing-cancel-invite"
              variant="outline"
              fullWidth={false}
              onPress={() => cancelInvite(pending.id).then(refresh).catch(fail("pairing.cancel"))}
            >
              {t("duo.cancel")}
            </AppButton>
          </XStack>
        ))}

        {pairs.map((pair) => (
          <CompanionRow
            key={pair.id}
            pair={pair}
            onChange={() => refresh().catch(fail("pairing.list"))}
            onError={fail("pairing.pair")}
          />
        ))}
      </ScrollView>
    </YStack>
  );
}

/** The camera, opened only here (§ 6), or the button that opens it. */
function Scanner(props: {
  scanning: boolean;
  onStart: () => void;
  onScan: (text: string) => void;
  onError: () => void;
}) {
  const { t } = useTranslation();
  if (!props.scanning) {
    return (
      <AppButton minH={48} testID="pairing-scan" variant="outline" onPress={props.onStart}>
        {t("duo.scan")}
      </AppButton>
    );
  }
  return (
    <YStack height={320} overflow="hidden" rounded="3">
      <ScannerView
        testID="pairing-scanner"
        style={{ flex: 1 }}
        onScan={(event) => props.onScan(event.nativeEvent.text)}
        onCameraError={(event) => {
          reportError("pairing.camera", new Error(event.nativeEvent.message));
          props.onError();
        }}
      />
    </YStack>
  );
}

/** The code for a companion in the room. It holds the pair's secret: shown, never shared. */
function FaceCode({ code, onDone }: { code: string; onDone: () => void }) {
  const { t } = useTranslation();
  return (
    <YStack gap="3" items="center">
      <QrCode value={code} size={280} />
      <Text color="text" style={{ textAlign: "center" }}>
        {t("duo.qr_face_hint")}
      </Text>
      <AppButton minH={48} testID="pairing-hide-code" variant="outline" onPress={onDone}>
        {t("duo.done")}
      </AppButton>
    </YStack>
  );
}

function InviteButtons(props: {
  full: boolean;
  name: string;
  setName: (v: string) => void;
  onFace: () => void;
  onLink: () => void;
}) {
  const { t } = useTranslation();
  if (props.full) return <Text color="textSecondary">{t("duo.companions_max")}</Text>;
  return (
    <YStack gap="2">
      <AppButton minH={48} testID="pairing-send-link" variant="outline" onPress={props.onLink}>
        {t("duo.by_message")}
      </AppButton>
      <NameField value={props.name} onChange={props.setName} testID="pairing-invite-name" />
      <AppButton
        minH={48}
        testID="pairing-invite"
        disabled={props.name.trim() === ""}
        onPress={props.onFace}
      >
        {t("duo.face_to_face")}
      </AppButton>
    </YStack>
  );
}

/** E5: what a companion's code brought, week by week, and the way to the card it changed. */
function TakenWeeks({
  taken,
  date,
  onSee,
}: {
  taken: TakenWeek[];
  date: (at: Date) => string;
  onSee: () => void;
}) {
  const { t } = useTranslation();
  const line = (week: TakenWeek) =>
    week.outcome === "new"
      ? t("duo.received_week", {
          name: week.name,
          date: date(weekStart(week)),
          hits: week.hits,
          goal: week.goal,
        })
      : t(
          week.outcome === "same"
            ? "duo.nothing_new"
            : week.outcome === "ahead"
              ? "duo.refused.ahead"
              : "duo.refused.outside",
        );
  return (
    <YStack gap="2" testID="pairing-received-week">
      {taken.map((week) => (
        <Text key={`${week.pairId}:${week.isoYear}:${week.isoWeek}`} color="text">
          {line(week)}
          {week.fallen ? ` ${t("duo.state.fallen")}` : ""}
        </Text>
      ))}
      <AppButton minH={48} testID="pairing-see-boss" onPress={onSee}>
        {t("duo.see_boss")}
      </AppButton>
    </YStack>
  );
}

function NameField(props: { value: string; onChange: (v: string) => void; testID: string }) {
  const { t } = useTranslation();
  return (
    <Input
      testID={props.testID}
      value={props.value}
      onChangeText={props.onChange}
      maxLength={NAME_MAX}
      placeholder={t("duo.name_placeholder")}
      accessibilityLabel={t("duo.name_placeholder")}
    />
  );
}

/** One companion: their name as this hero calls them, the duel switch (D1), unlink in one tap. */
function CompanionRow({
  pair,
  onChange,
  onError,
}: {
  pair: Pair;
  onChange: () => void;
  onError: (error: unknown) => void;
}) {
  const { t } = useTranslation();
  return (
    <YStack gap="2" py="2" borderTopWidth={1} borderColor="glassBorder">
      <XStack items="center" justify="space-between" gap="3" flexWrap="wrap">
        <Text color="text" fontSize={16} flex={1} minW={120} testID={`pairing-pair-${pair.name}`}>
          {pair.name}
        </Text>
        <AppButton
          minH={48}
          testID={`pairing-unlink-${pair.name}`}
          variant="outline"
          fullWidth={false}
          accessibilityLabel={`${t("duo.unlink")}, ${pair.name}`}
          onPress={() => unlinkPair(pair.id).then(onChange, onError)}
        >
          {t("duo.unlink")}
        </AppButton>
      </XStack>
      <AppButton
        minH={48}
        testID={`pairing-duel-${pair.name}`}
        variant="outline"
        backgroundColor="surface2"
        accessibilityRole="switch"
        accessibilityState={{ checked: pair.duel }}
        accessibilityLabel={`${t("duo.duel_label")}, ${pair.name}`}
        onPress={() => setDuel(pair.id, !pair.duel).then(onChange, onError)}
      >
        {t(pair.duel ? "duo.duel_on" : "duo.duel_off")}
      </AppButton>
    </YStack>
  );
}
