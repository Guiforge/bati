import assert from "node:assert/strict";

import { batiCrypto } from "../modules/bati-crypto";
import { fromHex, hex, readHeader } from "../src/multiplayer/envelope";
import { bytesOfLink, linkFor } from "../src/multiplayer/link";
import {
  decodeLinkInvite,
  derivePairKey,
  encodeLinkInvite,
  newKeyPair,
  publicKeyOf,
  readReply,
  replyOpens,
  sealReply,
} from "../src/multiplayer/linkInvite";
import frozenV1 from "./fixtures/multiplayer/envelope-v1.json";
import vectors from "./fixtures/multiplayer/envelope-v1-link.json";
import { nodeBatiCrypto } from "./helpers/nodeBatiCrypto";

jest.mock("../modules/bati-crypto", () => ({ batiCrypto: jest.fn() }));

beforeEach(() => {
  jest.mocked(batiCrypto).mockReturnValue(nodeBatiCrypto);
});

const invite = {
  pairId: vectors.pairId,
  senderId: vectors.inviterId,
  madeAt: vectors.madeAt,
  publicKey: vectors.inviterPublic,
};
const context = {
  pairId: vectors.pairId,
  inviterPublic: vectors.inviterPublic,
  joinerPublic: vectors.joinerPublic,
};
const bytes = (value: string) => fromHex(value, value.length / 2);
const NOW = vectors.madeAt + 60;

describe("frozen vectors, written by Node's own crypto", () => {
  test("this code derives the same public keys", () => {
    expect(publicKeyOf(vectors.inviterSecret)).toBe(vectors.inviterPublic);
    expect(publicKeyOf(vectors.joinerSecret)).toBe(vectors.joinerPublic);
  });

  test("both sides derive the frozen key", () => {
    expect(derivePairKey(vectors.inviterSecret, vectors.joinerPublic, context)).toBe(
      vectors.pairKey,
    );
    expect(derivePairKey(vectors.joinerSecret, vectors.inviterPublic, context)).toBe(
      vectors.pairKey,
    );
  });

  test("this code writes the frozen invite byte for byte, and reads it back", () => {
    const written = encodeLinkInvite(invite);
    expect(hex(written)).toBe(vectors.inviteHex);
    expect(linkFor(written)).toBe(vectors.inviteLink);
    expect(decodeLinkInvite(written, NOW)).toEqual(invite);
  });

  test("this code opens the frozen reply, and writes the same clear part", async () => {
    const reply = bytes(vectors.replyHex);
    expect(bytesOfLink(vectors.replyLink)).toEqual(reply);
    expect(readReply(reply)).toEqual({
      pairId: vectors.pairId,
      senderId: vectors.joinerId,
      publicKey: vectors.joinerPublic,
    });
    await expect(replyOpens(vectors.pairKey, reply)).resolves.toBe(true);

    const mine = await sealReply(
      vectors.pairKey,
      { pairId: vectors.pairId, senderId: vectors.joinerId, publicKey: vectors.joinerPublic },
      vectors.repliedAt,
    );
    expect(hex(mine.subarray(0, vectors.replyClearHex.length / 2))).toBe(vectors.replyClearHex);
    expect(mine.length).toBe(reply.length);
    await expect(replyOpens(vectors.pairKey, mine)).resolves.toBe(true);
  });

  test("the first vectors keep their meaning: a new kind, never a new reading of an old one", () => {
    expect(frozenV1.invite.hex.slice(0, 4)).toBe("0102");
    expect(frozenV1.week.headerHex.slice(0, 4)).toBe("0101");
    expect(vectors.inviteHex.slice(0, 4)).toBe("0103");
    expect(vectors.replyHex.slice(0, 4)).toBe("0104");
  });
});

describe("what the chat holds", () => {
  test("the invitation is 65 bytes and holds none of the private key or the pair's key", () => {
    const written = encodeLinkInvite(invite);
    expect(written).toHaveLength(65);
    const text = hex(written);
    expect(text).not.toContain(hex(Buffer.from(vectors.inviterSecret, "base64")));
    expect(text).not.toContain(vectors.pairKeyHex);
  });

  test("the answer is 93 bytes and holds neither the pair's key nor a private key", () => {
    expect(vectors.replyHex).toHaveLength(93 * 2);
    expect(vectors.replyHex).not.toContain(vectors.pairKeyHex);
    expect(vectors.replyHex).not.toContain(hex(Buffer.from(vectors.joinerSecret, "base64")));
  });

  test("both public keys are not enough: someone with only the chat derives another key", async () => {
    const eavesdropper = await newKeyPair();
    const guess = derivePairKey(eavesdropper.secret, vectors.joinerPublic, context);
    expect(guess).not.toBe(vectors.pairKey);
    assert(guess !== null);
    await expect(replyOpens(guess, bytes(vectors.replyHex))).resolves.toBe(false);
  });
});

describe("what gets refused", () => {
  test("an invitation past seven days, or from far ahead", () => {
    const written = encodeLinkInvite(invite);
    const days = (n: number) => vectors.madeAt + n * 86_400;
    expect(decodeLinkInvite(written, days(7))).not.toBeNull();
    expect(decodeLinkInvite(written, days(7) + 1)).toBeNull();
    expect(decodeLinkInvite(written, vectors.madeAt - 86_400)).not.toBeNull();
    expect(decodeLinkInvite(written, vectors.madeAt - 86_401)).toBeNull();
  });

  test("the other kinds, and anything cut short", () => {
    expect(decodeLinkInvite(bytes(frozenV1.invite.hex), frozenV1.invite.madeAt)).toBeNull();
    expect(decodeLinkInvite(bytes(vectors.inviteHex).subarray(0, 64), NOW)).toBeNull();
    expect(readReply(bytes(vectors.inviteHex))).toBeNull();
    expect(readReply(bytes(vectors.replyHex).subarray(0, 92))).toBeNull();
    expect(readReply(bytes(frozenV1.week.envelopeHex))).toBeNull();
  });

  test("every altered byte of an answer, its public key and header included", async () => {
    const reply = bytes(vectors.replyHex);
    for (let at = 0; at < reply.length; at++) {
      const altered = reply.slice();
      altered[at] = (altered[at] ?? 0) ^ 1;
      await expect(replyOpens(vectors.pairKey, altered)).resolves.toBe(false);
    }
  });

  test("a public key changed on the way derives a different key on the other side", async () => {
    const other = await newKeyPair();
    const swapped = derivePairKey(vectors.inviterSecret, other.publicKey, {
      ...context,
      joinerPublic: other.publicKey,
    });
    expect(swapped).not.toBe(vectors.pairKey);
  });

  test("a low-order public key yields no key at all", () => {
    const zero = Buffer.alloc(32).toString("base64");
    expect(
      derivePairKey(vectors.inviterSecret, zero, { ...context, joinerPublic: zero }),
    ).toBeNull();
  });

  test("the header says what it says on every kind", () => {
    expect(readHeader(bytes(vectors.replyHex)).senderId).toBe(vectors.joinerId);
    expect(readHeader(bytes(vectors.inviteHex)).pairId).toBe(vectors.pairId);
  });
});
