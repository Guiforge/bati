import { heroQuestsFirst } from "@/components/adventures/heroQuestsFirst";

jest.mock("@/db/quests", () => ({ USER_QUEST_AUTHOR: "hero" }));

test("the hero's quests lead the picker, each group keeps its order", () => {
  const quests = [
    { id: 1, author: "Admin" },
    { id: 2, author: "hero" },
    { id: 3, author: "Admin" },
    { id: 4, author: "hero" },
  ];
  expect(heroQuestsFirst(quests).map((q) => q.id)).toEqual([2, 4, 1, 3]);
});
