import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import type { File } from "expo-file-system";

import { batiCrypto } from "@/modules/bati-crypto";
import { batiP2p } from "@/modules/bati-p2p";
import { installId } from "@/src/installId";
import { fromBase64 } from "@/src/multiplayer/envelope";
import { RelayPool } from "@/src/nostrRelay";
import { reportError } from "@/src/reportError";

import { Channel, type ChannelEnd, closeUnclaimed, ignore, startRouting } from "./channel";
import { CODE_MINUTES, encodeCode, type PairingCode } from "./code";
import { currentSession, setCurrentSession } from "./current";
import { type AnnouncedFile, BYE, type Frame } from "./frames";
import { idSuffix, type Link, peerFileName, readLink, saveLink } from "./link";
import { MEETING_KIND, meetingTag, OFFER_SECONDS, openOffer, sealOffer } from "./meeting";
import { hourOf, linkSecret, nsdName } from "./names";
import {
  blockIsRight,
  describe,
  finish,
  hex,
  type Incoming,
  outbox,
  prepareIncoming,
  readBlock,
  received,
  replaceOutbox,
  WINDOW,
  wipe,
  writeBlock,
} from "./transfer";

/** How a session ends, one message each (SPEC.md section 4, U3). */
export type SessionCause =
  | "notInSight"
  | "blocked"
  | "codeExpired"
  | "versionMismatch"
  | "interrupted"
  | "noSpace"
  /** Met through the internet, and no address it gave answered (C2). */
  | "unreachable"
  | "cancelled";

export type SessionView =
  | { step: "code"; text: string; expiresAt: number }
  /** `sas`: B's check number while A decides, the same as on A's screen if it is really B. */
  | { step: "waiting"; sas?: string }
  /** `again`: the device is the one already linked, back after a reinstall (U2b). */
  | { step: "confirm"; name: string; suffix: string; again: boolean; sas: string }
  | { step: "connected"; name: string }
  | { step: "receiving"; name: string; done: number; total: number }
  | { step: "ended"; cause: SessionCause };

export type Role =
  /** A: shows a code and waits for the device that reads it (L3, L4). */
  | { kind: "show" }
  /** B: read A's code. */
  | { kind: "scan"; code: PairingCode }
  /** `internet`: the hero turned on "Find each other through the internet" here (Phase 2). */
  | { kind: "sync"; link: Link; internet?: boolean };

export type SessionHooks = {
  onChange?: (view: SessionView) => void;
  /** The link exists on this device now: the caller makes it the sync account. */
  onLinked?: (link: Link) => Promise<void>;
  /** The peer's file arrived and is verified, or the peer has none: time for a sync pass (S2b). */
  onPeerFile?: (passes: number) => void;
};

/** `write` found no peer to hand the file to, or no acknowledgement came (S4). */
export class PeerGone extends Error {
  constructor() {
    super("The other device is not connected");
    this.name = "PeerGone";
  }
}

/**
 * How long a sheet looks for the other device before saying it is not in sight: long enough to
 * walk to the other device and open Bati there (30 s was missed on two emulators, 08/11). Tests
 * shorten it.
 */
export const timing = { searchMs: 60_000 };
const ACK_MS = 60_000;
const RETRY_MS = 2_000;
const MAX_BAD_BLOCKS = 3;
const MAX_PASSES = 3;
const OFFER_EVERY_MS = 10_000;
/** C1: what a stranger gets before the token is checked. */
const PRE_PAIR_BYTES = 1024;
const PRE_PAIR_MS = 5_000;
/** The higher ID waits this long before dialling too, so the two rarely cross (`take`). */
const HIGHER_DIALS_AFTER_MS = 3_000;

/** An address to dial, and how it was learnt: kept, found on this Wi-Fi, or read from a meeting note. */
type Target = { host: string; port: number; via?: "nsd" | "internet" };

const randomHalf = async () => fromBase64(await batiCrypto().randomBytes(32));
const fromHex = (value: string) =>
  Uint8Array.from(value.match(/../g) ?? [], (b) => Number.parseInt(b, 16));

/** A stable port per link, so the last known address still answers next session (D3). */
export const preferredPort = (secret: string) => {
  // Through an HMAC: the port says nothing of the secret (security audit 08/11).
  const mac = hmac(sha256, fromHex(secret), new TextEncoder().encode("bati/p2p/port"));
  return 40_000 + ((((mac[0] ?? 0) << 8) | (mac[1] ?? 0)) % 20_000);
};

/**
 * Six digits both screens show while A decides (L4): from both device IDs and the token, so a
 * stranger who saw the code and connected first makes A show other digits than B, and B shows none.
 */
export function checkNumber(idA: Uint8Array, idB: Uint8Array, token: Uint8Array): string {
  const tag = new TextEncoder().encode("bati/p2p/sas");
  const digest = sha256(new Uint8Array([...tag, ...idA, ...idB, ...token]));
  const n = new DataView(digest.buffer, digest.byteOffset).getUint32(0) % 1_000_000;
  const digits = String(n).padStart(6, "0");
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

/** Literal addresses a code or NSD may send this device to: its own networks only (audit 08/11). */
export function isLocalAddress(host: string): boolean {
  const h = host.toLowerCase().split("%")[0] ?? "";
  if (h.includes(":")) return /^fe[89ab]/.test(h) || /^f[cd]/.test(h) || (__DEV__ && h === "::1");
  const [a = 0, b = 0] = h.split(".").map(Number);
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    // Tests and emulators run on loopback; a release never dials its own device.
    (__DEV__ && a === 127)
  );
}

/** What an error report may carry: no installId, no device ID (they name the hero's devices). */
function scrubbed(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(
    message
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
      .replace(/[0-9a-f]{64}/gi, "<id>"),
  );
}

export function openSession(role: Role, hooks: SessionHooks = {}): Session {
  currentSession()?.cancel();
  const session = new Session(role, hooks);
  setCurrentSession(session);
  session.start().catch(ignore);
  return session;
}

export class Session {
  view: SessionView = { step: "waiting" };
  private role: Role;
  private readonly hooks: SessionHooks;
  private me = "";
  private channel: Channel | null = null;
  private peerId = "";
  private peerName = "";
  private timers: ReturnType<typeof setTimeout>[] = [];
  private ended = false;
  private queue: Promise<void> = Promise.resolve();
  /** A, while a code is shown: the token it holds, and what B sent with it. */
  private token: Uint8Array | null = null;
  private expiresAt = 0;
  private pending: { random: Uint8Array; installId: string } | null = null;
  /** B, during pairing: its half of the secret. */
  private myHalf: Uint8Array | null = null;
  private dialledAt: { host: string; port: number } | null = null;
  private incoming: Incoming | null = null;
  private badBlocks = 0;
  private sending: { sha: string; done: () => void } | null = null;
  private served: { file: File; described: AnnouncedFile } | null = null;
  private passes = 0;
  private firstAnnounce: Promise<void>;
  private announced: () => void = () => undefined;
  private readonly subscriptions: { remove(): void }[] = [];
  private pool: RelayPool | null = null;
  /** Whether the channel's socket was dialled here, and who dialled the last one accepted. */
  private channelMine = false;
  private helloSeen = false;
  private sas: string | undefined;
  private codeView: SessionView | null = null;
  private acceptedFrom: string | null = null;

  constructor(role: Role, hooks: SessionHooks) {
    this.role = role;
    this.hooks = hooks;
    this.firstAnnounce = new Promise((resolve) => {
      this.announced = resolve;
    });
  }

  private show(view: SessionView): void {
    this.view = view;
    this.hooks.onChange?.(view);
  }

  async start(): Promise<void> {
    try {
      const p2p = batiP2p();
      startRouting();
      this.me = await p2p.deviceId();
      this.subscriptions.push(
        p2p.addListener("onConnected", ({ socket, peerId, address }) =>
          this.take(socket, peerId, false, address),
        ),
      );
      if (this.role.kind === "show") await this.showCode();
      else if (this.role.kind === "scan") await this.dialCode(this.role.code);
      else await this.meet(this.role.link);
    } catch (error) {
      reportError("p2p.start", scrubbed(error));
      this.end("interrupted");
    }
  }

  private later(ms: number, run: () => void): void {
    this.timers.push(setTimeout(run, ms));
  }

  private async showCode(): Promise<void> {
    const p2p = batiP2p();
    const port = await p2p.listen([], true, 0);
    this.token = await randomHalf();
    this.expiresAt = Math.floor(Date.now() / 1000) + CODE_MINUTES * 60;
    const text = encodeCode({
      expiresAt: this.expiresAt,
      token: this.token,
      installId: await installId(),
      deviceId: fromHex(this.me),
      name: await p2p.deviceName(),
      lan: { port, addresses: await p2p.localAddresses(false) },
    });
    this.codeView = { step: "code", text, expiresAt: this.expiresAt };
    this.show(this.codeView);
    this.later(CODE_MINUTES * 60_000, () => {
      if (this.role.kind === "show") this.end("codeExpired");
    });
  }

  private async dialCode(code: PairingCode): Promise<void> {
    const pin = hex(code.deviceId);
    const targets = code.lan.addresses
      .filter(isLocalAddress)
      .map((host) => ({ host, port: code.lan.port }));
    this.myHalf = await randomHalf();
    const socket = await this.dialUntil(targets, pin, () => []);
    if (socket === null) return;
    this.peerName = code.name;
    this.take(socket.id, pin, true);
  }

  /**
   * Both devices listen on the link's port, and both dial (D3, B19): the lower ID at once, through
   * the kept addresses, NSD and the meeting note; the higher one after 3 s through the kept
   * addresses alone. Whichever learnt an address at pairing can then reach the other, even on a
   * Wi-Fi that drops mDNS. The higher ID announces on NSD and publishes the offer, so a name is
   * never announced twice. Two connections that cross are settled in `take`.
   */
  private async meet(link: Link): Promise<void> {
    const p2p = batiP2p();
    const secret = fromHex(link.secret);
    const port = await p2p.listen([link.peerId], false, preferredPort(link.secret));
    const internet = this.role.kind === "sync" && this.role.internet === true;
    if (this.me > link.peerId) {
      // The lower ID's dial says why nobody met (blocked, unreachable); this side only waits.
      this.later(timing.searchMs, () => {
        if (this.channel === null) this.end("notInSight");
      });
      // shortcut: the name is the one of the hour the sheet opened; a session open across the
      // hour keeps it, which the peer's ±1 h browse still finds. Re-announce if sessions last hours.
      await p2p.announce(nsdName(secret, hourOf(Date.now() / 1000)), port);
      if (internet) await this.publishOffers(link, port);
      this.later(HIGHER_DIALS_AFTER_MS, () => {
        this.dialUntil(link.addresses, link.peerId, () => [])
          .then((socket) => {
            if (socket) this.take(socket.id, link.peerId, true);
          })
          .catch(ignore);
      });
      return;
    }
    const names = new Set([-1, 0, 1].map((d) => nsdName(secret, hourOf(Date.now() / 1000) + d)));
    const found: Target[] = [];
    this.subscriptions.push(
      p2p.addListener("onFound", ({ name, host, port: at }) => {
        if (names.has(name) && isLocalAddress(host)) found.push({ host, port: at, via: "nsd" });
      }),
    );
    await p2p.browse();
    if (internet) this.readOffers(link, found);
    const socket = await this.dialUntil(link.addresses, link.peerId, () => found.splice(0));
    if (socket) this.take(socket.id, link.peerId, true);
  }

  /**
   * Tries the known addresses, then whatever NSD finds, until one passes the pin or 30 s go by
   * (D3). An address that fails is not tried again in this session. `null` once the session ended.
   */
  private async dialUntil(
    known: Target[],
    pin: string,
    more: () => Target[],
  ): Promise<{ id: number } | null> {
    const p2p = batiP2p();
    const tried = new Set<string>();
    const silent = new Set<Target["via"]>();
    const deadline = Date.now() + timing.searchMs;
    const queue = [...known];
    while (!this.ended && this.channel === null && Date.now() < deadline) {
      queue.push(...more());
      const target = queue.shift();
      if (target === undefined) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
        continue;
      }
      const key = `${target.host}:${target.port}`;
      if (tried.has(key)) continue;
      tried.add(key);
      try {
        const id = await p2p.dial(target.host, target.port, pin);
        this.dialledAt = { host: target.host, port: target.port };
        return { id };
      } catch (error) {
        // Expected while the other device is not there yet; only a found-but-silent one is news.
        if (target.via && String(error).includes("UNREACHABLE")) silent.add(target.via);
      }
    }
    // Met by the other side's dial meanwhile: nothing to say.
    if (!this.ended && this.channel === null) this.end(causeOfSilence(silent));
    return null;
  }

  /** Listening device, internet on: the offer goes out every 10 s until the peer connects (C1, C5). */
  private async publishOffers(link: Link, port: number): Promise<void> {
    const pool = new RelayPool();
    this.pool = pool;
    const secret = fromHex(link.secret);
    const addresses = await batiP2p().localAddresses(true);
    const publish = async () => {
      if (this.ended || this.channel !== null) return;
      const now = Math.floor(Date.now() / 1000);
      await pool.publish(
        await sealOffer(secret, { expiresAt: now + OFFER_SECONDS, port, addresses }, now),
      );
      this.later(OFFER_EVERY_MS, () => {
        publish().catch(ignore);
      });
    };
    await publish();
  }

  /** Dialling device, internet on: every offer of this link and hour ±1 becomes an address to try. */
  private readOffers(link: Link, found: Target[]): void {
    const pool = new RelayPool();
    this.pool = pool;
    const secret = fromHex(link.secret);
    const hour = hourOf(Date.now() / 1000);
    const tags = [hour - 1, hour, hour + 1].map((h) => meetingTag(secret, h));
    pool.subscribe({ kinds: [MEETING_KIND], "#x": tags }, (event) => {
      openOffer(secret, event, Math.floor(Date.now() / 1000))
        .then((offer) => {
          for (const host of offer?.addresses ?? [])
            found.push({ host, port: offer?.port ?? 0, via: "internet" });
        })
        .catch(ignore);
    });
  }

  /**
   * A socket up, dialled by this device (`mine`) or accepted. One channel per session: when two
   * cross (both dialled at once), both devices keep the one the lower ID started, so they agree
   * without a word; the other is closed before it carried anything but a hello.
   */
  private take(socket: number, peerId: string, mine: boolean, address?: string): void {
    const close = (): void => {
      batiP2p().close(socket).catch(ignore);
    };
    if (this.ended || (this.role.kind === "scan" && !mine)) {
      close();
      return;
    }
    const lowerStarted = (s: { mine: boolean; peerId: string }) => this.me < s.peerId === s.mine;
    if (this.channel !== null) {
      const keepNew =
        this.role.kind === "sync" &&
        lowerStarted({ mine, peerId }) &&
        !lowerStarted({ mine: this.channelMine, peerId: this.peerId });
      if (!keepNew) {
        close();
        return;
      }
      const old = this.channel;
      old.onEnd = () => undefined;
      old.end("closed");
      this.channel = null;
      this.incoming = null;
    }
    this.channelMine = mine;
    if (address && !mine) this.acceptedFrom = address;
    this.attach(socket, peerId);
    this.remember().catch(ignore);
  }

  /** D3: where the peer was reached this time goes first next time, on the link's port. */
  private async remember(): Promise<void> {
    if (this.role.kind !== "sync") return;
    const { link } = this.role;
    const host = this.channelMine ? this.dialledAt?.host : this.acceptedFrom;
    if (!host) return;
    const here = { host, port: preferredPort(link.secret) };
    const addresses = [here, ...link.addresses.filter((a) => a.host !== host)].slice(0, 4);
    this.role = { ...this.role, link: { ...link, addresses } };
    await saveLink(this.role.link);
  }

  private attach(socket: number, peerId: string): void {
    const p2p = batiP2p();
    p2p.stopDiscovery().catch(ignore);
    this.peerId = peerId;
    const channel = new Channel(socket);
    this.channel = channel;
    channel.onFrame = (frame) => {
      this.queue = this.queue
        .then(() => this.handle(frame))
        .catch((error: unknown) => {
          reportError("p2p.frame", scrubbed(error));
          this.end("interrupted");
        });
    };
    channel.onEnd = (cause) => {
      // Before A's yes, a socket that goes away is only that socket: the code stays shown.
      if (this.role.kind === "show") this.dropStranger();
      else this.end(causeOfChannel(cause));
    };
    if (this.role.kind === "show") {
      // C1: before the token is checked, 1 KB and 5 s, then the socket goes and the code stays.
      channel.maxBytes = PRE_PAIR_BYTES;
      this.later(PRE_PAIR_MS, () => {
        if (this.channel === channel && this.pending === null) this.dropStranger();
      });
    }
    if (this.role.kind === "scan") {
      const { code } = this.role;
      this.sas = checkNumber(code.deviceId, fromHex(this.me), code.token);
    }
    (async () => {
      const name = await p2p.deviceName();
      await channel.send({
        type: "hello",
        instanceId: await randomHalf().then((r) => r.slice(0, 16)),
        name,
      });
      if (this.role.kind === "scan" && this.myHalf) {
        await channel.send({
          type: "pair",
          token: this.role.code.token,
          random: this.myHalf,
          installId: await installId(),
        });
      }
      if (this.role.kind === "sync") await this.announce();
    })().catch((error: unknown) => {
      reportError("p2p.attach", scrubbed(error));
      this.end("interrupted");
    });
  }

  private handle(frame: Frame): Promise<void> {
    // A, before the hero said yes: a hello, then a pair, and nothing else (audit 08/11).
    if (this.role.kind === "show" && frame.type !== "hello" && frame.type !== "pair") {
      this.dropStranger();
      return Promise.resolve();
    }
    switch (frame.type) {
      case "hello":
        // Once per channel: the name the hero confirms is the name kept.
        if (this.helloSeen) return Promise.resolve();
        this.helloSeen = true;
        if (this.role.kind !== "scan") this.peerName = frame.name;
        // A keeps its code on screen until the token is right; B waits for A's yes.
        if (this.role.kind === "scan") this.show({ step: "waiting", sas: this.sas });
        else if (this.role.kind === "sync") this.show({ step: "connected", name: this.peerName });
        return Promise.resolve();
      case "pair":
        return this.paired(frame.token, frame.random, frame.installId);
      case "linked":
        return this.linked(frame.random);
      case "announce":
        return this.received(frame.file);
      case "want":
        return this.serve(frame.indexes);
      case "block":
        return this.block(frame.index, frame.bytes);
      case "ack":
        if (this.sending?.sha === hex(frame.sha256)) this.sending.done();
        return Promise.resolve();
      case "bye":
        this.end(causeOfBye(frame.reason));
        return Promise.resolve();
      default:
        return Promise.resolve();
    }
  }

  /** A: B read the code. The token decides, then the hero does (L4, L5). */
  private async paired(token: Uint8Array, random: Uint8Array, peerInstall: string): Promise<void> {
    const fresh = Math.floor(Date.now() / 1000) <= this.expiresAt;
    if (this.role.kind !== "show" || this.token === null || this.pending !== null) return;
    if (!fresh || hex(token) !== hex(this.token)) {
      // A wrong token costs that socket only: a stranger cannot kill the code with one packet.
      await this.channel?.send({ type: "bye", reason: BYE.codeExpired });
      this.dropStranger();
      return;
    }
    const sas = checkNumber(fromHex(this.me), fromHex(this.peerId), this.token);
    this.token = null;
    if (this.channel) this.channel.maxBytes = null;
    this.pending = { random, installId: peerInstall };
    const again = (await readLink())?.peerInstallId === peerInstall;
    this.show({ step: "confirm", name: this.peerName, suffix: idSuffix(this.peerId), again, sas });
  }

  /** A: the hero's answer to "Link {name}?". Nothing is pinned before it (L4). */
  async confirm(yes: boolean): Promise<void> {
    const pending = this.pending;
    if (pending === null || this.channel === null) return;
    this.pending = null;
    if (!yes) {
      await this.channel.send({ type: "bye", reason: BYE.notThisOne });
      this.end("cancelled");
      return;
    }
    const mine = await randomHalf();
    const secret = linkSecret(mine, pending.random, fromHex(this.me), fromHex(this.peerId));
    await this.becomeLinked({
      peerId: this.peerId,
      peerInstallId: pending.installId,
      secret: hex(secret),
      name: this.peerName,
      addresses: this.acceptedFrom
        ? [{ host: this.acceptedFrom, port: preferredPort(hex(secret)) }]
        : [],
    });
    await batiP2p().setPins([this.peerId], false);
    await this.channel.send({ type: "linked", random: mine });
    this.show({ step: "connected", name: this.peerName });
    await this.announce();
  }

  /** B: A confirmed. */
  private async linked(theirs: Uint8Array): Promise<void> {
    if (this.role.kind !== "scan" || this.myHalf === null) return;
    const { code } = this.role;
    const secret = linkSecret(theirs, this.myHalf, code.deviceId, fromHex(this.me));
    await this.becomeLinked({
      peerId: hex(code.deviceId),
      peerInstallId: code.installId,
      secret: hex(secret),
      name: code.name,
      // Next time A listens on the link's port, not the code's.
      addresses: this.dialledAt
        ? [{ host: this.dialledAt.host, port: preferredPort(hex(secret)) }]
        : [],
    });
    this.show({ step: "connected", name: this.peerName });
    await this.announce();
  }

  private async becomeLinked(link: Link): Promise<void> {
    // A new device replaces the link: the old one's file must never read as the new one's.
    if ((await readLink())?.peerInstallId !== link.peerInstallId) wipe();
    await saveLink(link);
    this.role = { kind: "sync", link };
    await this.hooks.onLinked?.(link);
  }

  private async announce(): Promise<void> {
    const file = outbox();
    if (file === null) {
      this.served = null;
      await this.channel?.send({ type: "announce", file: null });
      return;
    }
    if (this.served?.file.uri !== file.uri || this.served.described.size !== file.size) {
      this.served = { file, described: await describe(file, file.name) };
    }
    await this.channel?.send({ type: "announce", file: this.served.described });
  }

  private async received(file: AnnouncedFile | null): Promise<void> {
    if (this.role.kind !== "sync") return;
    if (file === null) {
      this.arrived();
      return;
    }
    const prepared = await prepareIncoming(file, peerFileName(this.role.link));
    if (prepared === "noSpace") {
      await this.channel?.send({ type: "bye", reason: BYE.noSpace });
      this.end("noSpace");
      return;
    }
    if (prepared === "name" || prepared === "size") {
      // Not the pinned peer's file (S5), or more than any history (C5): nothing of it is written.
      this.end("interrupted");
      return;
    }
    if (prepared === null) {
      await this.channel?.send({ type: "ack", sha256: file.sha256 });
      this.arrived();
      return;
    }
    this.incoming = prepared;
    this.badBlocks = 0;
    await this.want();
  }

  private async want(): Promise<void> {
    const incoming = this.incoming;
    if (incoming === null) return;
    const end = Math.min(incoming.next + WINDOW, incoming.announced.blocks.length);
    const indexes = Array.from({ length: end - incoming.next }, (_, i) => incoming.next + i);
    if (indexes.length === 0) {
      await this.complete(incoming);
      return;
    }
    await this.channel?.send({ type: "want", indexes });
  }

  private async serve(indexes: number[]): Promise<void> {
    const served = this.served;
    if (served === null) return;
    // One window at a time: a peer asking for 65k blocks in one frame gets eight (audit 08/11).
    for (const index of indexes.slice(0, WINDOW)) {
      if (index >= served.described.blocks.length) return;
      await this.channel?.send({
        type: "block",
        index,
        bytes: await readBlock(served.file, index),
      });
    }
  }

  private async block(index: number, bytes: Uint8Array): Promise<void> {
    const incoming = this.incoming;
    // Leftovers of a window asked again after a bad block: the sender sends in order, so skip them.
    if (incoming === null || index !== incoming.next) return;
    if (!blockIsRight(incoming, index, bytes)) {
      this.badBlocks++;
      if (this.badBlocks >= MAX_BAD_BLOCKS) {
        await this.channel?.send({ type: "bye", reason: BYE.badBlocks });
        this.end("interrupted");
        return;
      }
      await this.want();
      return;
    }
    await writeBlock(incoming, bytes);
    const { size, blocks } = incoming.announced;
    this.show({
      step: "receiving",
      name: this.peerName,
      done: Math.min(size, incoming.next * 131_072),
      total: size,
    });
    if (incoming.next === blocks.length) await this.complete(incoming);
    else if (incoming.next % WINDOW === 0) await this.want();
  }

  private async complete(incoming: Incoming): Promise<void> {
    this.incoming = null;
    if (!(await finish(incoming))) {
      this.end("interrupted");
      return;
    }
    await this.channel?.send({ type: "ack", sha256: incoming.announced.sha256 });
    this.show({ step: "connected", name: this.peerName });
    this.arrived();
  }

  private arrived(): void {
    this.announced();
    if (this.passes >= MAX_PASSES) return;
    this.passes++;
    this.hooks.onPeerFile?.(this.passes);
  }

  /** Resolves once the peer said what it holds and that file, if any, is here and verified (S2). */
  async peerFile(): Promise<{ name: string; sha: string; size: number } | null> {
    if (this.role.kind !== "sync" || this.ended) throw new PeerGone();
    await Promise.race([this.firstAnnounce, this.whenEnded()]);
    if (this.ended) throw new PeerGone();
    const file = received();
    // Only this link's peer: a file from a device linked before is not this one's (audit 08/11).
    if (file === null || file.file.name !== peerFileName(this.role.link)) return null;
    return { name: file.file.name, sha: file.sha, size: file.file.size };
  }

  /** What this device offers: its outbox, as listed beside the peer's file (S2). */
  async ownFile(): Promise<{ name: string; sha: string; size: number } | null> {
    const file = outbox();
    if (file === null) return null;
    const described =
      this.served?.file.uri === file.uri ? this.served.described : await describe(file, file.name);
    return { name: file.name, sha: hex(described.sha256), size: described.size };
  }

  /** S4: replaces the outbox, sends it, and resolves with its SHA-256 once the peer acknowledged it. */
  async send(source: File, name: string): Promise<string> {
    if (this.role.kind !== "sync" || this.channel === null || this.ended) throw new PeerGone();
    const file = await replaceOutbox(source, name);
    this.served = { file, described: await describe(file, name) };
    const sha = hex(this.served.described.sha256);
    const acked = new Promise<void>((resolve) => {
      this.sending = { sha, done: resolve };
    });
    await this.channel.send({ type: "announce", file: this.served.described });
    const timeout = new Promise<"late">((resolve) => this.later(ACK_MS, () => resolve("late")));
    const outcome = await Promise.race([
      acked,
      timeout,
      this.whenEnded().then(() => "late" as const),
    ]);
    this.sending = null;
    if (outcome === "late") throw new PeerGone();
    return sha;
  }

  private endedListeners: (() => void)[] = [];
  private whenEnded(): Promise<void> {
    return this.ended
      ? Promise.resolve()
      : new Promise((resolve) => this.endedListeners.push(resolve));
  }

  /**
   * A, before the hero's yes: this socket goes, the listener and the code stay, so a stranger who
   * connects, stalls or floods costs the hero nothing but a moment (audit 08/11).
   */
  private dropStranger(): void {
    const old = this.channel;
    if (old === null || this.role.kind !== "show") return;
    old.onEnd = () => undefined;
    old.end("closed");
    this.channel = null;
    this.peerId = "";
    this.peerName = "";
    this.helloSeen = false;
    this.pending = null;
    if (this.codeView) this.show(this.codeView);
  }

  cancel(): void {
    this.channel?.send({ type: "bye", reason: BYE.cancel }).catch(ignore);
    this.end("cancelled");
  }

  private end(cause: SessionCause): void {
    if (this.ended) return;
    this.ended = true;
    for (const timer of this.timers) clearTimeout(timer);
    for (const subscription of this.subscriptions) subscription.remove();
    this.pool?.close();
    this.channel?.end("closed");
    closeUnclaimed();
    const p2p = batiP2p();
    p2p.stopDiscovery().catch(ignore);
    p2p.stopListening().catch(ignore);
    for (const listener of this.endedListeners) listener();
    if (currentSession() === this) setCurrentSession(null);
    this.show({ step: "ended", cause });
  }

  get linkedTo(): Link | null {
    return this.role.kind === "sync" ? this.role.link : null;
  }
}

/**
 * Found on this Wi-Fi and silent is a Wi-Fi that keeps devices apart; met only through the internet
 * and silent is a network in between (carrier NAT, C2); nothing found is nobody there.
 */
function causeOfSilence(silent: Set<Target["via"]>): SessionCause {
  if (silent.has("nsd")) return "blocked";
  return silent.has("internet") ? "unreachable" : "notInSight";
}

function causeOfChannel(cause: ChannelEnd): SessionCause {
  return cause === "versionMismatch" ? "versionMismatch" : "interrupted";
}

function causeOfBye(reason: number): SessionCause {
  if (reason === BYE.codeExpired || reason === BYE.notThisOne) return "codeExpired";
  if (reason === BYE.versionMismatch) return "versionMismatch";
  return "interrupted";
}
