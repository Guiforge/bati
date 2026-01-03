import { create } from "zustand";
import { preferences } from "@/db";

interface UserState {
  hasFinishedOnboarding: boolean;
  villageName: string;
  isLoaded: boolean;
  setHasFinishedOnboarding: (hasFinished: boolean) => void;
  setVillageName: (name: string) => void;
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
    } catch (e) {
      console.error("Failed to load user settings", e);
      // Fallback to defaults but mark as loaded so app doesn't hang
      set({ isLoaded: true });
    }
  },
}));
