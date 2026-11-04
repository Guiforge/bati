import { stadeSuivant } from "../components/village/stadeSuivant";

// The silhouette shows the painted stage after the one the rank draws, and nothing otherwise.
describe("stadeSuivant", () => {
  const tous = { rough: 1, solid: 1, grand: 1, legendary: 1, mythic: 1 };

  test("is the next painted stage of the rank", () => {
    expect(stadeSuivant("archery_range", 1, 0, tous)).toBe("solid");
    expect(stadeSuivant("archery_range", 3, 0, tous)).toBe("grand");
  });

  test("an upgrade at its own rank 3 follows its base's rank under rule B", () => {
    // Same own level, three base ranks, three answers: grand's next, legendary's next, none.
    expect(stadeSuivant("watchtower", 3, 0, tous, "B")).toBe("legendary");
    expect(stadeSuivant("watchtower", 3, 7, tous, "B")).toBe("mythic");
    expect(stadeSuivant("watchtower", 3, 10, tous, "B")).toBeNull();
  });

  test("skips a stage that is not painted", () => {
    expect(stadeSuivant("archery_range", 1, 0, { rough: 1, grand: 1 })).toBe("grand");
  });

  test("is null at the last painted stage, unbuilt, or with nothing painted", () => {
    expect(stadeSuivant("archery_range", 10, 0, { rough: 1, solid: 1, grand: 1 })).toBeNull();
    expect(stadeSuivant("archery_range", 5, 0, { rough: 1, solid: 1, grand: 1 })).toBeNull();
    expect(stadeSuivant("archery_range", 0, 0, tous)).toBeNull();
    expect(stadeSuivant("archery_range", 4, 0, undefined)).toBeNull();
  });
});
