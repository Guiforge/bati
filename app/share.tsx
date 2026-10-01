import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { type RefObject, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Skeleton } from "@/components/common/Skeleton";
import { useToast } from "@/components/common/Toast";
import { Share2 } from "@/components/icons";
import { NButton, NMuted, NPage, NSeg } from "@/components/journal/nocturne";
import { type LoadedSession, readSession } from "@/components/journal/sessionLog";
import type { MapState } from "@/components/journal/TraceThumb";
import { ShareCard } from "@/components/share/ShareCard";
import { sharedLine } from "@/components/share/shareStats";
import { pointsOf } from "@/db/gps";
import { exportTrack } from "@/src/gps/trackFile";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/** The card never grows past a phone's width: it is a picture for a chat, not a poster. */
const MAX_CARD = 380;

/** The card exactly as drawn, as a PNG in the share sheet. */
async function sendCard(card: RefObject<View | null>): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error("No share sheet available");
  const uri = await captureRef(card, { format: "png", quality: 1, result: "tmpfile" });
  await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png" });
}

async function sendGpx(uuid: string): Promise<void> {
  await exportTrack(await pointsOf(uuid));
}

/**
 * One finished session, as a picture to send, and its GPX when it has a trace.
 *
 * Every door to sharing opens this screen (`components/share/ShareButton.tsx`): the victory
 * screen, the journal page, the recap. The hero sees what leaves before it leaves, which a share
 * sheet opened straight on a text never showed them. What is sent is exactly the card on screen,
 * captured as it is drawn.
 *
 * The map under the line is a choice here and not only a setting: a picture of a run from the
 * front door says where the front door is, so a hero who turned the map on for themselves can
 * still send the line alone.
 */
export default function ShareScreen() {
  const { t } = useTranslation();
  const { showError } = useToast();
  const params = useLocalSearchParams<{ session?: string | string[] }>();
  const raw = Array.isArray(params.session) ? params.session[0] : params.session;
  const sessionId = Number(raw);
  const language = useSettingsStore((s) => s.language);
  const tiles = useSettingsStore((s) => s.mapTilesEnabled);
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 22, MAX_CARD);

  const [loaded, setLoaded] = useState<LoadedSession>({ status: "loading" });
  const [withMap, setWithMap] = useState<"map" | "line">("map");
  const [mapState, setMapState] = useState<MapState>("none");
  const [busy, setBusy] = useState(false);
  // The guard itself, read synchronously: two taps in one frame both saw `busy` false and sent two
  // captures to two share sheets. The state only draws the button.
  const working = useRef(false);
  const card = useRef<View>(null);

  useEffect(() => {
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      setLoaded({ status: "error", message: t("journal.session_not_found") });
      return;
    }
    readSession(sessionId, language, t)
      .then(setLoaded)
      .catch((error: unknown) => {
        reportError("share.load", error);
        setLoaded({ status: "error", message: t("common.error") });
      });
  }, [sessionId, language, t]);

  // Promise chains, no `try ... finally`: the React Compiler cannot lower one and skipped this
  // whole screen over it (`__tests__/react-compiler-coverage.test.ts`).
  const shareImage = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    await sendCard(card).catch((error: unknown) => {
      reportError("share.image", error);
      showError(t("share.failed"));
    });
    working.current = false;
    setBusy(false);
  };

  const shareGpx = async (uuid: string) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    await sendGpx(uuid).catch((error: unknown) => {
      reportError("share.gpx", error);
      showError(t("recap.export_failed"));
    });
    working.current = false;
    setBusy(false);
  };

  if (loaded.status !== "ready") {
    return (
      <NPage title={t("share.title")} testID="share-screen">
        {loaded.status === "loading" ? (
          <YStack items="center" mt={11}>
            <Skeleton height={cardWidth} width={cardWidth} bg="$surface2" />
          </YStack>
        ) : (
          <NMuted mt={11}>{loaded.message}</NMuted>
        )}
      </NPage>
    );
  }

  const { log, kill } = loaded;
  const uuid = log.session.uuid;
  const hasTrace = log.trace.length > 0;
  // What the picture draws, ends cut: a run too short to keep any has no map to offer.
  const hasLine = sharedLine(log.trace).length > 0;
  const showMap = hasLine && tiles && withMap === "map";
  const holding = busy || (showMap && mapState === "pending");

  return (
    <NPage title={t("share.title")} testID="share-screen">
      <YStack items="center" gap={17} mt={6}>
        {/* `collapsable={false}`: Android flattens a view that draws nothing of its own, and a
            flattened view has no native node for the capture to find. */}
        <View ref={card} collapsable={false}>
          <ShareCard
            log={log}
            kill={kill}
            width={cardWidth}
            showMap={showMap}
            mapState={mapState}
            onMapState={setMapState}
          />
        </View>

        {/* The send comes first and solid, as Start Quest is: it is what this screen is for, and
            a gold outline beside the toggle's gold outline read as two equal choices. */}
        <YStack width={cardWidth} gap={8}>
          {/* Held while the map is still drawing: a capture then is the line alone under a map
              the hero chose. A map that never comes ("none") releases it. */}
          <AppButton
            testID="share-image"
            disabled={holding}
            opacity={holding ? 0.6 : 1}
            height={56}
            rounded="$6"
            icon={<Share2 size={20} color="$text" strokeWidth={2.5} />}
            onPress={() => {
              shareImage().catch((error: unknown) => reportError("share.image", error));
            }}
          >
            {t("share.send_image")}
          </AppButton>
        </YStack>

        {hasLine ? (
          <LineOptions width={cardWidth} tiles={tiles} value={withMap} onChange={setWithMap} />
        ) : null}

        <YStack width={cardWidth} gap={8}>
          {hasTrace && uuid ? (
            <NButton testID="share-gpx" block minH={48} onPress={() => shareGpx(uuid)}>
              {t("recap.export")}
            </NButton>
          ) : null}
          {hasTrace ? (
            <NMuted fontSize={11} style={{ textAlign: "center" }}>
              {t("share.gpx_note")}
            </NMuted>
          ) : null}
        </YStack>
      </YStack>
    </NPage>
  );
}

/**
 * Under a drawn line: the map or the line alone, when the hero turned the map on, and what the
 * picture leaves out either way.
 */
function LineOptions({
  width,
  tiles,
  value,
  onChange,
}: {
  width: number;
  tiles: boolean;
  value: "map" | "line";
  onChange: (value: "map" | "line") => void;
}) {
  const { t } = useTranslation();
  return (
    <YStack width={width} items="center" gap={6}>
      {tiles ? (
        <NSeg
          options={[
            { value: "map", label: t("share.with_map"), testID: "share-with-map" },
            { value: "line", label: t("share.line_only"), testID: "share-line-only" },
          ]}
          value={value}
          onChange={onChange}
        />
      ) : null}
      {/* Whenever a line is drawn: its ends are cut with or without a map under it. */}
      <NMuted fontSize={11} style={{ textAlign: "center" }}>
        {t("share.hidden_ends")}
      </NMuted>
    </YStack>
  );
}
