import fs from "node:fs";
import tls from "node:tls";
import { type PairingCode, readCode } from "../src/p2p/code";
import { encodeFrame } from "../src/p2p/frames";
import type { SessionView } from "../src/p2p/session";
import { disk } from "../test/node/harness/fakeExpoFs";
import { fakeRelays } from "./helpers/fakeRelays";
import { type Lan, makeIdentity, makeLan } from "./helpers/nodeBatiP2p";
import { fileOf, type P2pPeer, p2pPeer, viewOf } from "./helpers/p2pPeer";

jest.setTimeout(30_000);

type Opened = {
  peer: P2pPeer;
  views: SessionView[];
  session: ReturnType<P2pPeer["session"]["openSession"]>;
};

function open(
  peer: P2pPeer,
  role: Parameters<P2pPeer["session"]["openSession"]>[0],
  onPeerFile?: () => void,
): Opened {
  const views: SessionView[] = [];
  const session = peer.session.openSession(role, {
    onChange: (view) => views.push(view),
    onPeerFile,
  });
  return { peer, views, session };
}

/** A shows a code, B reads it, A says yes: both hold the link. */
async function pair(a: P2pPeer, b: P2pPeer) {
  const shown = open(a, { kind: "show" });
  const code = await viewOf(shown.views, (v) => v.step === "code").catch((e) => {
    throw new Error(`${e} ${JSON.stringify(a.reports.map((r) => String(r.error)))}`);
  });
  if (code.step !== "code") throw new Error("no code");
  const read = readCode(code.text, Math.floor(Date.now() / 1000));
  if (!read.ok) throw new Error(read.reason);
  const scanning = open(b, { kind: "scan", code: read.code });
  await viewOf(shown.views, (v) => v.step === "confirm");
  return { shown, scanning, code: code.text };
}

const ended = (o: Opened) => viewOf(o.views, (v) => v.step === "ended");

afterEach(() => {
  disk.available = Number.MAX_SAFE_INTEGER;
});

describe("pairing (L4, L5)", () => {
  test("A confirms, then both hold the same secret and each other's pinned ID", async () => {
    const lan = makeLan();
    const a = p2pPeer(lan, "Pixel A");
    const b = p2pPeer(lan, "Pixel B");
    const { shown, scanning } = await pair(a, b);
    const confirm = shown.views.find((v) => v.step === "confirm");
    expect(confirm).toEqual({
      step: "confirm",
      name: "Pixel B",
      suffix: b.p2p.identity.id.slice(-4).toUpperCase(),
      again: false,
      sas: expect.stringMatching(/^\d{3} \d{3}$/),
    });
    // The check number on A is the one B shows while it waits (L4).
    const onB = await viewOf(scanning.views, (v) => v.step === "waiting" && v.sas !== undefined);
    expect(onB.step === "waiting" && onB.sas).toBe(confirm?.step === "confirm" && confirm.sas);
    // Nothing pinned before the hero answers (L4).
    expect(await a.link.readLink()).toBeNull();
    await shown.session.confirm(true);
    await viewOf(scanning.views, () => b.secure.has("bati.p2p.link"));
    const linkA = await a.link.readLink();
    const linkB = await b.link.readLink();
    expect(linkA?.peerId).toBe(b.p2p.identity.id);
    expect(linkB?.peerId).toBe(a.p2p.identity.id);
    expect(linkA?.secret).toBe(linkB?.secret);
    expect(linkA?.name).toBe("Pixel B");
    expect(linkB?.name).toBe("Pixel A");
    expect(linkB?.addresses).toEqual([expect.objectContaining({ host: "127.0.0.1" })]);
    shown.session.cancel();
    scanning.session.cancel();
  });

  test("'Not this one' pins nothing on A, and B is told the code no longer works", async () => {
    const lan = makeLan();
    const a = p2pPeer(lan, "A");
    const b = p2pPeer(lan, "B");
    const { shown, scanning } = await pair(a, b);
    await shown.session.confirm(false);
    expect(await ended(scanning)).toEqual({ step: "ended", cause: "codeExpired" });
    expect(await a.link.readLink()).toBeNull();
    expect(await b.link.readLink()).toBeNull();
  });

  test("a code with another token is refused, and nothing is pinned (L5)", async () => {
    const lan = makeLan();
    const a = p2pPeer(lan, "A");
    const b = p2pPeer(lan, "B");
    const shown = open(a, { kind: "show" });
    const code = await viewOf(shown.views, (v) => v.step === "code");
    if (code.step !== "code") throw new Error("no code");
    const read = readCode(code.text, Math.floor(Date.now() / 1000));
    if (!read.ok) throw new Error(read.reason);
    const forged = { ...read.code, token: new Uint8Array(32) };
    const scanning = open(b, { kind: "scan", code: forged });
    expect(await ended(scanning)).toEqual({ step: "ended", cause: "codeExpired" });
    // A wrong token costs that socket only: A still shows its code, which still works (audit 08/11).
    expect(shown.views.some((v) => v.step === "ended")).toBe(false);
    expect(shown.views.at(-1)?.step).toBe("code");
    expect(await a.link.readLink()).toBeNull();
    const c = p2pPeer(lan, "C");
    const real = open(c, { kind: "scan", code: read.code });
    await viewOf(shown.views, (v) => v.step === "confirm");
    shown.session.cancel();
    real.session.cancel();
  });

  test("a code naming another device ID never connects (A6)", async () => {
    const lan = makeLan();
    const a = p2pPeer(lan, "A");
    const b = p2pPeer(lan, "B");
    jest.spyOn(Date, "now");
    const shown = open(a, { kind: "show" });
    const code = await viewOf(shown.views, (v) => v.step === "code");
    if (code.step !== "code") throw new Error("no code");
    const read = readCode(code.text, Math.floor(Date.now() / 1000));
    if (!read.ok) throw new Error(read.reason);
    const swapped = { ...read.code, deviceId: new Uint8Array(32).fill(7) };
    const scanning = open(b, { kind: "scan", code: swapped });
    // Ends at the 30 s search: the only device there failed the pin.
    expect(await viewOf(scanning.views, (v) => v.step === "ended", 8_000)).toEqual({
      step: "ended",
      cause: "notInSight",
    });
    expect(shown.views.some((v) => v.step === "confirm")).toBe(false);
    shown.session.cancel();
  }, 15_000);
});

describe("transfer (T1 to T5, S2, S4)", () => {
  async function linked() {
    const lan = makeLan();
    const a = p2pPeer(lan, "A");
    const b = p2pPeer(lan, "B");
    const { shown, scanning } = await pair(a, b);
    await shown.session.confirm(true);
    await viewOf(scanning.views, () => b.secure.has("bati.p2p.link"));
    shown.session.cancel();
    scanning.session.cancel();
    const linkA = await a.link.readLink();
    const linkB = await b.link.readLink();
    if (!linkA || !linkB) throw new Error("not linked");
    return { lan, a, b, linkA, linkB };
  }

  test("a written file reaches the peer whole, verified, under its pinned name, and the write waits for the ack", async () => {
    const { a, b, linkA, linkB } = await linked();
    const passes: number[] = [];
    const onA = open(a, { kind: "sync", link: linkA });
    const onB = open(b, { kind: "sync", link: linkB }, () => passes.push(1));
    // Both outboxes are empty: each one's first pass sees nothing (S2).
    expect(await onB.session.peerFile()).toBeNull();
    const { file, bytes } = fileOf(a, 300 * 1024 + 17);
    const name = `bati-${linkB.peerInstallId}.batb`;
    const sha = await onA.session.send(file, name).catch((e) => {
      throw new Error(
        `${e} A:${JSON.stringify(onA.views)} B:${JSON.stringify(onB.views)} ${[...a.reports, ...b.reports].map((r) => `${r.context} ${String(r.error)}`)}`,
      );
    });
    expect(sha).toMatch(/^[0-9a-f]{64}$/);
    const got = b.transfer.received();
    expect(got?.sha).toBe(sha);
    expect(got?.file.name).toBe(name);
    expect(bytesOf(got?.file.uri)).toEqual(bytes);
    // The arrival asked for a second pass (S2b).
    expect(passes.length).toBe(2);
    onA.session.cancel();
    onB.session.cancel();
  });

  test("a file under any other name is refused and nothing is written (S5)", async () => {
    const { a, b, linkA, linkB } = await linked();
    const onA = open(a, { kind: "sync", link: linkA });
    const onB = open(b, { kind: "sync", link: linkB });
    await onB.session.peerFile();
    const { file } = fileOf(a, 1000);
    await expect(
      onA.session.send(file, "bati-00000000-0000-0000-0000-000000000000.batb"),
    ).rejects.toThrow();
    expect(await ended(onB)).toEqual({ step: "ended", cause: "interrupted" });
    expect(b.transfer.received()).toBeNull();
  });

  test("a full phone says so before a byte is written (B11)", async () => {
    const { a, b, linkA, linkB } = await linked();
    const onA = open(a, { kind: "sync", link: linkA });
    const onB = open(b, { kind: "sync", link: linkB });
    await onB.session.peerFile();
    disk.available = 10;
    const { file } = fileOf(a, 1000);
    await expect(onA.session.send(file, `bati-${linkB.peerInstallId}.batb`)).rejects.toThrow();
    expect(await ended(onB)).toEqual({ step: "ended", cause: "noSpace" });
  });

  test("blocks that do not match their hash are asked again, and three end the session (T2)", async () => {
    const { a, b, linkA, linkB } = await linked();
    const onA = open(a, { kind: "sync", link: linkA });
    const onB = open(b, { kind: "sync", link: linkB });
    await onB.session.peerFile();
    const { file } = fileOf(a, 3 * 128 * 1024);
    const name = `bati-${linkB.peerInstallId}.batb`;
    // The disk changes under the announced hashes: every block A reads is now wrong.
    jest.spyOn(a.transfer, "readBlock").mockResolvedValue(new Uint8Array(128 * 1024).fill(9));
    await expect(onA.session.send(file, name)).rejects.toThrow();
    expect(await ended(onB)).toEqual({ step: "ended", cause: "interrupted" });
    expect(b.transfer.received()).toBeNull();
  });

  test("a cut halfway leaves a .part that the next session resumes (T4, B6)", async () => {
    const { lan, a, b, linkA, linkB } = await linked();
    const size = 40 * 128 * 1024;
    const { file, bytes } = fileOf(a, size, 3);
    const name = `bati-${linkB.peerInstallId}.batb`;
    const first = open(a, { kind: "sync", link: linkA });
    const firstB = open(b, { kind: "sync", link: linkB });
    await firstB.session.peerFile();
    // Blocks from 20 on wait for the cut, and the cut waits out CROSS_GRACE_MS (3 s): inside it a
    // closed channel waits for a crossed dial, and on a loaded runner that dial landed after
    // cutAll(), carried the rest of the file, and the send came back with its hash, not "cut".
    let releaseHeld = () => {};
    const held = new Promise<void>((resolve) => {
      releaseHeld = resolve;
    });
    const readBlock = a.transfer.readBlock;
    const holding = jest.spyOn(a.transfer, "readBlock").mockImplementation(async (f, index) => {
      if (index >= 20) await held;
      return readBlock(f, index);
    });
    const sending = first.session.send(file, name).catch(() => "cut");
    await viewOf(firstB.views, (v) => v.step === "receiving" && v.done >= 10 * 128 * 1024);
    await new Promise((resolve) => setTimeout(resolve, 3_200));
    a.p2p.cutAll();
    releaseHeld();
    expect(await sending).toBe("cut");
    holding.mockRestore();
    expect(b.transfer.received()).toBeNull();
    const before = lanBytes(lan);
    // Next session: A's outbox is announced again, and B asks only for what it lacks.
    const second = open(a, { kind: "sync", link: linkA });
    const secondB = open(b, { kind: "sync", link: linkB });
    await secondB.session.peerFile();
    const got = b.transfer.received();
    expect(bytesOf(got?.file.uri)).toEqual(bytes);
    expect(lanBytes(lan) - before).toBeLessThan(size * 0.95);
    second.session.cancel();
    secondB.session.cancel();
  });

  test("with mDNS dropped by the router, the address kept at pairing still meets, whichever ID is lower (B19)", async () => {
    // Four pairs: the IDs are random, so both orders (the code's shower lower or higher) come up.
    for (let round = 0; round < 4; round++) {
      const { lan, a, b, linkA, linkB } = await linked();
      lan.mdnsBlocked = true;
      expect(linkB.addresses.length + linkA.addresses.length).toBeGreaterThan(0);
      const onA = open(a, { kind: "sync", link: linkA });
      const onB = open(b, { kind: "sync", link: linkB });
      expect(await onB.session.peerFile()).toBeNull();
      expect(await onA.session.peerFile()).toBeNull();
      onA.session.cancel();
      onB.session.cancel();
    }
  }, 60_000);

  test("a device that opens its sheet seconds after the other still meets it (code review 08/11)", async () => {
    for (let round = 0; round < 2; round++) {
      const { a, b, linkA, linkB } = await linked();
      const first = round === 0 ? { peer: a, link: linkA } : { peer: b, link: linkB };
      const second = round === 0 ? { peer: b, link: linkB } : { peer: a, link: linkA };
      const early = open(first.peer, { kind: "sync", link: first.link });
      await new Promise((resolve) => setTimeout(resolve, 3_500));
      const late = open(second.peer, { kind: "sync", link: second.link });
      expect(await late.session.peerFile()).toBeNull();
      expect(await early.session.peerFile()).toBeNull();
      early.session.cancel();
      late.session.cancel();
    }
  }, 40_000);

  test("a write with no peer connected throws, so nothing is marked sent (S4)", async () => {
    const { a, linkA } = await linked();
    const onA = open(a, { kind: "sync", link: linkA });
    const { file } = fileOf(a, 100);
    await expect(onA.session.send(file, "x.batb")).rejects.toThrow(
      "The other device is not connected",
    );
    onA.session.cancel();
  });
});

/** Every byte that crossed the Wi-Fi so far, both ways. */
const lanBytes = (lan: Lan) => lan.seen.reduce((sum, chunk) => sum + chunk.length, 0);

const bytesOf = (uri: string | undefined) =>
  new Uint8Array(fs.readFileSync(decodeURI((uri ?? "").replace(/^file:\/\//, ""))));

describe("over the internet, two different networks (C1 to C3)", () => {
  const original = globalThis.WebSocket;
  afterEach(() => {
    globalThis.WebSocket = original;
  });

  /** Two devices already linked, each on a Wi-Fi of its own: NSD can never find the other. */
  function apart(options: { advertise?: string[] } = {}) {
    const one = makeIdentity();
    const two = makeIdentity();
    const [low, high] = one.id < two.id ? [one, two] : [two, one];
    // The higher ID listens (and publishes the offer); the lower one dials.
    const dialer = p2pPeer(makeLan(), "dialer", { identity: low });
    const listener = p2pPeer(makeLan(), "listener", { identity: high, ...options });
    const secret = "ab".repeat(32);
    const linkOf = (peer: P2pPeer, install: string) => ({
      peerId: peer.p2p.identity.id,
      peerInstallId: install,
      secret,
      name: peer.name,
      addresses: [],
    });
    return {
      dialer,
      listener,
      dialerLink: linkOf(listener, "11111111-1111-1111-1111-111111111111"),
      listenerLink: linkOf(dialer, "22222222-2222-2222-2222-222222222222"),
    };
  }

  test("they meet through a relay and connect directly (C1)", async () => {
    const relays = fakeRelays();
    globalThis.WebSocket = relays.FakeSocket as unknown as typeof WebSocket;
    const { dialer, listener, dialerLink, listenerLink } = apart();
    const onL = open(listener, { kind: "sync", link: listenerLink, internet: true });
    const onD = open(dialer, { kind: "sync", link: dialerLink, internet: true });
    expect(await onD.session.peerFile()).toBeNull();
    expect(onD.views.some((v) => v.step === "connected")).toBe(true);
    // What the relay carried: notes of one kind, one tag, and no address in the clear.
    expect(relays.published.length).toBeGreaterThan(0);
    expect(JSON.stringify(relays.published)).not.toContain("127.0.0.1");
    onL.session.cancel();
    onD.session.cancel();
  });

  test("met, but the address it gave does not answer: 'unreachable' (C2)", async () => {
    const relays = fakeRelays();
    globalThis.WebSocket = relays.FakeSocket as unknown as typeof WebSocket;
    const { dialer, listener, dialerLink, listenerLink } = apart({ advertise: ["127.0.0.2"] });
    const onL = open(listener, { kind: "sync", link: listenerLink, internet: true });
    const onD = open(dialer, { kind: "sync", link: dialerLink, internet: true });
    expect(await viewOf(onD.views, (v) => v.step === "ended", 8_000)).toEqual({
      step: "ended",
      cause: "unreachable",
    });
    onL.session.cancel();
  }, 15_000);

  test("the switch off on one side: no meeting, and that side sends nothing to any relay (C3, N7)", async () => {
    const relays = fakeRelays();
    globalThis.WebSocket = relays.FakeSocket as unknown as typeof WebSocket;
    const { dialer, listener, dialerLink, listenerLink } = apart();
    const onL = open(listener, { kind: "sync", link: listenerLink });
    const onD = open(dialer, { kind: "sync", link: dialerLink, internet: true });
    expect(await viewOf(onD.views, (v) => v.step === "ended", 8_000)).toEqual({
      step: "ended",
      cause: "notInSight",
    });
    expect(relays.published).toEqual([]);
    onL.session.cancel();
  }, 15_000);
});

describe("a stranger during pairing (security audit 08/11)", () => {
  /** A raw TLS client with a certificate of its own, as a phone on the same Wi-Fi would have. */
  function stranger(port: number) {
    const me = makeIdentity();
    return tls.connect({
      host: "127.0.0.1",
      port,
      key: me.key,
      cert: me.cert,
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined,
    });
  }

  async function showing() {
    const lan = makeLan();
    const a = p2pPeer(lan, "A");
    const shown = open(a, { kind: "show" });
    const code = await viewOf(shown.views, (v) => v.step === "code");
    if (code.step !== "code") throw new Error("no code");
    const read = readCode(code.text, Math.floor(Date.now() / 1000));
    if (!read.ok) throw new Error(read.reason);
    return { lan, a, shown, read: read.code };
  }

  /** The real B, after the stranger: it must still pair with the same code. */
  async function realPairs(lan: Lan, shown: Opened, code: PairingCode) {
    const b = p2pPeer(lan, "B");
    const scanning = open(b, { kind: "scan", code });
    await viewOf(shown.views, (v) => v.step === "confirm");
    shown.session.cancel();
    scanning.session.cancel();
  }

  test("silence, a forbidden frame, or a flood costs that socket only, and the code still pairs", async () => {
    const { lan, shown, read } = await showing();
    const port = read.lan.port;
    // A flood of junk past the 1 KB allowed before the token.
    const flood = stranger(port);
    await new Promise((resolve) => flood.once("secureConnect", resolve));
    flood.write(Buffer.concat([Buffer.from([1]), Buffer.alloc(4096, 7)]));
    await new Promise((resolve) => flood.once("close", resolve));
    // A frame A never takes before pairing: a bye that used to end the whole session.
    const rude = stranger(port);
    await new Promise((resolve) => rude.once("secureConnect", resolve));
    rude.write(
      Buffer.concat([Buffer.from([1]), Buffer.from(encodeFrame({ type: "bye", reason: 1 }))]),
    );
    await new Promise((resolve) => rude.once("close", resolve));
    expect(shown.views.some((v) => v.step === "ended" || v.step === "connected")).toBe(false);
    await realPairs(lan, shown, read);
  });

  test("a stranger that holds the only slot in silence is let go after 5 s", async () => {
    const { lan, shown, read } = await showing();
    const quiet = stranger(read.lan.port);
    await new Promise((resolve) => quiet.once("secureConnect", resolve));
    quiet.on("data", () => undefined);
    const closedAt = await new Promise<number>((resolve) =>
      quiet.once("close", () => resolve(Date.now())),
    );
    expect(closedAt).toBeGreaterThan(0);
    await realPairs(lan, shown, read);
  }, 20_000);
});

describe("B leaves while A decides (code review 08/11)", () => {
  test("the code was not used, so it works again for the next device", async () => {
    const lan = makeLan();
    const a = p2pPeer(lan, "A");
    const b = p2pPeer(lan, "B");
    const { shown, scanning, code } = await pair(a, b);
    b.p2p.cutAll();
    await viewOf(shown.views, () => shown.views.filter((v) => v.step === "code").length === 2);
    scanning.session.cancel();
    const read = readCode(code, Math.floor(Date.now() / 1000));
    if (!read.ok) throw new Error(read.reason);
    const c = p2pPeer(lan, "C");
    const retry = open(c, { kind: "scan", code: read.code });
    const confirms = () => shown.views.filter((v) => v.step === "confirm").length;
    await viewOf(shown.views, () => confirms() === 2);
    expect(confirms()).toBe(2);
    shown.session.cancel();
    retry.session.cancel();
  });
});

describe("addresses and check numbers", () => {
  test("a code or NSD may only send this device to its own networks", () => {
    const { isLocalAddress } = p2pPeer(makeLan(), "A").session;
    for (const ok of ["10.1.2.3", "172.20.0.1", "192.168.1.9", "169.254.3.4", "fe80::1", "fd12::3"])
      expect(isLocalAddress(ok)).toBe(true);
    for (const no of ["8.8.8.8", "172.32.0.1", "2a01:4a0::1", "1.1.1.1"])
      expect(isLocalAddress(no)).toBe(false);
  });

  test("the check number depends on both devices: a stranger's differs from B's", () => {
    const { checkNumber } = p2pPeer(makeLan(), "A").session;
    const a = new Uint8Array(32).fill(1);
    const b = new Uint8Array(32).fill(2);
    const stranger = new Uint8Array(32).fill(3);
    const token = new Uint8Array(32).fill(9);
    expect(checkNumber(a, b, token)).toMatch(/^\d{3} \d{3}$/);
    expect(checkNumber(a, b, token)).toBe(checkNumber(a, b, token));
    expect(checkNumber(a, stranger, token)).not.toBe(checkNumber(a, b, token));
  });
});
