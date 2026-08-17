import { create } from "zustand";
import { preferences } from "@/db";

// One rule for both writers: onboarding and Settings.
export const VILLAGE_NAME_MIN_LENGTH = 3;
export const VILLAGE_NAME_MAX_LENGTH = 20;

interface UserState {
  hasFinishedOnboarding: boolean;
  villageName: string;
  isLoaded: boolean;
  setHasFinishedOnboarding: (hasFinished: boolean) => Promise<void>;
  setVillageName: (name: string) => Promise<void>;
  loadFromDatabase: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  hasFinishedOnboarding: false,
  villageName: "",
  isLoaded: false,

  setHasFinishedOnboarding: async (hasFinished) => {
    set({ hasFinishedOnboarding: hasFinished });
    await preferences.setHasFinishedOnboarding(hasFinished);
  },

  setVillageName: async (name) => {
    set({ villageName: name });
    await preferences.setVillageName(name);
  },

  loadFromDatabase: async () => {
    try {
      const [hasFinished, villageName] = await Promise.all([
        preferences.getHasFinishedOnboarding(),
        preferences.getVillageName(),
      ]);
      set({
        hasFinishedOnboarding: hasFinished,
        villageName,
        isLoaded: true,
      });
    } catch {
      // Fallback to defaults but mark as loaded so app doesn't hang
      set({ isLoaded: true });
    }
  },
}));
