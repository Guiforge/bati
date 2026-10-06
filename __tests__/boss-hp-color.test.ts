import { bossHpColor } from "@/components/session/bossPhase";

describe("bossHpColor", () => {
  it("is fire while the monster is whole", () => {
    expect(bossHpColor(80, false, false)).toBe("$resourceFire");
    expect(bossHpColor(50, false, false)).toBe("$resourceFire");
  });
  it("is red below half", () => {
    expect(bossHpColor(49, false, false)).toBe("$error");
  });
  it("is red when enraged or down", () => {
    expect(bossHpColor(90, true, false)).toBe("$error");
    expect(bossHpColor(90, false, true)).toBe("$error");
  });
});
