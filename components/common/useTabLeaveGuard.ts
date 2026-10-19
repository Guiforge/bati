import { type RefObject, useEffect } from "react";

/**
 * The tab bar's half of a dirty-form guard. `popToTopOnBlur` unmounts the editor only after the
 * other tab is already showing, so the `beforeRemove` question (useDiscardGuard and the editors'
 * own) landed on top of the wrong screen and Cancel left the hero there. Asking on `tabPress`
 * keeps the hero on the editor until they answer.
 *
 * A `tabPress` listener on the editor's own route only hears presses on its own tab, so the
 * editor publishes itself here and `interceptTabPress` (called from the Tabs `screenListeners`)
 * reads it. `confirm` gets `go`, which sets `skipRef` (the editor's "leave without asking" ref)
 * and jumps to the tab that was pressed.
 */
type Guard = { skipRef: RefObject<boolean>; confirm: (go: () => void) => void };
let guard: Guard | null = null;

type TabsNav = {
  getState: () => { index: number; routes: { key: string; name: string }[] };
  navigate: (name: never) => void;
};

export function interceptTabPress(
  e: { target?: string; preventDefault: () => void },
  tabs: TabsNav,
) {
  if (!guard || guard.skipRef.current) return;
  const { index, routes } = tabs.getState();
  // The active tab's own press is a popToTop, and the editors' beforeRemove asks about that.
  if (e.target === routes[index]?.key) return;
  const name = routes.find((r) => r.key === e.target)?.name;
  if (!name) return;
  e.preventDefault();
  const { skipRef, confirm } = guard;
  confirm(() => {
    skipRef.current = true;
    tabs.navigate(name as never);
  });
}

export function useTabLeaveGuard(
  dirty: boolean,
  skipRef: RefObject<boolean>,
  confirm: (go: () => void) => void,
) {
  useEffect(() => {
    if (!dirty) return;
    const mine = { skipRef, confirm };
    guard = mine;
    return () => {
      if (guard === mine) guard = null;
    };
  }, [dirty, skipRef, confirm]);
}

/**
 * Whether an editor's `beforeRemove` lets the removal through without asking.
 *
 * A removal while the tab is not focused is `popToTopOnBlur` tidying a tab the hero already left
 * (a deep link, the home CTA), not the hero leaving the editor. Asking there blocked the pop, so the
 * abandoned draft sat in the stack and the Quests tab reopened on it. The tab bar asks before a
 * press (`interceptTabPress`), so a blurred removal has nothing left to ask.
 */
export function leavesWithoutAsking(
  navigation: { isFocused: () => boolean },
  dirty: boolean,
  skipRef: RefObject<boolean>,
) {
  return skipRef.current || !dirty || !navigation.isFocused();
}
