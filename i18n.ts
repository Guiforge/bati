import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getDevicePreferredAppLanguage } from "@/src/i18n/deviceLanguage";

import en from "./locales/en.json";
import fr from "./locales/fr.json";

const resources = {
  en: { translation: en },
  fr: { translation: fr },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: getDevicePreferredAppLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // react already safes from xss
  },
});

export default i18n;
