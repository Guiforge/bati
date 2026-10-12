import {
  DELIVERED_COATS,
  hasRareCoat,
  isWinter,
  portraitSlug,
  rareCoatShips,
} from "../db/crestCoat";
import { ANIMALS, type CrestStage } from "../db/crestRules";

const SOUTH = ["AR", "AU", "BO", "BR", "CL", "LS", "NZ", "PE", "UY", "ZA", "FK", "AO", "FJ", "ZW"];
const NORTH = ["FR", "US", "DE", "ES", "JP", "GB", "ID"];
const at = (month: number) => new Date(2026, month - 1, 15, 12);
const STAGES: Exclude<CrestStage, "young">[] = ["adult", "venerable", "legendary"];

/** Every slug of the 57: the whole catalogue, so the table below can be read against it. */
const ALL = new Set(
  ANIMALS.flatMap((a) =>
    (["young", ...STAGES] as const).flatMap((s) =>
      s === "young"
        ? [`${a}-${s}`]
        : [`${a}-${s}`, `${a}-${s}-rare`, ...(a === "ermine" ? [] : [`${a}-${s}-winter`])],
    ),
  ),
);

describe("the portrait catalogue", () => {
  test("is the spec's 57 slugs", () => {
    expect(ALL.size).toBe(57);
  });
  test("what ships names only slugs of the catalogue, and never a base", () => {
    expect([...DELIVERED_COATS].every((s) => ALL.has(s))).toBe(true);
    expect([...DELIVERED_COATS].every((s) => /-(rare|winter)$/.test(s))).toBe(true);
  });
});

describe("winter by hemisphere", () => {
  test.each(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].flatMap((m) => [
      [m, "north", m === 12 || m <= 2],
      [m, "south", m >= 6 && m <= 8],
    ]),
  )("month %i, %s", (month, side, winter) => {
    for (const region of side === "south" ? SOUTH : NORTH) {
      expect(isWinter(at(month as number), region)).toBe(winter);
    }
  });

  test("Brazil is in winter in July and not in January", () => {
    expect(isWinter(at(7), "BR")).toBe(true);
    expect(isWinter(at(1), "BR")).toBe(false);
  });

  test("no region is the northern calendar, in December and in July", () => {
    for (const region of [undefined, null, ""]) {
      expect(isWinter(at(12), region)).toBe(true);
      expect(isWinter(at(7), region)).toBe(false);
    }
  });

  test("the month bounds are local calendar days, the 1st and the last", () => {
    expect(isWinter(new Date(2026, 4, 31, 23, 59), "AU")).toBe(false);
    expect(isWinter(new Date(2026, 5, 1, 0, 0), "AU")).toBe(true);
    expect(isWinter(new Date(2026, 7, 31, 23, 59), "AU")).toBe(true);
    expect(isWinter(new Date(2026, 8, 1, 0, 0), "AU")).toBe(false);
    expect(isWinter(new Date(2026, 10, 30, 23, 59), "FR")).toBe(false);
    expect(isWinter(new Date(2026, 11, 1, 0, 0), "FR")).toBe(true);
    expect(isWinter(new Date(2026, 1, 28, 23, 59), "FR")).toBe(true);
    expect(isWinter(new Date(2026, 2, 1, 0, 0), "FR")).toBe(false);
  });
});

describe("portraitSlug, every row of the spec's table", () => {
  // Everything ships: the table is read here without the fallback.
  const all = ALL;
  const slug = (
    animal: (typeof ANIMALS)[number],
    stage: CrestStage,
    rare: boolean,
    coat: "auto" | "usual",
    winter: boolean,
  ) => portraitSlug(animal, stage, rare, coat, at(winter ? 1 : 7), "FR", all);

  test.each(
    ANIMALS.flatMap((a) =>
      [true, false].flatMap((rare) => [true, false].map((w) => [a, rare, w] as const)),
    ),
  )("%s young keeps its base (rare %s, winter %s)", (animal, rare, winter) => {
    for (const coat of ["auto", "usual"] as const)
      expect(slug(animal, "young", rare, coat, winter)).toBe(`${animal}-young`);
  });

  const rows = ANIMALS.flatMap((a) => STAGES.map((s) => [a, s] as const));
  test.each(rows)("%s %s: won + auto is rare, winter or not", (a, s) => {
    expect(slug(a, s, true, "auto", true)).toBe(`${a}-${s}-rare`);
    expect(slug(a, s, true, "auto", false)).toBe(`${a}-${s}-rare`);
  });
  test.each(rows)("%s %s: won + usual cuts the rare, not winter", (a, s) => {
    expect(slug(a, s, true, "usual", true)).toBe(a === "ermine" ? `${a}-${s}` : `${a}-${s}-winter`);
    expect(slug(a, s, true, "usual", false)).toBe(`${a}-${s}`);
  });
  test.each(rows)("%s %s: not won, winter or base, whatever crestCoat says", (a, s) => {
    for (const coat of ["auto", "usual"] as const) {
      expect(slug(a, s, false, coat, true)).toBe(a === "ermine" ? `${a}-${s}` : `${a}-${s}-winter`);
      expect(slug(a, s, false, coat, false)).toBe(`${a}-${s}`);
    }
  });

  test("winter follows the hemisphere of the region, either side of the list", () => {
    expect(portraitSlug("bear", "adult", false, "auto", at(7), "AU", all)).toBe(
      "bear-adult-winter",
    );
    expect(portraitSlug("bear", "adult", false, "auto", at(7), "FR", all)).toBe("bear-adult");
    expect(portraitSlug("bear", "adult", false, "auto", at(1), "AU", all)).toBe("bear-adult");
    expect(portraitSlug("bear", "adult", false, "auto", at(1), undefined, all)).toBe(
      "bear-adult-winter",
    );
  });
});

describe("a portrait that does not ship falls back on the base of the same stage", () => {
  const some = (...slugs: string[]) => new Set(slugs);
  test("nothing delivered: the base, whatever the coat", () => {
    expect(portraitSlug("stag", "venerable", true, "auto", at(1), "FR", new Set())).toBe(
      "stag-venerable",
    );
    expect(portraitSlug("stag", "legendary", false, "auto", at(1), "FR", new Set())).toBe(
      "stag-legendary",
    );
  });
  test("the rare is missing: winter in winter, else the base (the venerable horse, won)", () => {
    const d = some("horse-venerable-winter");
    expect(portraitSlug("horse", "venerable", true, "auto", at(1), "FR", d)).toBe(
      "horse-venerable-winter",
    );
    expect(portraitSlug("horse", "venerable", true, "auto", at(7), "FR", d)).toBe(
      "horse-venerable",
    );
    expect(portraitSlug("horse", "venerable", false, "auto", at(1), "FR", d)).toBe(
      "horse-venerable-winter",
    );
  });
  test("the rare ships: it wins over winter, and another stage's rare does not stand in", () => {
    const d = some("horse-adult-rare", "horse-venerable-winter");
    expect(portraitSlug("horse", "venerable", true, "auto", at(7), "FR", d)).toBe(
      "horse-venerable",
    );
    expect(portraitSlug("horse", "adult", true, "auto", at(1), "FR", d)).toBe("horse-adult-rare");
  });
  test("the winter is missing: the base, never the rare", () => {
    const d = some("stag-adult-rare");
    expect(portraitSlug("stag", "adult", false, "auto", at(1), "FR", d)).toBe("stag-adult");
    expect(portraitSlug("stag", "adult", true, "usual", at(1), "FR", d)).toBe("stag-adult");
  });
  test("a coat of another stage does not stand in", () => {
    const d = some("stag-adult-rare");
    expect(portraitSlug("stag", "venerable", true, "auto", at(1), "FR", d)).toBe("stag-venerable");
  });
  test("what ships is worn", () => {
    expect(portraitSlug("stag", "adult", true, "auto", at(1), "FR", some("stag-adult-rare"))).toBe(
      "stag-adult-rare",
    );
  });
});

describe("the rare coat is Eternal", () => {
  test.each([
    [0, false],
    [4, false],
    [5, true],
  ])("flame level %i: %s", (level, won) => {
    expect(hasRareCoat(level)).toBe(won);
  });
});

describe("the rare coat on offer", () => {
  // bear-young-rare is delivered here on purpose: only the stage rule keeps a young animal out.
  const ships = new Set(["bear-young-rare", "bear-adult-rare"]);
  test("needs the coat won, an adult or more and its portrait", () => {
    expect(rareCoatShips("bear", "adult", 5, ships)).toBe(true);
    expect(rareCoatShips("bear", "adult", 4, ships)).toBe(false);
    expect(rareCoatShips("bear", "young", 5, ships)).toBe(false);
    expect(rareCoatShips("bear", "venerable", 5, ships)).toBe(false);
    expect(rareCoatShips("stag", "adult", 5, ships)).toBe(false);
  });
});
