import { parseAdventureOrigin } from "@/src/adventureOrigin";

describe("parseAdventureOrigin", () => {
  test("only /journal itself, a child path or a query is a journal origin", () => {
    expect(parseAdventureOrigin("/journalx?y=1")).toBeNull();
    for (const ok of ["/journal", "/journal/boss", "/journal?tab=x"]) {
      expect(parseAdventureOrigin(ok)).toBe(ok);
    }
  });
});
