import { useColorScheme } from "react-native";
import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "light",
  setTheme: (theme) => set({ theme }),
}));

export function useAppColorScheme(): "light" | "dark" {
  const systemScheme = useColorScheme() ?? "light";
  const theme = useThemeStore((s) => s.theme);

  if (theme === "system") {
    return systemScheme;
  }
  return theme;
}
