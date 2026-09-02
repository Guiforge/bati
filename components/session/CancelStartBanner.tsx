import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { X } from "@/components/icons";
import { isOutingSession } from "@/db/expeditions";
import { useExpeditionStore } from "@/stores/expedition";
import { useSessionStore } from "@/stores/session";

/**
 * How long the way back stays open. The three seconds of countdown a quest gets served the same
 * purpose for a mistap; an outing has no countdown, so it gets this instead.
 */
const OPEN_MS = 5000;

/**
 * The way back out of a start nobody meant to make.
 *
 * The quick gate on Home turns one tap into a running session, with no countdown in between
 * (premise 4). Undoing that tap otherwise costs four gestures - pause, quit, confirm, and the
 * screen it lands on - so for five seconds the screen says so out loud and offers one.
 *
 * Two things about its shape are load-bearing:
 *
 * - **It is absolutely positioned, never a row in the flow.** A band mounted and then unmounted
 *   above the readout re-parents everything under it and moves the 56 px figure at the exact
 *   moment the hero is reading it. That is the shape of issue #29, and it is why this owns no
 *   height in the layout at all.
 * - **The clock starts when the screen is the hero's to touch, not when the session starts.**
 *   On a first outing Android stacks two permission dialogs over this screen; five seconds spent
 *   behind them would expire a control the hero never saw. The expedition store settles - a uuid
 *   or an error - exactly when the last dialog closes, so that is the signal.
 *
 * It is the neutral toast's vocabulary and not an alert's: no red, no warning glyph, a polite
 * live region. Nothing has gone wrong; the hero is simply still allowed to change their mind.
 */
export function CancelStartBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const quest = useSessionStore((s) => s.quest);
  const goal = useSessionStore((s) => s.goal);
  const quitSession = useSessionStore((s) => s.quitSession);
  // `begin()` resolves into one or the other once both permission prompts have been answered.
  const settled = useExpeditionStore((s) => s.sessionUuid !== null || s.error !== null);
  const [gone, setGone] = useState(false);

  // A free outing is `goal === null` (premise 1), and only the quick gate starts one.
  const offered = quest !== null && goal === null && isOutingSession(quest);

  useEffect(() => {
    if (!offered || !settled || gone) return;
    const timer = setTimeout(() => setGone(true), OPEN_MS);
    return () => clearTimeout(timer);
  }, [offered, settled, gone]);

  if (!offered || gone) return null;

  return (
    <XStack
      testID="cancel-start-banner"
      position="absolute"
      t={insets.top + 8}
      l="$3"
      r="$3"
      z={50}
      bg="$surface2"
      borderWidth={1}
      borderColor="$borderStrong"
      rounded="$4"
      pl="$3"
      items="center"
      gap="$2"
      accessibilityLiveRegion="polite"
    >
      <Text flex={1} fontSize={13} color="$textSecondary">
        {t("session.expedition_cancel_start_hint")}
      </Text>
      {/* The word is "Cancel the start", never plain "Cancel": everywhere else in the app that
          word means "do nothing", and here the gesture throws a session and its ground away. */}
      <YStack height={44} justify="center" px="$2" accessibilityRole="button" onPress={quitSession}>
        <Text fontSize={13} fontWeight="700" color="$primaryText">
          {t("session.expedition_cancel_start")}
        </Text>
      </YStack>
      <YStack
        width={44}
        height={44}
        items="center"
        justify="center"
        accessibilityRole="button"
        accessibilityLabel={t("common.close")}
        onPress={() => setGone(true)}
      >
        <X size={16} color="$textSecondary" />
      </YStack>
    </XStack>
  );
}
