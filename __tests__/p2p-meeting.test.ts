import vectors from "./fixtures/p2p/meeting-v1.json";

jest.mock("@/modules/bati-crypto", () => ({
  batiCrypto: () => jest.requireActual("./helpers/nodeBatiCrypto").nodeBatiCrypto,
}));

import { type NostrEvent, RelayPool, signEvent, verifyEvent } from "../src/nostrRelay";
import {
  decodeOffer,
  encodeOffer,
  MEETING_KIND,
  meetingTag,
  offerKey,
  openOffer,
  sealOffer,
} from "../src/p2p/meeting";
import { fakeRelays } from "./helpers/fakeRelays";

const fromHex = (hex: string) =>
  Uint8Array.from(hex.match(/../g) ?? [], (b) => Number.parseInt(b, 16));
const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const secret = fromHex(vectors.linkBytes);
const now = vectors.offer.expiresAt - 60;

describe("the meeting note, against the frozen vectors (N1 to N6)", () => {
  test.each(vectors.tags)("the tag of hour $hour", ({ hour, tag }) => {
    expect(meetingTag(secret, hour)).toBe(tag);
  });

  test("the offer key and the 256-byte plaintext", () => {
    expect(toHex(offerKey(secret))).toBe(vectors.sealBytes);
    expect(toHex(encodeOffer(vectors.offer))).toBe(vectors.plain);
    expect(decodeOffer(fromHex(vectors.plain))).toEqual(vectors.offer);
  });

  test("NIP-01 id and BIP-340 signature, byte for byte", () => {
    const { signerSeed, aux, created_at, kind, tags, content } = vectors.event;
    const signed = signEvent(
      fromHex(signerSeed),
      { created_at, kind, tags, content },
      fromHex(aux),
    );
    expect(signed.pubkey).toBe(vectors.event.pubkey);
    expect(signed.id).toBe(vectors.event.id);
    expect(signed.sig).toBe(vectors.event.sig);
    expect(verifyEvent(signed)).toBe(true);
    expect(verifyEvent({ ...signed, content: `${content}x` })).toBe(false);
  });
});

describe("sealing and opening an offer", () => {
  const offer = { expiresAt: now + 120, port: 47_000, addresses: ["192.168.1.23", "2a01:4a0::1"] };

  test("round trip, under the link only", async () => {
    const event = await sealOffer(secret, offer, now);
    expect(event.kind).toBe(MEETING_KIND);
    expect(event.created_at % 60).toBe(0);
    expect(await openOffer(secret, event, now)).toEqual(offer);
    expect(await openOffer(new Uint8Array(32), event, now)).toBeNull();
  });

  test("a note of another hour band, an old note, an expired offer, or a changed byte is ignored (C7, C8)", async () => {
    const event = await sealOffer(secret, offer, now);
    expect(await openOffer(secret, event, now + 3600)).toEqual(null); // offer expired by then too
    expect(await openOffer(secret, event, now + 2 * 3600)).toBeNull();
    expect(
      await openOffer(secret, { ...event, content: `A${event.content.slice(1)}` }, now),
    ).toBeNull();
    const expired = await sealOffer(secret, { ...offer, expiresAt: now - 1 }, now);
    expect(await openOffer(secret, expired, now)).toBeNull();
    const old = await sealOffer(secret, offer, now - 600);
    expect(await openOffer(secret, old, now)).toBeNull();
  });

  test("an hour boundary is crossed: the note of the hour before still opens (C8)", async () => {
    const hourStart = Math.ceil(now / 3600) * 3600;
    const event = await sealOffer(secret, { ...offer, expiresAt: hourStart + 100 }, hourStart - 30);
    expect(await openOffer(secret, event, hourStart + 30)).not.toBeNull();
  });

  test("every note has the same length and its own key (C11)", async () => {
    const one = await sealOffer(secret, { ...offer, addresses: ["10.0.0.1"] }, now);
    const many = await sealOffer(
      secret,
      { ...offer, addresses: ["10.0.0.1", "fe80::1", "2a01:4a0::1", "192.168.0.9"] },
      now,
    );
    expect(one.content.length).toBe(many.content.length);
    expect(one.pubkey).not.toBe(many.pubkey);
  });
});

describe("relays (N7, C4, C5)", () => {
  const original = globalThis.WebSocket;
  afterEach(() => {
    globalThis.WebSocket = original;
  });

  test("a note published reaches a subscriber once, through any relay up, and 1 of 3 down changes nothing", async () => {
    const relays = fakeRelays(["wss://b"]);
    globalThis.WebSocket = relays.FakeSocket as unknown as typeof WebSocket;
    const reader = new RelayPool(["wss://a", "wss://b", "wss://c"]);
    const writer = new RelayPool(["wss://a", "wss://b", "wss://c"]);
    const got: NostrEvent[] = [];
    reader.subscribe({ kinds: [MEETING_KIND] }, (e) => got.push(e));
    await new Promise((resolve) => setTimeout(resolve, 10));
    const event = await sealOffer(
      secret,
      { expiresAt: now + 60, port: 1, addresses: ["10.0.0.2"] },
      now,
    );
    expect(await writer.publish(event)).toBe(2);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(got.map((e) => e.id)).toEqual([event.id]);
    reader.close();
    writer.close();
  });

  test("a forged, oversize or malformed message from a relay is dropped", async () => {
    const relays = fakeRelays();
    globalThis.WebSocket = relays.FakeSocket as unknown as typeof WebSocket;
    const reader = new RelayPool(["wss://a"]);
    const got: NostrEvent[] = [];
    reader.subscribe({ kinds: [MEETING_KIND] }, (e) => got.push(e));
    await new Promise((resolve) => setTimeout(resolve, 10));
    const event = await sealOffer(
      secret,
      { expiresAt: now + 60, port: 1, addresses: ["10.0.0.2"] },
      now,
    );
    relays.deliver(JSON.stringify(["EVENT", "bati0", { ...event, sig: "00".repeat(64) }]));
    relays.deliver(JSON.stringify(["EVENT", "bati0", { ...event, content: "x".repeat(70_000) }]));
    relays.deliver("not json");
    expect(got).toEqual([]);
    reader.close();
  });

  test("every relay down: publishing reaches none, and nothing throws (C4)", async () => {
    const relays = fakeRelays(["wss://a", "wss://b"]);
    globalThis.WebSocket = relays.FakeSocket as unknown as typeof WebSocket;
    const pool = new RelayPool(["wss://a", "wss://b"]);
    const event = await sealOffer(secret, { expiresAt: now + 60, port: 1, addresses: [] }, now);
    expect(await pool.publish(event)).toBe(0);
    pool.close();
  });
});
