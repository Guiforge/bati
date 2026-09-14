import { getLocales } from "expo-localization";
import {
  APP_LANGUAGES,
  type AppLanguage,
  getDevicePreferredAppLanguage,
  nextAppLanguage,
  resolveAppLanguage,
} from "@/src/i18n/deviceLanguage";
import { localizedText } from "@/src/i18n/localized";

jest.mock("expo-localization", () => ({ getLocales: jest.fn() }));

const mockLocales = (...tags: string[]) => {
  (getLocales as jest.Mock).mockReturnValue(
    tags.map((tag) => ({ languageCode: tag.split("-")[0], languageTag: tag })),
  );
};

describe("getDevicePreferredAppLanguage", () => {
  it("follows the preference order, not mere presence", () => {
    // A per-app locale of en is prepended to a French system list.
    mockLocales("en", "fr-FR");
    expect(getDevicePreferredAppLanguage()).toBe("en");
  });

  it("picks fr when it is the first supported language", () => {
    mockLocales("fr-FR", "en");
    expect(getDevicePreferredAppLanguage()).toBe("fr");
  });

  it("skips unsupported languages to the first supported one", () => {
    mockLocales("ja-JP", "fr-FR");
    expect(getDevicePreferredAppLanguage()).toBe("fr");
  });

  it("falls back to en when nothing is supported", () => {
    mockLocales("ja-JP", "it-IT");
    expect(getDevicePreferredAppLanguage()).toBe("en");
  });
});

describe("resolveAppLanguage", () => {
  it("keeps a stored language the app ships, and reads anything else as English", () => {
    for (const language of APP_LANGUAGES) expect(resolveAppLanguage(language)).toBe(language);
    expect(resolveAppLanguage("ja")).toBe("en");
  });
});

describe("nextAppLanguage", () => {
  // One tap on the settings row. Wrapping is the part that breaks when a language is appended:
  // the last one must lead back to the first, or the row strands the hero there.
  it("visits every language once and comes back to where it started", () => {
    const seen: AppLanguage[] = [];
    let language: AppLanguage = APP_LANGUAGES[0];
    for (let i = 0; i < APP_LANGUAGES.length; i++) {
      seen.push(language);
      language = nextAppLanguage(language);
    }
    expect(seen).toEqual([...APP_LANGUAGES]);
    expect(language).toBe(APP_LANGUAGES[0]);
  });
});

describe("localizedText", () => {
  const row = { enDescription: "Hold the line.", frDescription: "Tiens bon." };

  it("reads the language's own column", () => {
    expect(localizedText(row, "description", "fr")).toBe("Tiens bon.");
  });

  // A seeded row whose new language has not been written yet: English, never a blank card.
  it("falls back to English when the language's column is empty", () => {
    expect(localizedText({ ...row, frDescription: "" }, "description", "fr")).toBe(
      "Hold the line.",
    );
  });
});
