import { createContext, useContext } from "react";

/**
 * Scrolls a `FormSheet`'s body so a node that just appeared (a field behind "Autre") is whole above
 * the pinned footer. At 130 % the body is a few lines tall and such a field opened half hidden.
 * Outside a sheet it does nothing.
 */
export const RevealContext = createContext<(node: unknown) => void>(() => undefined);
export const useRevealInSheet = () => useContext(RevealContext);
