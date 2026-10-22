import { useTranslation } from "react-i18next";
import { NMuted } from "@/components/journal/nocturne";

type HandMarkProps = {
  /** The whole entry was typed, or only the distance of an outing Bati timed. */
  what?: "entry" | "distance";
  /** 13 in a detail, 12 in a row. */
  size?: 12 | 13;
  testID?: string;
};

/**
 * "saisie à la main": the one mark for a figure the hero typed rather than Bati measured, the same
 * words in the same ash on every surface. Text only, lower case, no colour of its own and no
 * glyph: a symbol the hero has to learn is a game word nobody chose. It sits on its own line
 * under the details of a row, never inside the one-line row, where it would be cut.
 */
export function HandMark({ what = "entry", size = 12, testID }: HandMarkProps) {
  const { t } = useTranslation();
  return (
    <NMuted testID={testID} fontSize={size} lineHeight={`${size + 5}px`}>
      {t(what === "entry" ? "past_session.hand_mark" : "past_session.hand_mark_distance")}
    </NMuted>
  );
}
