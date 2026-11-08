import { type BatiP2p, batiP2p } from "@/modules/bati-p2p";
import { fromBase64, toBase64 } from "@/src/multiplayer/envelope";

import { encodeFrame, type Frame, readFrame } from "./frames";

/** The protocol versions this build speaks (C3). The first byte each side sends is its highest. */
export const PROTOCOL_VERSION = 1;
const LOWEST_SUPPORTED = 1;
const PING_EVERY_MS = 10_000;
/** C4: silence this long means the link is dead. */
export const SILENCE_MS = 30_000;

export type ChannelEnd = "versionMismatch" | "interrupted" | "bad" | "closed";

/** A socket already gone needs no closing, and its failed write is said by onClosed. */
export const ignore = () => undefined;

type Sink = { data(bytes: Uint8Array): void; closed(): void };

/**
 * One subscription for every socket. Native events and promises are not ordered, so the first bytes
 * of a dialled socket can arrive before `dial` resolves: they wait here until the socket has a channel.
 */
const sinks = new Map<number, Sink>();
const early = new Map<number, { chunks: Uint8Array[]; bytes: number; closed: boolean }>();
/** Bytes held for a socket nobody claimed yet: more is a peer talking to no one, and it goes. */
const EARLY_BYTES = 64 * 1024;
let routing = false;

/** A session ending closes every socket it never claimed (security audit 08/11). */
export function closeUnclaimed(): void {
  const p2p = batiP2p();
  for (const socket of early.keys()) p2p.close(socket).catch(ignore);
  early.clear();
}

export function startRouting(): void {
  if (routing) return;
  routing = true;
  const p2p = batiP2p();
  p2p.addListener("onData", ({ socket, bytes }) => {
    const sink = sinks.get(socket);
    if (sink) sink.data(fromBase64(bytes));
    else {
      const held = early.get(socket) ?? { chunks: [], bytes: 0, closed: false };
      const chunk = fromBase64(bytes);
      held.chunks.push(chunk);
      held.bytes += chunk.length;
      early.set(socket, held);
      if (held.bytes > EARLY_BYTES) {
        early.delete(socket);
        p2p.close(socket).catch(ignore);
      }
    }
  });
  p2p.addListener("onClosed", ({ socket }) => {
    const sink = sinks.get(socket);
    if (sink) sink.closed();
    else {
      const held = early.get(socket);
      early.set(socket, { chunks: held?.chunks ?? [], bytes: held?.bytes ?? 0, closed: true });
    }
  });
}

/**
 * One TLS socket as a stream of frames: the version byte of C3, then frames read one at a time,
 * a ping every 10 s, and the end after 30 s of silence. Everything past the version byte is
 * src/p2p/session.ts's.
 */
export class Channel {
  private readonly p2p: BatiP2p;
  readonly socket: number;
  private buffer = new Uint8Array(0);
  private version: number | null = null;
  private lastHeard = Date.now();
  private readonly timer: ReturnType<typeof setInterval>;
  private ended = false;
  onFrame: (frame: Frame) => void = () => undefined;
  /** Bytes this channel may still receive, `null` for no cap: a stranger before pairing (C1). */
  maxBytes: number | null = null;
  private received = 0;
  onEnd: (cause: ChannelEnd) => void = () => undefined;

  constructor(socket: number) {
    this.p2p = batiP2p();
    this.socket = socket;
    startRouting();
    this.timer = setInterval(() => {
      if (Date.now() - this.lastHeard > SILENCE_MS) this.end("interrupted");
      else this.send({ type: "ping" }).catch(ignore);
    }, PING_EVERY_MS);
    this.raw(Uint8Array.of(PROTOCOL_VERSION)).catch(ignore);
  }

  /**
   * Starts reading, once the session has set `onFrame` and `onEnd`: first what arrived before
   * anyone claimed the socket, in order, then the rest. Until then new bytes join the held ones,
   * so nothing overtakes them (code review 08/11: a timer here let later bytes in first).
   */
  open(): void {
    const held = early.get(this.socket);
    early.delete(this.socket);
    for (const chunk of held?.chunks ?? []) this.receive(chunk);
    if (held?.closed) {
      this.end("closed");
      return;
    }
    if (!this.ended) {
      sinks.set(this.socket, {
        data: (bytes) => this.receive(bytes),
        closed: () => this.end("closed"),
      });
    }
  }

  send(frame: Frame): Promise<void> {
    return this.raw(encodeFrame(frame));
  }

  private raw(bytes: Uint8Array): Promise<void> {
    if (this.ended) return Promise.resolve();
    // A refused write is a socket already gone: onClosed says so, and the session ends there.
    return this.p2p.send(this.socket, toBase64(bytes)).catch(() => this.end("closed"));
  }

  private receive(bytes: Uint8Array): void {
    this.lastHeard = Date.now();
    this.received += bytes.length;
    if (this.maxBytes !== null && this.received > this.maxBytes) {
      this.end("bad");
      return;
    }
    const joined = new Uint8Array(this.buffer.length + bytes.length);
    joined.set(this.buffer);
    joined.set(bytes, this.buffer.length);
    this.buffer = joined;
    if (this.version === null) {
      if (this.buffer.length === 0) return;
      this.version = Math.min(PROTOCOL_VERSION, this.buffer[0] ?? 0);
      this.buffer = this.buffer.subarray(1);
      if (this.version < LOWEST_SUPPORTED) {
        this.end("versionMismatch");
        return;
      }
    }
    while (!this.ended) {
      const read = readFrame(this.buffer);
      if (read.kind === "more") return;
      if (read.kind === "bad") {
        this.end("bad");
        return;
      }
      this.buffer = this.buffer.subarray(read.used);
      if (read.frame.type !== "ping") this.onFrame(read.frame);
    }
  }

  end(cause: ChannelEnd): void {
    if (this.ended) return;
    this.ended = true;
    clearInterval(this.timer);
    sinks.delete(this.socket);
    this.p2p.close(this.socket).catch(ignore);
    this.onEnd(cause);
  }
}
