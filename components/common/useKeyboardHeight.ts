import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

/**
 * The keyboard's height while it is up, else 0. A sheet with `moveOnKeyboardChange` rides up by
 * that much, so its own max height must give it back or its footer ends under the keys.
 */
export function useKeyboardHeight(): number {
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
  return keyboardH;
}
