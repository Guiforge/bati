import assert from "node:assert/strict";

import { batiCrypto } from "../modules/bati-crypto";
import { nodeBatiCrypto } from "./helpers/nodeBatiCrypto";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The release gate's two-phone scenarios (multiplayer lot 1, L6), on two real databases and the
 * real link: pairing by link, "Envoyer mes coups" as the share sheet would carry it, and the week
 * each phone then reads. Week 45 of 2026 runs from Monday 2 to Sunday 8 November.
 */
jest.mock("../modules/bati-crypto", () => ({ batiCrypto: jest.fn() }));

type Phone = ReturnType<typeof createTestDb>;
let phones: { A: Phone; B: Phone };

const ONLY_DATE = [
  "nextTick",
  "queueMicrotask",
  "setImmediate",
  "clearImmediate",
  "setInterval",
  "clearInterval",
  "setTimeout",
  "clearTimeout",
  "hrtime",
  "performance",
] as const;

const local = (day: number, hour = 12) => new Date(2026, 10, day, hour);
const W45 = { isoYear: 2026, isoWeek: 45 };

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: [...ONLY_DATE], now: local(2, 8) });
  phones = { A: createTestDb(), B: createTestDb() };
});

afterEach(() => {
  phones.A.close();
  phones.B.close();
  jest.useRealTimers();
});

type Modules = {
  pairs: typeof import("../db/pairs");
  duo: typeof import("../db/duo");
  pause: typeof import("../db/pause");
  received: typeof import("../src/multiplayer/received");
  send: typeof import("../src/multiplayer/sendCoups");
  link: typeof import("../src/multiplayer/link");
  linkInvite: typeof import("../src/multiplayer/linkInvite");
};

/** Runs `work` on one phone: its own database behind fresh modules, as two apps would be. */
function on<T>(phone: "A" | "B", work: (m: Modules) => Promise<T>): Promise<T> {
  jest.resetModules();
  jest.doMock("../modules/bati-crypto", () => ({ batiCrypto: () => nodeBatiCrypto }));
  jest.mocked(batiCrypto).mockReturnValue(nodeBatiCrypto);
  jest.doMock("../db/client", () => clientMock(phones[phone]));
  return work({
    pairs: require("../db/pairs"),
    duo: require("../db/duo"),
    pause: require("../db/pause"),
    received: require("../src/multiplayer/received"),
    send: require("../src/multiplayer/sendCoups"),
    link: require("../src/multiplayer/link"),
    linkInvite: require("../src/multiplayer/linkInvite"),
  });
}

let uuid = 0;
/** An outing of 1.5 km on `phone`: a hit by R1, with no sets to write. */
function outing(phone: "A" | "B", at: Date, over: { stopReason?: string } = {}) {
  uuid += 1;
  phones[phone].sqlite
    .prepare(
      `INSERT INTO completed_sessions (uuid, performedAt, tzOffsetMin, durationSeconds, outing, leaguesM, stopReason)
       VALUES (?, ?, ?, 900, 'walk', 1500, ?)`,
    )
    .run(
      `s${uuid}`,
      Math.floor(at.getTime() / 1000),
      -at.getTimezoneOffset(),
      over.stopReason ?? null,
    );
}

/** A invites by link, B joins. Nothing has come back to A yet. */
async function pairByLink(): Promise<void> {
  const link = await on("A", async (m) => {
    const made = await m.pairs.createLinkInvite();
    assert(made !== "full");
    return m.link.linkFor(m.linkInvite.encodeLinkInvite(made));
  });
  await on("B", async (m) => {
    const read = await m.received.readCode(link, "link");
    assert(read.kind === "linkInvite");
    expect(await m.pairs.acceptLinkInvite(read.invite, "Alex")).toBeInstanceOf(Uint8Array);
  });
}

/** "Envoyer mes coups" on `from`, opened on the other phone. Returns what the other phone saw. */
async function send(from: "A" | "B", at: Date) {
  jest.setSystemTime(at);
  const link = await on(from, async (m) => {
    const [pair] = await m.pairs.listPairs();
    assert(pair);
    return m.send.coupsLink(pair, at);
  });
  return on(from === "A" ? "B" : "A", async (m) => {
    const read = await m.received.readCode(link, "link");
    const paired =
      read.kind === "reply" ? await m.pairs.completeLinkInvite(read.bytes, "Léo") : "paired";
    assert.equal(paired, "paired");
    assert(read.kind === "reply" || read.kind === "weeks");
    return m.received.takeWeeks(read.weeks, at);
  });
}

const resultOn = (phone: "A" | "B", at: Date) =>
  on(phone, async (m) => {
    const [pair] = await m.pairs.listPairs();
    assert(pair);
    return (await m.duo.readDuoWeek(pair, W45, at)).result;
  });

test("B's first send carries the pairing answer: A gets the companion and the week at once", async () => {
  await pairByLink();
  expect(await on("A", (m) => m.pairs.listPairs())).toHaveLength(0);
  outing("B", local(2, 18));

  const taken = await send("B", local(2, 19));
  assert(Array.isArray(taken));
  expect(taken.map((t) => [t.name, t.hits, t.outcome])).toEqual([["Léo", 1, "new"]]);
  expect(await on("A", (m) => m.pairs.listPairs())).toHaveLength(1);

  // B keeps sending the answer until a week from A proves A has it.
  const pairB = async () => (await on("B", (m) => m.pairs.listPairs()))[0];
  expect((await pairB())?.reply).not.toBeNull();
  await send("A", local(3));
  expect((await pairB())?.reply).toBeNull();
});

test("both keep their week: the boss falls on both phones", async () => {
  await pairByLink();
  for (const day of [2, 4]) {
    outing("A", local(day));
    outing("B", local(day));
  }
  await send("B", local(5));
  const onB = await send("A", local(5, 13));
  // B is told at once, where the link opens, and the fall is counted without the card ever shown.
  assert(Array.isArray(onB));
  expect(onB.find((t) => t.isoWeek === 45)?.fallen).toBe(true);
  expect(await on("B", (m) => m.duo.fallenTogether())).toBe(1);
  expect(await resultOn("A", local(5, 14))).toBe("fallen");
  expect(await resultOn("B", local(5, 14))).toBe("fallen");
});

test("one misses: the boss flees on both phones, and neither says who", async () => {
  await pairByLink();
  outing("A", local(2));
  outing("A", local(4));
  outing("B", local(3));
  await send("B", local(8, 20));
  await send("A", local(8, 21));
  await send("B", local(10, 9));
  await send("A", local(10, 10));
  expect(await resultOn("A", local(10, 11))).toBe("fled");
  expect(await resultOn("B", local(10, 11))).toBe("fled");
});

test("one pauses without training: the week is frozen on both phones", async () => {
  await pairByLink();
  outing("A", local(2));
  outing("A", local(4));
  await send("B", local(3));
  await on("B", (m) => m.pause.startPause("2026-11-12", local(4)));
  await send("B", local(4, 13));
  await send("A", local(5));
  expect(await resultOn("A", local(10))).toBe("frozen");
  expect(await resultOn("B", local(10))).toBe("frozen");
});

test("a late envelope turns a fled week into a win, and a fall never goes back", async () => {
  await pairByLink();
  outing("A", local(2));
  outing("A", local(4));
  await send("B", local(2, 9));
  // B trained on Thursday and on Sunday, offline, and sent on Monday: that link carries last week
  // (F3), so the Sunday outing lands in Sunday's week. A opens it only a week later.
  outing("B", local(5));
  outing("B", local(8));
  const monday = await on("B", async (m) => {
    const [pair] = await m.pairs.listPairs();
    assert(pair);
    return m.send.coupsLink(pair, local(9, 10));
  });
  await send("A", local(9, 9));
  expect(await resultOn("A", local(17))).toBe("fled");

  await on("A", async (m) => {
    const read = await m.received.readCode(monday, "link");
    assert(read.kind === "weeks");
    return m.received.takeWeeks(read.weeks, local(17, 10));
  });
  expect(await resultOn("A", local(17, 11))).toBe("fallen");
  phones.A.sqlite.exec("DELETE FROM completed_sessions");
  expect(await resultOn("A", local(17, 12))).toBe("fallen");
});

test("a duplicate or an old envelope changes nothing", async () => {
  await pairByLink();
  outing("B", local(2));
  await send("B", local(2, 13));
  const old = await on("B", async (m) => {
    const [pair] = await m.pairs.listPairs();
    assert(pair);
    return m.send.coupsLink(pair, local(2, 14));
  });
  outing("B", local(3));
  await send("B", local(3, 13));
  const replayed = await on("A", async (m) => {
    const read = await m.received.readCode(old, "link");
    assert(read.kind === "weeks");
    return m.received.takeWeeks(read.weeks, local(4));
  });
  assert(Array.isArray(replayed));
  expect(replayed.map((t) => t.outcome)).toEqual(["same"]);
  const known = await on("A", async (m) => {
    const [pair] = await m.pairs.listPairs();
    assert(pair);
    return m.duo.theirWeek(pair.id, W45);
  });
  expect(known?.days).toEqual([1, 1, 0, 0, 0, 0, 0]);
});

test("a second pain stop in the week lands no hit, and the companion sees only the first", async () => {
  await pairByLink();
  outing("B", local(2), { stopReason: "pain" });
  outing("B", local(4), { stopReason: "pain" });
  const taken = await send("B", local(5));
  assert(Array.isArray(taken));
  expect(taken[0]?.hits).toBe(1);
});

test("a clock a week ahead invents no hit on the other phone", async () => {
  await pairByLink();
  outing("B", local(2));
  // B's clock reads the 12th while A's reads the 3rd.
  const link = await on("B", async (m) => {
    const [pair] = await m.pairs.listPairs();
    assert(pair);
    return m.send.coupsLink(pair, local(12));
  });
  await send("B", local(2, 13));
  const taken = await on("A", async (m) => {
    const read = await m.received.readCode(link, "link");
    assert(read.kind === "weeks");
    return m.received.takeWeeks(read.weeks, local(3));
  });
  assert(Array.isArray(taken));
  expect(taken.map((t) => t.outcome)).toEqual(["ahead", "ahead"]);
});
