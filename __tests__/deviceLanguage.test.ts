import { getLocales } from "expo-localization";
import { getDevicePreferredAppLanguage } from "@/src/i18n/deviceLanguage";

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
    mockLocales("de-DE", "fr-FR");
    expect(getDevicePreferredAppLanguage()).toBe("fr");
  });

  it("falls back to en when nothing is supported", () => {
    mockLocales("de-DE", "es-ES");
    expect(getDevicePreferredAppLanguage()).toBe("en");
  });
});
