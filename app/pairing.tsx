import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
// biome-ignore lint/correctness/useReactNativePlatformComponents: the scanner module is Android only (expo-module.config.json), and so is the one screen that opens it.
import { PermissionsAndroid, ScrollView, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Input } from "@/components/common/Input";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { QrCode } from "@/components/multiplayer/QrCode";
import {
  acceptInvite,
  acceptLinkInvite,
  completeLinkInvite,
  createLinkInvite,
  createPair,
  listPairs,
  MAX_PAIRS,
  type Pair,
  unlinkPair,
} from "@/db/pairs";
import { ScannerView } from "@/modules/bati-scanner";
import { MULTIPLAYER_ENABLED } from "@/src/multiplayer/flag";
import { encodeInvite, type Invite, KIND_INVITE } from "@/src/multiplayer/invite";
import { bytesOfLink, linkFor, takeIncomingLink } from "@/src/multiplayer/link";
import { encodeLinkInvite, type LinkInvite } from "@/src/multiplayer/linkInvite";
import { type Received, readCode } from "@/src/multiplayer/received";
import { reportError } from "@/src/reportError";

/**
 * Pairing, minimal (multiplayer lot 0, D1). Dev-only like app/dev.tsx, so no i18n and no polish: this
 * screen proves the plumbing, the lots that ship give it its real words and its real place.
 *
 * Nothing it receives changes anything until the hero says so: a code or a link is shown for what it
 * is, and only "Accept" writes. Two ways to pair: a code on the screen, with the secret in it, for two
 * people in one room; a link, with no secret in it, and an answer that has to come back.
 */
const NAME_MAX = 40;

/** A code shown in the room holds the pair's secret: that one never reaches a share sheet. */
function shareable(link: string): boolean {
  const bytes = bytesOfLink(link);
  return bytes !== null && bytes[1] !== KIND_INVITE;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: a dev screen proving the plumbing, rewritten by the lot that ships it.
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

  const receive = (text: string, via: "link" | "scan") => {
    setScanning(false);
    setNote(null);
    readCode(text, via).then(setReceived).catch(fail("pairing.read"));
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

  const invite = async () => {
    const made = await createPair(name);
    if (made === "full") return setNote(`At most ${MAX_PAIRS} companions.`);
    if (made === "known") return setNote("Already a companion.");
    setShown(linkFor(encodeInvite(made)));
    setName("");
    setNote(null);
    await refresh();
  };

  const sendLink = async () => {
    const started = Date.now();
    const made = await createLinkInvite();
    if (made === "full") return setNote(`At most ${MAX_PAIRS} invitations waiting.`);
    const link = linkFor(encodeLinkInvite(made));
    setShown(link);
    setNote(`Waiting for an answer. Key made in ${Date.now() - started} ms.`);
    await Share.share({ message: link });
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

  const acceptLink = async (from: LinkInvite) => {
    const started = Date.now();
    const outcome = await acceptLinkInvite(from, name);
    if (outcome instanceof Uint8Array) {
      setShown(linkFor(outcome));
      setNote(`Paired. Send this answer back. Key agreed in ${Date.now() - started} ms.`);
    } else {
      setNote(
        outcome === "full"
          ? `At most ${MAX_PAIRS} companions.`
          : "This invite is yours, already a companion, or damaged.",
      );
    }
    setReceived(null);
    setName("");
    await refresh();
  };

  const completeLink = async (bytes: Uint8Array) => {
    const outcome = await completeLinkInvite(bytes, name);
    setNote(
      outcome === "paired"
        ? "Paired."
        : outcome === "full"
          ? `At most ${MAX_PAIRS} companions.`
          : "This answer no longer matches an invitation here.",
    );
    setReceived(null);
    setName("");
    await refresh();
  };

  // What the three kinds that ask for a name have in common: a sentence and what Accept does.
  const asking =
    received?.kind === "invite"
      ? {
          line: "An invitation to pair with this phone. What do you call them?",
          accept: () => accept(received.invite),
        }
      : received?.kind === "linkInvite"
        ? {
            line: "An invitation to pair with this phone. What do you call them?",
            accept: () => acceptLink(received.invite),
          }
        : received?.kind === "reply"
          ? {
              line: "Someone answered your invitation. What do you call them?",
              accept: () => completeLink(received.bytes),
            }
          : null;

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
        {asking !== null ? (
          <YStack gap="2" testID="pairing-received-invite">
            <Text color="text">{asking.line}</Text>
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
              onPress={() => asking.accept().catch(fail("pairing.accept"))}
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
              onScan={(event) => receive(event.nativeEvent.text, "scan")}
              onCameraError={(event) => {
                reportError("pairing.camera", new Error(event.nativeEvent.message));
                setScanning(false);
                setNote("The camera would not open. A link works without it.");
              }}
            />
          </YStack>
        ) : asking === null ? (
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
            {/* Only what carries no secret goes to a share sheet. Dev-only text, read by the test bench. */}
            {shareable(shown) ? (
              <>
                <Text color="textSecondary" fontSize={10} testID="pairing-link-text">
                  {shown}
                </Text>
                <AppButton
                  testID="pairing-share-again"
                  variant="outline"
                  onPress={() => Share.share({ message: shown }).catch(fail("pairing.share"))}
                >
                  Send it
                </AppButton>
              </>
            ) : null}
            <AppButton testID="pairing-hide-code" variant="outline" onPress={() => setShown(null)}>
              Done
            </AppButton>
          </YStack>
        ) : asking === null ? (
          <YStack gap="2">
            <AppButton
              testID="pairing-send-link"
              variant="outline"
              onPress={() => sendLink().catch(fail("pairing.sendLink"))}
            >
              Send a link
            </AppButton>
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
              Show a code, face to face
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
