import { pickSessionEmptyVariant, SESSION_EMPTY_VARIANTS } from "@/constants/sessionEmptyMessages";

describe("pickSessionEmptyVariant", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("picks the first variant when Math.random rolls 0", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    expect(pickSessionEmptyVariant("en")).toEqual(SESSION_EMPTY_VARIANTS.en[0]);
    expect(pickSessionEmptyVariant("fr")).toEqual(SESSION_EMPTY_VARIANTS.fr[0]);
  });

  test("picks the last variant when Math.random rolls just under 1", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.999);
    const lastIndex = SESSION_EMPTY_VARIANTS.en.length - 1;
    expect(pickSessionEmptyVariant("en")).toEqual(SESSION_EMPTY_VARIANTS.en[lastIndex]);
  });

  test("title and subtitle always come from the same pair", () => {
    for (const language of ["en", "fr"] as const) {
      for (const variant of SESSION_EMPTY_VARIANTS[language]) {
        expect(variant.title.length).toBeGreaterThan(0);
        expect(variant.subtitle.length).toBeGreaterThan(0);
      }
    }
  });
});
