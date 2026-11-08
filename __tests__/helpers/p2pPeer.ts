import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { makeExpoFs } from "../../test/node/harness/fakeExpoFs";
import { type Lan, type NodeP2p, nodeBatiP2p } from "./nodeBatiP2p";

/**
 * One device of a P2P unit test: src/p2p/ in a module registry of its own, over a real disk folder,
 * a SecureStore map, the Node doubles of bati-crypto and bati-p2p (real TLS on loopback), and a Wi-Fi
 * shared with the other device through `lan`. Two of these talk the way two phones do.
 */
export type P2pPeer = {
  name: string;
  dir: string;
  secure: Map<string, string>;
  p2p: NodeP2p;
  reports: { context: string; error: unknown }[];
  session: typeof import("../../src/p2p/session");
  link: typeof import("../../src/p2p/link");
  transfer: typeof import("../../src/p2p/transfer");
  fs: ReturnType<typeof makeExpoFs>;
};

export function p2pPeer(
  lan: Lan,
  name: string,
  radio: Parameters<typeof nodeBatiP2p>[1] = {},
): P2pPeer {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `bati-p2p-${name}-`));
  const secure = new Map<string, string>();
  const p2p = nodeBatiP2p(lan, { name, ...radio });
  const reports: P2pPeer["reports"] = [];
  const expoFs = makeExpoFs(path.join(dir, "cache"));
  let peer!: P2pPeer;
  jest.isolateModules(() => {
    jest.doMock("expo-file-system", () => expoFs);
    jest.doMock("expo-secure-store", () => ({
      getItemAsync: (key: string) => Promise.resolve(secure.get(key) ?? null),
      setItemAsync: (key: string, value: string) => {
        secure.set(key, value);
        return Promise.resolve();
      },
      deleteItemAsync: (key: string) => {
        secure.delete(key);
        return Promise.resolve();
      },
    }));
    jest.doMock("@/modules/bati-crypto", () => ({
      batiCrypto: () => jest.requireActual("./nodeBatiCrypto").nodeBatiCrypto,
    }));
    // backupCipher (for MAX_SEALED_BYTES) opens the database on import; nothing here reads it. The
    // node stage runs the same code over a real database (test/node/p2p).
    jest.doMock("@/db/preferences", () => ({
      getPreference: () => Promise.resolve(null),
      setPreference: () => Promise.resolve(),
      deletePreference: () => Promise.resolve(),
    }));
    jest.doMock("@/modules/bati-p2p", () => ({ batiP2p: () => p2p, BatiP2pModule: p2p }));
    jest.doMock("@/src/reportError", () => ({
      reportError: (context: string, error: unknown) => reports.push({ context, error }),
    }));
    peer = {
      name,
      dir,
      secure,
      p2p,
      reports,
      session: require("../../src/p2p/session"),
      link: require("../../src/p2p/link"),
      transfer: require("../../src/p2p/transfer"),
      fs: expoFs,
    };
  });
  return peer;
}

/** A file of `size` bytes in this peer's cache, to send. */
export function fileOf(peer: P2pPeer, size: number, seed = 1) {
  const bytes = Uint8Array.from({ length: size }, (_, i) => (i * 31 + seed) % 251);
  const file = new peer.fs.File(peer.fs.Paths.cache, `snapshot-${seed}.batb`);
  file.write(bytes);
  // The fake is expo-file-system's File for every member src/p2p touches.
  return { file: file as unknown as import("expo-file-system").File, bytes };
}

/** Resolves on the first view that `match` accepts, or fails after `ms`. */
export function viewOf<V extends { step: string }>(
  views: V[],
  match: (view: V) => boolean,
  ms = 10_000,
): Promise<V> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const look = () => {
      const found = views.find(match);
      if (found) resolve(found);
      else if (Date.now() - started > ms)
        reject(new Error(`No such view; saw ${views.map((v) => v.step).join(", ")}`));
      else setTimeout(look, 20);
    };
    look();
  });
}
