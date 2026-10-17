import { useNavigation } from "expo-router";
import { type RefObject, useEffect } from "react";

/**
 * The tab bar's half of a dirty-form guard. `popToTopOnBlur` unmounts the editor only after the
 * other tab is already showing, so the `beforeRemove` question (useDiscardGuard and the editors'
 * own) landed on top of the wrong screen and Cancel left the hero there. Asking on `tabPress`
 * keeps the hero on the editor until they answer; `confirm` gets `go`, which sets `skipRef` (the
 * editor's "leave without asking" ref) and jumps to the tab that was pressed.
 */
export function useTabLeaveGuard(
  dirty: boolean,
  skipRef: RefObject<boolean>,
  confirm: (go: () => void) => void,
) {
  const navigation = useNavigation();
  useEffect(() => {
    const tabs = navigation.getParent?.();
    if (!tabs) return;
    // The tab navigator's event map is not typed from here, so the listener is cast.
    const onTabPress = (e: { target?: string; preventDefault: () => void }) => {
      if (skipRef.current || !dirty) return;
      const name = tabs.getState().routes.find((r) => r.key === e.target)?.name;
      if (!name) return;
      e.preventDefault();
      confirm(() => {
        skipRef.current = true;
        tabs.navigate(name as never);
      });
    };
    return tabs.addListener("tabPress" as never, onTabPress as never);
  }, [navigation, dirty, skipRef, confirm]);
}
