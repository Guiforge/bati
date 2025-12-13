import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import fr from "./locales/fr.json";

const resources = {
  en: { translation: en },
  fr: { translation: fr },
};

const initI18n = async () => {
  let savedLanguage = "en"; // Default language

  // Check device language
  const deviceLanguage = Localization.getLocales()[0]?.languageCode;
  if (deviceLanguage && ["en", "fr"].includes(deviceLanguage)) {
    savedLanguage = deviceLanguage;
  }

  i18n.use(initReactI18next).init({
    resources,
    lng: savedLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });
};

initI18n();

export default i18n;
