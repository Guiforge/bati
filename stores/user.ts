import { create } from "zustand";

interface UserState {
  hasFinishedOnboarding: boolean;
  villageName: string;
  setHasFinishedOnboarding: (hasFinished: boolean) => void;
  setVillageName: (name: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  hasFinishedOnboarding: false,
  villageName: "",
  setHasFinishedOnboarding: (hasFinished) => set({ hasFinishedOnboarding: hasFinished }),
  setVillageName: (name) => set({ villageName: name }),
}));
