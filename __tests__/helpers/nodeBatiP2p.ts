import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import tls from "node:tls";

import type { BatiP2p, P2pEvents } from "../../modules/bati-p2p";

/**
 * BatiP2pModule.kt in Node: a real self-signed P-256 certificate, real mutual TLS on loopback with
 * the same pin rule, and a shared in-process "Wi-Fi" for NSD. It is a double of the *device*, so the
 * protocol in src/p2p/ runs for real between two of these. The certificate comes from the openssl
 * command line, which Node has no API for; every CI image and dev machine here has it.
 */
export type Lan = {
  services: Map<string, { host: string; port: number }>;
  browsers: Set<(found: P2pEvents["onFound"]) => void>;
  /** What every device on this Wi-Fi saw: each TLS record and NSD name, for the privacy capture. */
  seen: Buffer[];
};

export const makeLan = (): Lan => ({ services: new Map(), browsers: new Set(), seen: [] });

type Identity = { key: string; cert: string; id: string };

export function makeIdentity(dir = fs.mkdtempSync(path.join(os.tmpdir(), "p2p-id-"))): Identity {
  const key = path.join(dir, "key.pem");
  const cert = path.join(dir, "cert.pem");
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "ec",
      "-pkeyopt",
      "ec_paramgen_curve:prime256v1",
      "-keyout",
      key,
      "-out",
      cert,
      "-days",
      "36500",
      "-nodes",
      "-subj",
      "/CN=device",
    ],
    { stdio: "ignore" },
  );
  const pem = fs.readFileSync(cert, "utf8");
  return {
    key: fs.readFileSync(key, "utf8"),
    cert: pem,
    id: idOf(new crypto.X509Certificate(pem).raw),
  };
}

const idOf = (der: Buffer) => crypto.createHash("sha256").update(der).digest("hex");

const TLS_OPTIONS = {
  minVersion: "TLSv1.2",
  ciphers:
    "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305",
} as const;

export type NodeP2p = BatiP2p & {
  identity: Identity;
  /** Every socket this device holds, to cut them the way a dropped Wi-Fi does. */
  cutAll(): void;
};

export function nodeBatiP2p(
  lan: Lan,
  options: { name?: string; identity?: Identity; host?: string } = {},
): NodeP2p {
  const identity = options.identity ?? makeIdentity();
  const host = options.host ?? "127.0.0.1";
  const listeners = new Map<keyof P2pEvents, Set<(payload: never) => void>>();
  const emit = <E extends keyof P2pEvents>(event: E, payload: P2pEvents[E]) => {
    for (const listener of listeners.get(event) ?? [])
      (listener as (p: P2pEvents[E]) => void)(payload);
  };
  const sockets = new Map<number, tls.TLSSocket>();
  let next = 1;
  let server: tls.Server | null = null;
  let pins: { list: string[]; any: boolean } = { list: [], any: false };
  let announced: string | null = null;
  let browser: ((found: P2pEvents["onFound"]) => void) | null = null;

  const adopt = (socket: tls.TLSSocket): number => {
    const id = next++;
    sockets.set(id, socket);
    socket.on("data", (chunk: Buffer) => {
      lan.seen.push(chunk);
      emit("onData", { socket: id, bytes: chunk.toString("base64") });
    });
    let closed = false;
    const close = (reason: string) => {
      if (closed) return;
      closed = true;
      sockets.delete(id);
      emit("onClosed", { socket: id, reason });
    };
    socket.on("close", () => close("closed"));
    socket.on("error", (error) => close(error.message));
    return id;
  };

  return {
    identity,
    cutAll: () => {
      for (const socket of sockets.values()) socket.destroy();
    },
    deviceId: () => Promise.resolve(identity.id),
    deviceName: () => Promise.resolve(options.name ?? "Node device"),
    localAddresses: () => Promise.resolve([host]),
    listen: (list, any, port) =>
      new Promise((resolve, reject) => {
        pins = { list, any };
        let busy = false;
        server = tls.createServer(
          {
            ...TLS_OPTIONS,
            key: identity.key,
            cert: identity.cert,
            requestCert: true,
            rejectUnauthorized: false,
            handshakeTimeout: 5000,
          },
          (socket) => {
            const peer = socket.getPeerX509Certificate();
            const peerId = peer ? idOf(peer.raw) : "";
            if (busy || peerId === "" || (!pins.any && !pins.list.includes(peerId))) {
              socket.destroy();
              return;
            }
            busy = true;
            socket.on("close", () => {
              busy = false;
            });
            emit("onConnected", {
              socket: adopt(socket),
              peerId,
              address: socket.remoteAddress ?? "",
            });
          },
        );
        server.on("tlsClientError", () => undefined);
        const bound = server as tls.Server;
        bound.once("error", (error: NodeJS.ErrnoException) => {
          if (error.code === "EADDRINUSE" && port !== 0) bound.listen(0, host);
          else reject(error);
        });
        bound.once("listening", () => {
          const address = bound.address();
          resolve(typeof address === "object" && address ? address.port : 0);
        });
        bound.listen(port, host);
      }),
    setPins: (list, any) => {
      pins = { list, any };
      return Promise.resolve();
    },
    stopListening: async () => {
      const closing = server;
      server = null;
      if (closing) await new Promise<void>((resolve) => closing.close(() => resolve()));
    },
    dial: (to, port, pin) =>
      new Promise((resolve, reject) => {
        const socket = tls.connect({
          ...TLS_OPTIONS,
          host: to,
          port,
          key: identity.key,
          cert: identity.cert,
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined,
        });
        const timer = setTimeout(() => {
          socket.destroy();
          reject(new Error("UNREACHABLE timeout"));
        }, 5000);
        socket.once("secureConnect", () => {
          clearTimeout(timer);
          const peer = socket.getPeerX509Certificate();
          if (!peer || idOf(peer.raw) !== pin) {
            socket.destroy();
            reject(new Error("PIN another device answered"));
            return;
          }
          resolve(adopt(socket));
        });
        socket.once("error", (error: NodeJS.ErrnoException) => {
          clearTimeout(timer);
          reject(
            new Error(
              error.code === "ECONNREFUSED"
                ? `UNREACHABLE ${error.message}`
                : `TLS ${error.message}`,
            ),
          );
        });
      }),
    send: (socket, bytes) =>
      new Promise((resolve, reject) => {
        const target = sockets.get(socket);
        if (!target) {
          reject(new Error("closed"));
          return;
        }
        target.write(Buffer.from(bytes, "base64"), (error) => (error ? reject(error) : resolve()));
      }),
    close: (socket) => {
      sockets.get(socket)?.destroy();
      return Promise.resolve();
    },
    announce: (name, port) => {
      announced = name;
      lan.seen.push(Buffer.from(name));
      lan.services.set(name, { host, port });
      for (const listener of lan.browsers) listener({ name, host, port });
      return Promise.resolve();
    },
    browse: () => {
      browser = (found) => emit("onFound", found);
      lan.browsers.add(browser);
      for (const [name, at] of lan.services) browser({ name, ...at });
      return Promise.resolve();
    },
    stopDiscovery: () => {
      if (announced) lan.services.delete(announced);
      announced = null;
      if (browser) lan.browsers.delete(browser);
      browser = null;
      return Promise.resolve();
    },
    addListener: (event, listener) => {
      const set = listeners.get(event) ?? new Set();
      set.add(listener as (payload: never) => void);
      listeners.set(event, set);
      return { remove: () => set.delete(listener as (payload: never) => void) };
    },
  };
}
