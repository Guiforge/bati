import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import type { ViewInstance } from "react-native";
import { captureRef } from "react-native-view-shot";

/** The card never grows past a phone's width: it is a picture for a chat, not a poster. */
export const MAX_CARD = 380;

/** The card exactly as drawn, as a PNG in the share sheet. */
export async function sendCard(card: RefObject<ViewInstance | null>): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error("No share sheet available");
  const uri = await captureRef(card, { format: "png", quality: 1, result: "tmpfile" });
  await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png" });
}
