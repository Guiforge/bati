import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { localized } from "@/src/i18n/copy";
import { getDevicePreferredAppLanguage } from "@/src/i18n/deviceLanguage";
import { installPluralRulesShim } from "@/src/i18n/pluralRules";

// The files are listed once, in `LOCALES`: a language added to `APP_LANGUAGES` without its file
// fails there.
const resources = localized((translation) => ({ translation }));

installPluralRulesShim();

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
