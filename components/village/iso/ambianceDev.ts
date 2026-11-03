// Dev only (app/dev.tsx): the light the Village tab is forced to, so the night can be checked on a
// device whose clock cannot be set. The tab reads it through `forceEnDev`, which is undefined
// unless `__DEV__`, so a published build never forces anything.

import { create } from "zustand";
import type { Ambiance } from "./isoSpec";

export const useAmbianceDev = create<{
  force: Ambiance | undefined;
  set: (a: Ambiance | undefined) => void;
}>((set) => ({ force: undefined, set: (force) => set({ force }) }));

export const forceEnDev = (dev: boolean, force: Ambiance | undefined) => (dev ? force : undefined);
