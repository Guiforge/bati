import { type RefObject, useEffect, useState } from "react";
import { Keyboard, type ScrollView } from "react-native";

/**
 * The keyboard's height while it is up, else 0. A sheet with `moveOnKeyboardChange` rides up by
 * that much, so its own max height must give it back or its footer ends under the keys.
 * With `scroll`, the view is also scrolled to its end when the keyboard rises: riding up is not
 * enough at 130 % on a short screen, a last field or button stays under the keys.
 */
export function useKeyboardHeight(scroll?: RefObject<ScrollView | null>): number {
  const [keyboardH, setKeyboardH] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardH(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardH(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    if (keyboardH > 0) requestAnimationFrame(() => scroll?.current?.scrollToEnd());
  }, [keyboardH, scroll]);
  return keyboardH;
}
