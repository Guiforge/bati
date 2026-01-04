import { getLocales } from "expo-localization";

export type AppLanguage = "en" | "fr";

export function getDevicePreferredAppLanguage(): AppLanguage {
  try {
    const locales = getLocales();
    const codes = locales
      .map((l) => l.languageCode ?? l.languageTag?.split("-")[0] ?? null)
      .filter((c): c is string => typeof c === "string" && c.length > 0);

    if (codes.includes("fr")) return "fr";
    if (codes.includes("en")) return "en";

    return "en";
  } catch {
    return "en";
  }
}
