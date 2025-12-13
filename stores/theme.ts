import { useColorScheme as useRNColorScheme } from "react-native";
import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "system",
  setTheme: (theme) => set({ theme }),
}));

export function useAppColorScheme() {
  const systemScheme = useRNColorScheme();
  const { theme } = useThemeStore();

  if (theme === "system") {
    return systemScheme ?? "light";
  }
  return theme;
}
