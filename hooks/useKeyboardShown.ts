import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

/** True while the soft keyboard is up. Screens use it to drop bottom padding the keyboard covers. */
export function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setShown(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}
