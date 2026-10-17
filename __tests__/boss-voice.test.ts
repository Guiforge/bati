import { bossDisplayName } from "@/constants/bosses";
import { bossLinesJson, cleanBossLines, clip, MAX_BOSS_LINE, parseBossLines } from "@/db/bossVoice";
import { reportError } from "@/src/reportError";

jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

describe("cleanBossLines", () => {
  test("trims, drops empties, keeps 3 per moment and the fixed key order", () => {
    const out = cleanBossLines({
      enrage: ["  a  ", "", "   ", "b", "c", "d"],
      idle: ["x\n y"],
    });
    expect(Object.keys(out)).toEqual(["idle", "crit", "enrage"]);
    expect(out.idle).toEqual(["x y"]);
    expect(out.crit).toEqual([]);
    expect(out.enrage).toEqual(["a", "b", "c"]);
  });

  test("cuts a line of 70 to 60 without half a surrogate pair", () => {
    const plain = cleanBossLines({ idle: ["x".repeat(70)] }).idle[0];
    expect(plain).toHaveLength(MAX_BOSS_LINE);
    // 59 units then an emoji (2 units) straddling the cut.
    const cut = cleanBossLines({ crit: [`${"x".repeat(59)}🔥🔥`] }).crit[0] ?? "";
    expect(cut).toBe("x".repeat(59));
    expect(clip("🔥🔥", 3)).toBe("🔥");
  });
});

describe("bossLinesJson", () => {
  test("is null when no moment has a line", () => {
    expect(bossLinesJson({})).toBeNull();
    expect(bossLinesJson({ idle: ["  "], crit: [] })).toBeNull();
  });

  test("writes the keys in moment order whatever the input order", () => {
    expect(bossLinesJson({ enrage: ["c"], idle: ["a"] })).toBe(
      '{"idle":["a"],"crit":[],"enrage":["c"]}',
    );
  });
});

describe("parseBossLines", () => {
  beforeEach(() => jest.clearAllMocks());

  test("null and empty are no lines, silently", () => {
    expect(parseBossLines(null)).toEqual({ idle: [], crit: [], enrage: [] });
    expect(parseBossLines("")).toEqual({ idle: [], crit: [], enrage: [] });
    expect(reportError).not.toHaveBeenCalled();
  });

  test("garbage is no lines and is reported, never thrown", () => {
    expect(parseBossLines("{nope")).toEqual({ idle: [], crit: [], enrage: [] });
    expect(reportError).toHaveBeenCalledWith("boss.lines", expect.anything());
  });

  test("wrong shapes are filtered", () => {
    expect(parseBossLines('{"idle":"a","crit":["b",3,null],"extra":["z"]}')).toEqual({
      idle: [],
      crit: ["b"],
      enrage: [],
    });
    expect(parseBossLines("[1]")).toEqual({ idle: [], crit: [], enrage: [] });
    expect(parseBossLines("null")).toEqual({ idle: [], crit: [], enrage: [] });
  });
});

describe("bossDisplayName with the hero's name", () => {
  const fight = {
    imagePath: "assets/images/bosses/iron_golem.jpg",
    enName: "T",
    frName: "T",
    deName: "T",
    esName: "T",
  };

  test("replaces the painted name at every tier and keeps the shiny prefix", () => {
    const painted0 = bossDisplayName(fight, "en");
    const painted1 = bossDisplayName({ ...fight, tier: 1 }, "en");
    expect(painted0).not.toBe("T");
    expect(bossDisplayName({ ...fight, bossName: "Nightcoil" }, "en")).toBe("Nightcoil");
    expect(bossDisplayName({ ...fight, bossName: "Nightcoil", tier: 1 }, "fr")).toBe("Nightcoil");
    expect(bossDisplayName({ ...fight, bossName: "Nightcoil", shiny: true }, "en")).toBe(
      "✨ Nightcoil",
    );
    // Without it, unchanged.
    expect(bossDisplayName({ ...fight, bossName: null, tier: 1 }, "en")).toBe(painted1);
    expect(bossDisplayName({ ...fight, bossName: "" }, "en")).toBe(painted0);
  });
});
