import { NOTICE_ORDER, type NoticeKind, pickNotice } from "@/components/home/noticeOrder";

describe("pickNotice", () => {
  test("the order is the feature: each winner removed, the next one speaks, down to nothing", () => {
    const present = new Set<NoticeKind>(NOTICE_ORDER);
    const seen: (NoticeKind | null)[] = [];
    for (let i = 0; i <= NOTICE_ORDER.length; i++) {
      const winner = pickNotice(present);
      seen.push(winner);
      if (winner) present.delete(winner);
    }
    expect(seen).toEqual([
      "recovery",
      "sync",
      "lightWeek",
      "whatsNew",
      "update",
      "protect",
      "reminder",
      "passwordCheck",
      null,
    ]);
  });
});
