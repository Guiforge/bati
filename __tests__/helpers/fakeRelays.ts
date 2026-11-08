import type { NostrEvent } from "../../src/nostrRelay";

/** Relays in memory: what a WebSocket to each URL would reach. `down` relays refuse to open. */
export function fakeRelays(down: string[] = []) {
  const sockets = new Set<FakeSocket>();
  const published: NostrEvent[] = [];
  class FakeSocket {
    onopen: (() => void) | null = null;
    onmessage: ((m: { data: unknown }) => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    subs = new Map<string, Record<string, unknown>>();
    readonly url: string;
    constructor(url: string) {
      this.url = url;
      setTimeout(() => (down.includes(url) ? this.onerror?.() : this.onopen?.()), 0);
      sockets.add(this);
    }
    send(data: string) {
      const message = JSON.parse(data) as unknown[];
      if (message[0] === "REQ")
        this.subs.set(message[1] as string, message[2] as Record<string, unknown>);
      if (message[0] === "EVENT") {
        const event = message[1] as NostrEvent;
        published.push(event);
        for (const socket of sockets) {
          if (socket.url !== this.url) continue;
          for (const [id] of socket.subs)
            socket.onmessage?.({ data: JSON.stringify(["EVENT", id, event]) });
        }
      }
    }
    close() {
      sockets.delete(this);
    }
  }
  return {
    FakeSocket,
    published,
    deliver: (data: string) => {
      for (const s of sockets) s.onmessage?.({ data });
    },
  };
}
