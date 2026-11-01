// T16: the test mode that freezes the map for Maestro (bati://dev-iso?fige=1). It reads as reduced
// motion, so every animation already gated on it stops the same way; nothing is written to the
// settings, so a run leaves the hero's preference untouched. Off everywhere else.

import { createContext, useContext } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export const FigeContext = createContext(false);

/** Reduced motion, or the map frozen for a test run. */
export function useMouvementReduit(): boolean {
  const reduit = useReducedMotion();
  const fige = useContext(FigeContext);
  return reduit || fige;
}
