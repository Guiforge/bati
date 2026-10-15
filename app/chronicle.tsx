import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions, View } from "react-native";
import { YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Skeleton } from "@/components/common/Skeleton";
import { useToast } from "@/components/common/Toast";
import { Share2 } from "@/components/icons";
import { NMuted, NPage } from "@/components/journal/nocturne";
import { ChronicleCard } from "@/components/share/ChronicleCard";
import { MAX_CARD, sendCard } from "@/components/share/sendCard";
import { type Chronicle, chronicleWindow, getChronicle } from "@/db/chronicle";
import { reportError } from "@/src/reportError";

/**
 * Four states apart, so none can speak for another: a read that failed must never read as a year
 * with nothing in it, and a closed month must never read as either.
 */
type Loaded =
  | { status: "loading" }
  | { status: "closed" }
  | { status: "failed" }
  | { status: "ready"; year: number; chronicle: Chronicle | null };

/**
 * The year's chronicle, as a picture to send. Opened from the Journal in December and January
 * only (`chronicleToOpen`); read on the phone from the journal, and sent as the card on screen.
 */
export default function ChronicleScreen() {
  const { t } = useTranslation();
  const { showError } = useToast();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 22, MAX_CARD);
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [painted, setPainted] = useState(false);
  const holding = busy || !painted;
  // Read synchronously, as on the share screen: two taps in one frame must not send two pictures.
  const working = useRef(false);
  const card = useRef<View>(null);

  useEffect(() => {
    const window = chronicleWindow(new Date());
    if (!window) {
      setLoaded({ status: "closed" });
      return;
    }
    getChronicle(window)
      .then((chronicle) => setLoaded({ status: "ready", year: window.year, chronicle }))
      .catch((error: unknown) => {
        reportError("chronicle.load", error);
        setLoaded({ status: "failed" });
      });
  }, []);

  // Promise chain, no `try ... finally`: the React Compiler cannot lower one.
  const send = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    await sendCard(card).catch((error: unknown) => {
      reportError("chronicle.image", error);
      showError(t("share.failed"));
    });
    working.current = false;
    setBusy(false);
  };

  if (loaded.status !== "ready" || !loaded.chronicle) {
    return (
      <NPage title={t("chronicle.title")} testID="chronicle-screen">
        {loaded.status === "loading" ? (
          <YStack items="center" mt={11}>
            <Skeleton height={cardWidth} width={cardWidth} bg="$surface2" />
          </YStack>
        ) : loaded.status === "ready" ? (
          <NMuted testID="chronicle-empty" mt={11}>
            {t("chronicle.empty", { year: loaded.year })}
          </NMuted>
        ) : (
          <NMuted testID={`chronicle-${loaded.status}`} mt={11}>
            {t(loaded.status === "closed" ? "chronicle.closed" : "common.error")}
          </NMuted>
        )}
      </NPage>
    );
  }

  return (
    <NPage title={t("chronicle.title")} testID="chronicle-screen">
      <YStack items="center" gap={17} mt={6}>
        {/* Above the card, which runs past a small phone's fold with a square painting on top:
            the one thing this screen is for stays on screen. */}
        <YStack width={cardWidth}>
          <AppButton
            testID="chronicle-send"
            disabled={holding}
            height={56}
            icon={
              <Share2 size={20} color={holding ? "$textSecondary" : "$text"} strokeWidth={2.5} />
            }
            onPress={() => {
              send().catch((error: unknown) => reportError("chronicle.image", error));
            }}
          >
            {t("share.send_image")}
          </AppButton>
        </YStack>
        {/* `collapsable={false}`: a flattened view has no native node for the capture to find. */}
        <View ref={card} collapsable={false}>
          <ChronicleCard
            chronicle={loaded.chronicle}
            width={cardWidth}
            onPainted={() => setPainted(true)}
          />
        </View>
      </YStack>
    </NPage>
  );
}
