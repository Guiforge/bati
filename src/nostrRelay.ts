import { schnorr } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";

/**
 * Nostr relays, NIP-01 and nothing else: publish an event, subscribe to a filter. The one module
 * allowed a WebSocket by .biome/plugins/noJsNetwork.grit, written to be shared with multiplayer.
 *
 * Device sync uses it only for the meeting (src/p2p/meeting.ts): an ephemeral event, signed by a
 * key made for that event, carrying addresses sealed under the link secret. Relays forward an
 * ephemeral event to whoever is subscribed and keep nothing (NIP-01, kinds 20000 to 29999).
 * Off unless the hero turned on "Find each other through the internet" on both devices.
 */
export type NostrEvent = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
};

export type Filter = { kinds?: number[]; "#x"?: string[]; since?: number };

/** The relays a meeting goes through: three, so any one of them can be down. */
export const RELAYS = ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.primal.net"];
/** NIP-11 limits seen on 07/11: nos.lol takes 128 KB a message; a meeting is under 1 KB. */
const MAX_MESSAGE = 64 * 1024;
/** Event ids remembered to drop repeats; the oldest go first. */
const MAX_SEEN = 1000;

function isEvent(value: unknown): value is NostrEvent {
  const e = value as Partial<NostrEvent> | null;
  return (
    typeof e === "object" &&
    e !== null &&
    typeof e.id === "string" &&
    typeof e.pubkey === "string" &&
    typeof e.sig === "string" &&
    typeof e.content === "string" &&
    typeof e.kind === "number" &&
    typeof e.created_at === "number" &&
    Array.isArray(e.tags) &&
    e.tags.every((t) => Array.isArray(t) && t.every((v) => typeof v === "string"))
  );
}

/** What the relay was asked for: it may send anything, this keeps only that. */
function matches(e: NostrEvent, filter: Filter): boolean {
  if (filter.kinds && !filter.kinds.includes(e.kind)) return false;
  const wanted = filter["#x"];
  return !wanted || e.tags.some((t) => t[0] === "x" && wanted.includes(t[1] ?? ""));
}

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (value: string) =>
  Uint8Array.from(value.match(/../g) ?? [], (b) => Number.parseInt(b, 16));

/** NIP-01's id: the SHA-256 of `[0, pubkey, created_at, kind, tags, content]` as JSON. */
export function eventId(e: Omit<NostrEvent, "id" | "sig">): string {
  const serial = JSON.stringify([0, e.pubkey, e.created_at, e.kind, e.tags, e.content]);
  return hex(sha256(new TextEncoder().encode(serial)));
}

/** Signs with BIP-340 Schnorr. `aux` is for the frozen vectors only; the app draws it at random. */
export function signEvent(
  secretKey: Uint8Array,
  template: Pick<NostrEvent, "created_at" | "kind" | "tags" | "content">,
  aux?: Uint8Array,
): NostrEvent {
  const pubkey = hex(schnorr.getPublicKey(secretKey));
  const id = eventId({ ...template, pubkey });
  return { ...template, pubkey, id, sig: hex(schnorr.sign(fromHex(id), secretKey, aux)) };
}

export function verifyEvent(e: NostrEvent): boolean {
  try {
    return eventId(e) === e.id && schnorr.verify(fromHex(e.sig), fromHex(e.id), fromHex(e.pubkey));
  } catch {
    // A malformed key or signature from a relay is a forged event: refused, which is the answer.
    return false;
  }
}

export const newSecretKey = () => schnorr.utils.randomSecretKey();

type Socket = {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((message: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
};

/** One connection per relay, opened on first use. Every failure is a relay down, never a throw. */
export class RelayPool {
  private readonly urls: string[];
  private readonly sockets = new Map<string, Promise<Socket | null>>();
  private readonly subscriptions = new Map<
    string,
    { filter: Filter; onEvent: (e: NostrEvent) => void }
  >();
  private readonly seen = new Set<string>();
  private next = 0;

  constructor(urls: string[] = RELAYS) {
    this.urls = urls;
  }

  private open(url: string): Promise<Socket | null> {
    const known = this.sockets.get(url);
    if (known) return known;
    const opening = new Promise<Socket | null>((resolve) => {
      let socket: Socket;
      try {
        socket = new WebSocket(url) as unknown as Socket;
      } catch {
        // A relay URL the platform refuses is a relay down.
        resolve(null);
        return;
      }
      const timer = setTimeout(() => {
        socket.close();
        resolve(null);
      }, 5_000);
      socket.onopen = () => {
        clearTimeout(timer);
        resolve(socket);
      };
      socket.onmessage = (message) => this.receive(message.data);
      socket.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      socket.onclose = () => {
        this.sockets.delete(url);
      };
    });
    this.sockets.set(url, opening);
    return opening;
  }

  private receive(data: unknown): void {
    if (typeof data !== "string" || data.length > MAX_MESSAGE) return;
    let message: unknown;
    try {
      message = JSON.parse(data);
    } catch {
      // Not JSON: nothing a relay should send, and nothing to act on.
      return;
    }
    if (!Array.isArray(message) || message[0] !== "EVENT" || typeof message[1] !== "string") return;
    const subscription = this.subscriptions.get(message[1]);
    const event = message[2];
    // Shape and filter first, the Schnorr check last: a relay that floods pays for nothing (audit 08/11).
    if (!subscription || !isEvent(event) || !matches(event, subscription.filter)) return;
    if (this.seen.has(event.id) || !verifyEvent(event)) return;
    this.seen.add(event.id);
    if (this.seen.size > MAX_SEEN) this.seen.delete(this.seen.values().next().value ?? "");
    subscription.onEvent(event);
  }

  /** Resolves with how many relays took it. */
  async publish(event: NostrEvent): Promise<number> {
    const sockets = await Promise.all(this.urls.map((url) => this.open(url)));
    let sent = 0;
    for (const socket of sockets) {
      if (socket === null) continue;
      try {
        socket.send(JSON.stringify(["EVENT", event]));
        sent++;
      } catch {
        // A relay closing under the send is a relay down: the others still get it.
      }
    }
    return sent;
  }

  subscribe(filter: Filter, onEvent: (e: NostrEvent) => void): { close(): void } {
    const id = `bati${this.next++}`;
    this.subscriptions.set(id, { filter, onEvent });
    for (const url of this.urls) {
      this.open(url)
        .then((socket) => socket?.send(JSON.stringify(["REQ", id, filter])))
        // A relay that closed meanwhile is a relay down; the subscription lives on the others.
        .catch(() => undefined);
    }
    return {
      close: () => {
        this.subscriptions.delete(id);
        for (const opening of this.sockets.values()) {
          opening
            .then((socket) => socket?.send(JSON.stringify(["CLOSE", id])))
            .catch(() => undefined);
        }
      },
    };
  }

  close(): void {
    for (const opening of this.sockets.values())
      opening.then((s) => s?.close()).catch(() => undefined);
    this.sockets.clear();
    this.subscriptions.clear();
  }
}
