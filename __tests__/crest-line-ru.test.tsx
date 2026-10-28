import { renderHook } from "@testing-library/react-native";
import i18next from "i18next";
import { revealTitle } from "@/components/session/bigFeastText";
import { useCrestLine } from "@/components/village/crestLine";
import ru from "@/locales/ru.json";

// Russian declines the object of "стережёт": a village name goes behind "деревню", which is
// accusative whatever the name is. A raw name here read "Медведь стережёт Заря."

const mockI18n = i18next.createInstance();
mockI18n.init({
  lng: "ru",
  resources: { ru: { translation: ru } },
  interpolation: { escapeValue: false },
});

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => mockI18n.t(k, o) }),
}));

const bear = {
  animal: "bear",
  second: null,
  quarters: null,
  stage: "adult",
  manual: false,
} as const;

describe("the crest line in Russian", () => {
  it("names a village behind 'деревню'", async () => {
    const { result } = await renderHook(() => useCrestLine(bear, "Заря", false));
    expect(result.current).toBe("Медведь стережёт деревню Заря.");
  });

  it("falls back to 'твою деревню' unnamed", async () => {
    const { result } = await renderHook(() => useCrestLine(bear, "", false));
    expect(result.current).toBe("Медведь стережёт твою деревню.");
  });

  it("the big feast title does the same", () => {
    const t = ((k: string, o?: Record<string, unknown>) => mockI18n.t(k, o)) as never;
    expect(revealTitle(t, { animal: "bear" } as never, "Заря")).toBe(
      "Медведь стережёт деревню Заря.",
    );
  });
});
