import type { File } from "expo-file-system";

import { batiCrypto } from "@/modules/bati-crypto";
import { batiP2p } from "@/modules/bati-p2p";
import { installId } from "@/src/installId";
import { fromBase64 } from "@/src/multiplayer/envelope";
import { reportError } from "@/src/reportError";

import { Channel, type ChannelEnd, ignore, startRouting } from "./channel";
import { CODE_MINUTES, encodeCode, type PairingCode } from "./code";
import { currentSession, setCurrentSession } from "./current";
import { type AnnouncedFile, BYE, type Frame } from "./frames";
import { idSuffix, type Link, peerFileName, saveLink } from "./link";
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
  | "cancelled";

export type SessionView =
  | { step: "code"; text: string; expiresAt: number }
  | { step: "waiting" }
  | { step: "confirm"; name: string; suffix: string }
  | { step: "connected"; name: string }
  | { step: "receiving"; name: string; done: number; total: number }
  | { step: "ended"; cause: SessionCause };

export type Role =
  /** A: shows a code and waits for the device that reads it (L3, L4). */
  | { kind: "show" }
  /** B: read A's code. */
  | { kind: "scan"; code: PairingCode }
  | { kind: "sync"; link: Link };

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

const SEARCH_MS = 30_000;
const ACK_MS = 60_000;
const RETRY_MS = 2_000;
const MAX_BAD_BLOCKS = 3;
const MAX_PASSES = 3;

const randomHalf = async () => fromBase64(await batiCrypto().randomBytes(32));
const fromHex = (value: string) =>
  Uint8Array.from(value.match(/../g) ?? [], (b) => Number.parseInt(b, 16));

/** A stable port per link, so the last known address still answers next session (D3). */
export const preferredPort = (secret: string) =>
  40_000 + (Number.parseInt(secret.slice(0, 4), 16) % 20_000);

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
        p2p.addListener("onConnected", ({ socket, peerId }) => this.accepted(socket, peerId)),
      );
      if (this.role.kind === "show") await this.showCode();
      else if (this.role.kind === "scan") await this.dialCode(this.role.code);
      else if (this.me < this.role.link.peerId) await this.dialPeer(this.role.link);
      else await this.listenForPeer(this.role.link);
    } catch (error) {
      reportError("p2p.start", error);
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
    this.show({ step: "code", text, expiresAt: this.expiresAt });
    this.later(CODE_MINUTES * 60_000, () => {
      if (this.role.kind === "show") this.end("codeExpired");
    });
  }

  private async dialCode(code: PairingCode): Promise<void> {
    const pin = hex(code.deviceId);
    const targets = code.lan.addresses.map((host) => ({ host, port: code.lan.port }));
    const socket = await this.dialUntil(targets, pin, () => []);
    if (socket === null) return;
    this.myHalf = await randomHalf();
    this.attach(socket.id, pin);
    this.peerName = code.name;
  }

  private async dialPeer(link: Link): Promise<void> {
    const p2p = batiP2p();
    const names = new Set(
      [-1, 0, 1].map((d) => nsdName(fromHex(link.secret), hourOf(Date.now() / 1000) + d)),
    );
    const found: { host: string; port: number }[] = [];
    this.subscriptions.push(
      p2p.addListener("onFound", ({ name, host, port }) => {
        if (names.has(name)) found.push({ host, port });
      }),
    );
    await p2p.browse();
    const socket = await this.dialUntil(link.addresses, link.peerId, () => found.splice(0));
    if (socket === null) return;
    this.attach(socket.id, link.peerId);
  }

  /**
   * Tries the known addresses, then whatever NSD finds, until one passes the pin or 30 s go by
   * (D3). An address that fails is not tried again in this session. `null` once the session ended.
   */
  private async dialUntil(
    known: { host: string; port: number }[],
    pin: string,
    more: () => { host: string; port: number }[],
  ): Promise<{ id: number } | null> {
    const p2p = batiP2p();
    const tried = new Set<string>();
    let seenButUnreachable = false;
    const deadline = Date.now() + SEARCH_MS;
    const queue = [...known];
    while (!this.ended && Date.now() < deadline) {
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
        this.dialledAt = target;
        return { id };
      } catch (error) {
        // Expected while the other device is not there yet; only a found-but-silent one is news.
        if (!known.includes(target) && String(error).includes("UNREACHABLE"))
          seenButUnreachable = true;
      }
    }
    if (!this.ended) this.end(seenButUnreachable ? "blocked" : "notInSight");
    return null;
  }

  private async listenForPeer(link: Link): Promise<void> {
    const p2p = batiP2p();
    const port = await p2p.listen([link.peerId], false, preferredPort(link.secret));
    // shortcut: the name is the one of the hour the sheet opened; a session open across the hour
    // keeps it, which the peer's ±1 h browse still finds. Re-announce if sessions ever last hours.
    await p2p.announce(nsdName(fromHex(link.secret), hourOf(Date.now() / 1000)), port);
    this.later(SEARCH_MS, () => {
      if (this.channel === null) this.end("notInSight");
    });
  }

  private accepted(socket: number, peerId: string): void {
    if (this.ended || this.channel !== null || this.role.kind === "scan") {
      batiP2p().close(socket).catch(ignore);
      return;
    }
    this.attach(socket, peerId);
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
          reportError("p2p.frame", error);
          this.end("interrupted");
        });
    };
    channel.onEnd = (cause) => this.end(causeOfChannel(cause));
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
      reportError("p2p.attach", error);
      this.end("interrupted");
    });
  }

  private handle(frame: Frame): Promise<void> {
    switch (frame.type) {
      case "hello":
        if (this.role.kind !== "scan") this.peerName = frame.name;
        this.show({ step: "connected", name: this.peerName });
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
    if (
      this.role.kind !== "show" ||
      this.token === null ||
      !fresh ||
      hex(token) !== hex(this.token)
    ) {
      await this.channel?.send({ type: "bye", reason: BYE.codeExpired });
      this.end("codeExpired");
      return;
    }
    this.token = null;
    this.pending = { random, installId: peerInstall };
    this.show({ step: "confirm", name: this.peerName, suffix: idSuffix(this.peerId) });
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
      addresses: [],
    });
    await batiP2p().setPins([this.peerId], false);
    await this.channel.send({ type: "linked", random: mine });
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
      addresses: this.dialledAt ? [this.dialledAt] : [],
    });
    await this.announce();
  }

  private async becomeLinked(link: Link): Promise<void> {
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
    for (const index of indexes) {
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
    return file ? { name: file.file.name, sha: file.sha, size: file.file.size } : null;
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

  cancel(): void {
    this.channel?.send({ type: "bye", reason: BYE.cancel }).catch(ignore);
    this.end("cancelled");
  }

  private end(cause: SessionCause): void {
    if (this.ended) return;
    this.ended = true;
    for (const timer of this.timers) clearTimeout(timer);
    for (const subscription of this.subscriptions) subscription.remove();
    this.channel?.end("closed");
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

function causeOfChannel(cause: ChannelEnd): SessionCause {
  return cause === "versionMismatch" ? "versionMismatch" : "interrupted";
}

function causeOfBye(reason: number): SessionCause {
  if (reason === BYE.codeExpired || reason === BYE.notThisOne) return "codeExpired";
  if (reason === BYE.versionMismatch) return "versionMismatch";
  return "interrupted";
}
