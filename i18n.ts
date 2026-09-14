import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getDevicePreferredAppLanguage, type Localized } from "@/src/i18n/deviceLanguage";

import en from "./locales/en.json";
import fr from "./locales/fr.json";

// Typed on every app language: a language added to `APP_LANGUAGES` without its file fails here.
const resources: Localized<{ translation: typeof en }> = {
  en: { translation: en },
  fr: { translation: fr },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDevicePreferredAppLanguage(),
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  })
  .catch(() => {
    // Initialization errors are handled by i18next internally
  });

export { i18n };
