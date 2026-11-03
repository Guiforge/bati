import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
// biome-ignore lint/correctness/useReactNativePlatformComponents: the scanner module is Android only (expo-module.config.json), and so is the one screen that opens it.
import { PermissionsAndroid, ScrollView, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Input } from "@/components/common/Input";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { QrCode } from "@/components/multiplayer/QrCode";
import { acceptInvite, createPair, listPairs, MAX_PAIRS, type Pair, unlinkPair } from "@/db/pairs";
import { ScannerView } from "@/modules/bati-scanner";
import { openEnvelope } from "@/src/multiplayer/envelope";
import { MULTIPLAYER_ENABLED } from "@/src/multiplayer/flag";
import { decodeInvite, encodeInvite, type Invite } from "@/src/multiplayer/invite";
import { bytesOfLink, linkFor, takeIncomingLink } from "@/src/multiplayer/link";
import { reportError } from "@/src/reportError";

/**
 * Pairing, minimal (multiplayer lot 0, D1). Dev-only like app/dev.tsx, so no i18n and no polish: this
 * screen proves the plumbing, the lots that ship give it its real words and its real place.
 *
 * Nothing it receives changes anything until the hero says so: a code or a link is shown for what it
 * is, and only "Accept" writes.
 */
const NAME_MAX = 40;

type Received =
  | { kind: "invite"; invite: Invite }
  | { kind: "week"; from: string; summary: string }
  | { kind: "unreadable"; why: string };

async function readCode(text: string, pairs: readonly Pair[]): Promise<Received> {
  const bytes = bytesOfLink(text);
  if (bytes === null) return { kind: "unreadable", why: "This is not a Bati code." };

  const invite = decodeInvite(bytes, Math.floor(Date.now() / 1000));
  if (invite) return { kind: "invite", invite };

  // A week from a companion: read and shown, and nothing keeps it until lot 1 has a challenge.
  for (const pair of pairs) {
    const opened = await openEnvelope(pair.secret, bytes, pair.selfId);
    if (opened.kind === "ok") {
      const hits = opened.state.days.reduce((sum, n) => sum + n, 0);
      return { kind: "week", from: pair.name, summary: `${hits} of ${opened.state.goal} sessions` };
    }
    if (opened.kind === "newerVersion") {
      return { kind: "unreadable", why: "Made by a newer Bati. Update to read it." };
    }
  }
  return { kind: "unreadable", why: "An expired invite, or for a companion not on this phone." };
}

export default function PairingScreen() {
  const insets = useSafeAreaInsets();
  const { n } = useLocalSearchParams<{ n?: string }>();
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [name, setName] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [received, setReceived] = useState<Received | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refresh = () => listPairs().then(setPairs);
  const fail = (context: string) => (error: unknown) => {
    reportError(context, error);
    setNote("That did not work.");
  };

  const receive = (text: string) => {
    setScanning(false);
    setNote(null);
    listPairs()
      .then((current) => readCode(text, current))
      .then(setReceived)
      .catch(fail("pairing.read"));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: `n` is what says a new link is held.
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;
    refresh().catch(fail("pairing.list"));
    const link = takeIncomingLink();
    if (link !== null) receive(link);
  }, [n]);

  if (!MULTIPLAYER_ENABLED) return null;

  const invite = async () => {
    const made = await createPair(name);
    if (made === "full") return setNote(`At most ${MAX_PAIRS} companions.`);
    if (made === "known") return setNote("Already a companion.");
    setShown(linkFor(encodeInvite(made)));
    setName("");
    setNote(null);
    await refresh();
  };

  const scan = async () => {
    // Here and nowhere earlier: the permission is asked when the scanner opens, and only then.
    const answer = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (answer === PermissionsAndroid.RESULTS.GRANTED) setScanning(true);
    else setNote("The scanner needs the camera. A link works without it.");
  };

  const accept = async (from: Invite) => {
    const outcome = await acceptInvite(from, name);
    setNote(
      outcome === "paired"
        ? "Paired."
        : outcome === "full"
          ? `At most ${MAX_PAIRS} companions.`
          : "This invite is yours, or already a companion.",
    );
    setReceived(null);
    setName("");
    await refresh();
  };

  return (
    <YStack flex={1} bg="background" pt={insets.top} pb={insets.bottom}>
      <XStack px="4" py="3" items="center" gap="3">
        <ScreenBackButton />
        <Text fontSize={20} fontWeight="700" color="text">
          Companions
        </Text>
      </XStack>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        {received?.kind === "invite" ? (
          <YStack gap="2" testID="pairing-received-invite">
            <Text color="text">An invitation to pair with this phone. What do you call them?</Text>
            <Input
              testID="pairing-receive-name"
              value={name}
              onChangeText={setName}
              maxLength={NAME_MAX}
              placeholder="Their name, only you see it"
            />
            <AppButton
              testID="pairing-accept"
              disabled={name.trim() === ""}
              onPress={() => accept(received.invite).catch(fail("pairing.accept"))}
            >
              Accept
            </AppButton>
            <AppButton testID="pairing-decline" variant="outline" onPress={() => setReceived(null)}>
              Decline
            </AppButton>
          </YStack>
        ) : received?.kind === "week" ? (
          <Text color="text" testID="pairing-received-week">
            A week from {received.from}: {received.summary}. Nothing was changed.
          </Text>
        ) : received?.kind === "unreadable" ? (
          <Text color="textSecondary" testID="pairing-unreadable">
            {received.why}
          </Text>
        ) : null}

        {note !== null ? (
          <Text color="textSecondary" testID="pairing-note">
            {note}
          </Text>
        ) : null}

        {scanning ? (
          <YStack height={320} overflow="hidden" rounded="3">
            <ScannerView
              testID="pairing-scanner"
              style={{ flex: 1 }}
              onScan={(event) => receive(event.nativeEvent.text)}
              onCameraError={(event) => {
                reportError("pairing.camera", new Error(event.nativeEvent.message));
                setScanning(false);
                setNote("The camera would not open. A link works without it.");
              }}
            />
          </YStack>
        ) : received?.kind !== "invite" ? (
          <AppButton
            testID="pairing-scan"
            variant="outline"
            onPress={() => scan().catch(fail("pairing.scan"))}
          >
            Scan a code
          </AppButton>
        ) : null}

        {shown !== null ? (
          <YStack gap="2" items="center">
            <QrCode value={shown} size={320} />
            <AppButton
              testID="pairing-send-link"
              variant="outline"
              onPress={() => Share.share({ message: shown }).catch(fail("pairing.share"))}
            >
              Send a link
            </AppButton>
            <AppButton testID="pairing-hide-code" variant="outline" onPress={() => setShown(null)}>
              Done
            </AppButton>
          </YStack>
        ) : received?.kind !== "invite" ? (
          <YStack gap="2">
            <Input
              testID="pairing-invite-name"
              value={name}
              onChangeText={setName}
              maxLength={NAME_MAX}
              placeholder="Their name, only you see it"
            />
            <AppButton
              testID="pairing-invite"
              disabled={name.trim() === ""}
              onPress={() => invite().catch(fail("pairing.invite"))}
            >
              Invite a companion
            </AppButton>
          </YStack>
        ) : null}

        {pairs.map((pair) => (
          <XStack key={pair.id} items="center" justify="space-between" gap="3">
            <Text color="text" testID={`pairing-pair-${pair.name}`}>
              {pair.name}
            </Text>
            <AppButton
              testID={`pairing-unlink-${pair.name}`}
              variant="outline"
              fullWidth={false}
              onPress={() => unlinkPair(pair.id).then(refresh).catch(fail("pairing.unlink"))}
            >
              Unlink
            </AppButton>
          </XStack>
        ))}
      </ScrollView>
    </YStack>
  );
}
