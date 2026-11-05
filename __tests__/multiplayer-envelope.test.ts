import assert from "node:assert/strict";

import { batiCrypto } from "../modules/bati-crypto";
import {
  ENVELOPE_VERSION,
  fromBase64Url,
  fromHex,
  hex,
  MAX_ENVELOPE_BYTES,
  mergeWeek,
  openEnvelope,
  readHeader,
  sealWeek,
  toBase64Url,
  type WeekState,
} from "../src/multiplayer/envelope";
import { decodeInvite, encodeInvite, INVITE_DAYS } from "../src/multiplayer/invite";
import { bytesOfLink, linkFor } from "../src/multiplayer/link";
import vectors from "./fixtures/multiplayer/envelope-v1.json";
import { nodeBatiCrypto } from "./helpers/nodeBatiCrypto";

jest.mock("../modules/bati-crypto", () => ({ batiCrypto: jest.fn() }));

beforeEach(() => {
  jest.mocked(batiCrypto).mockReturnValue(nodeBatiCrypto);
});

const { key, week, invite } = vectors;
const header = {
  pairId: week.pairId,
  senderId: week.senderId,
  isoYear: week.isoYear,
  isoWeek: week.isoWeek,
};
const state: WeekState = {
  stamp: week.stamp,
  goal: week.goal,
  paused: week.paused,
  days: week.days,
};
const frozen = () => fromHex(week.envelopeHex, week.envelopeHex.length / 2);
const ME = "ffffffffffffffff";

describe("frozen vectors", () => {
  test("the bytes written by the vector's own encoder open to the same week", async () => {
    await expect(openEnvelope(key, frozen(), ME)).resolves.toEqual({ kind: "ok", header, state });
  });

  test("this code writes the frozen header, byte for byte", async () => {
    const sealed = await sealWeek(key, header, state);
    expect(hex(sealed.subarray(0, week.headerHex.length / 2))).toBe(week.headerHex);
    expect(sealed.length).toBe(frozen().length);
  });

  test("the frozen link reads back to the frozen bytes", () => {
    expect(bytesOfLink(week.link)).toEqual(frozen());
    expect(linkFor(frozen())).toBe(week.link);
  });

  test("this code writes the frozen invite, byte for byte", () => {
    const { hex: bytes, link, ...fields } = invite;
    expect(hex(encodeInvite(fields))).toBe(bytes);
    expect(linkFor(encodeInvite(fields))).toBe(link);
  });
});

describe("budget", () => {
  test("a week fits a comfortable QR and a link fragment many times over", () => {
    expect(frozen().length).toBeLessThanOrEqual(100);
    expect(week.link.length).toBeLessThan(160);
  });

  test("anything past the budget is refused before a key touches it", async () => {
    const long = new Uint8Array(MAX_ENVELOPE_BYTES + 1);
    long[0] = ENVELOPE_VERSION;
    await expect(openEnvelope(key, long, ME)).resolves.toEqual({ kind: "notThis" });
  });
});

describe("what is refused", () => {
  test("every single byte altered, header included", async () => {
    const good = frozen();
    for (let i = 2; i < good.length; i++) {
      const bad = good.slice();
      bad[i] = (bad[i] ?? 0) ^ 1;
      await expect(openEnvelope(key, bad, ME)).resolves.toEqual({ kind: "refused" });
    }
  });

  test("a wrong key", async () => {
    const other = await nodeBatiCrypto.randomBytes(32);
    await expect(openEnvelope(other, frozen(), ME)).resolves.toEqual({ kind: "refused" });
  });

  test("an older and a newer version each get their own answer", async () => {
    const old = frozen();
    old[0] = 0;
    await expect(openEnvelope(key, old, ME)).resolves.toEqual({ kind: "oldVersion" });
    const newer = frozen();
    newer[0] = ENVELOPE_VERSION + 1;
    await expect(openEnvelope(key, newer, ME)).resolves.toEqual({ kind: "newerVersion" });
  });

  test("the hero's own message coming back, which the shared key would authenticate", async () => {
    await expect(openEnvelope(key, frozen(), week.senderId)).resolves.toEqual({ kind: "own" });
  });

  test("an empty or cut-short envelope, or an unknown kind", async () => {
    await expect(openEnvelope(key, new Uint8Array(0), ME)).resolves.toEqual({ kind: "notThis" });
    await expect(openEnvelope(key, frozen().subarray(0, 40), ME)).resolves.toEqual({
      kind: "notThis",
    });
    const kind = frozen();
    kind[1] = 99;
    await expect(openEnvelope(key, kind, ME)).resolves.toEqual({ kind: "notThis" });
  });

  test("values a byte cannot hold are refused at sealing, not wrapped", async () => {
    await expect(sealWeek(key, header, { ...state, goal: 256 })).rejects.toThrow();
    await expect(sealWeek(key, header, { ...state, days: [1, 2, 3] })).rejects.toThrow();
  });
});

describe("merge", () => {
  const later = { ...state, stamp: state.stamp + 60, days: [2, 0, 1, 0, 0, 0, 0] };

  test("a duplicate changes nothing", () => {
    expect(mergeWeek(state, { ...state })).toEqual(state);
  });

  test("the later stamp wins whichever arrives first, so a lost message costs nothing", () => {
    expect(mergeWeek(state, later)).toEqual(later);
    expect(mergeWeek(later, state)).toEqual(later);
    expect(mergeWeek(null, state)).toEqual(state);
  });

  test("two states of one second settle the same on both phones", () => {
    const tied = { ...state, days: [1, 1, 1, 0, 0, 0, 0] };
    expect(mergeWeek(state, tied)).toEqual(mergeWeek(tied, state));
  });

  test("the goal in force is the sender's frozen one, whatever the receiver's oath says now", async () => {
    const sealed = await sealWeek(key, header, { ...state, goal: 4 });
    const opened = await openEnvelope(key, sealed, ME);
    assert(opened.kind === "ok");
    expect(opened.state.goal).toBe(4);
  });
});

describe("base64url", () => {
  test("round trips every byte value, with nothing a URL has to escape", () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    const text = toBase64Url(all);
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(fromBase64Url(text)).toEqual(all);
  });

  test("refuses what is not canonical", () => {
    for (const bad of ["", "a", "a=", "a b", "Zm9v+", "%41"]) {
      expect(fromBase64Url(bad)).toBeNull();
    }
    // Same byte, spare bits set: two spellings of one code would let a seen code look new.
    expect(fromBase64Url("Zg")).not.toBeNull();
    expect(fromBase64Url("Zh")).toBeNull();
  });
});

describe("links", () => {
  test("only our two prefixes, and only a bounded length", () => {
    const good = week.link.split("#")[1];
    expect(bytesOfLink(`bati://d#${good}`)).toEqual(frozen());
    expect(bytesOfLink(`https://evil.example/d#${good}`)).toBeNull();
    expect(bytesOfLink(`https://getbati.app/d?${good}`)).toBeNull();
    expect(bytesOfLink(`https://getbati.app/d#${"A".repeat(2000)}`)).toBeNull();
  });
});

describe("invite", () => {
  const { hex: bytes, link: _link, ...fields } = invite;
  const raw = () => fromHex(bytes, bytes.length / 2);

  test("reads back while it is fresh, and the clear header is the envelope's", () => {
    expect(decodeInvite(raw(), invite.madeAt + 60)).toEqual(fields);
    expect(readHeader(raw()).pairId).toBe(invite.pairId);
  });

  test("stops being accepted after its days, and from a far future clock", () => {
    const day = 86_400;
    expect(decodeInvite(raw(), invite.madeAt + INVITE_DAYS * day)).not.toBeNull();
    expect(decodeInvite(raw(), invite.madeAt + INVITE_DAYS * day + 1)).toBeNull();
    expect(decodeInvite(raw(), invite.madeAt - 2 * day)).toBeNull();
  });

  test("a week envelope is not an invite", () => {
    expect(decodeInvite(frozen(), invite.madeAt)).toBeNull();
  });
});
