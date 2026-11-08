import { requireOptionalNativeModule } from "expo";

/**
 * Two of the hero's devices talking on the same network: the device key, pinned mutual TLS, and NSD.
 * Nothing else lives in Kotlin. The protocol (frames, blocks, pairing, sync) is TypeScript in
 * src/p2p/, so jest and the node stage run the real one against a Node double of this module
 * (test/node/harness/nodeP2p.ts). See BatiP2pModule.kt for the sockets and docs/designs/p2p-sync/SPEC.md.
 *
 * Every byte array crossing here is base64 (standard alphabet, padded), like bati-crypto. A device ID
 * is the SHA-256 of the device's DER certificate, as 64 lowercase hex digits.
 */
export type BatiP2p = {
  /** This device's ID. The first call creates the Keystore key (`bati.p2p.device`) and its certificate (L8). */
  deviceId(): Promise<string>;
  /** The name the hero gave this device in Android, else its model. At most 32 bytes of UTF-8, cut on a character. */
  deviceName(): Promise<string>;
  /**
   * The addresses another device on the same network can reach: IPv4 private and IPv6 link-local or
   * unique-local of the up, non-loopback, non-cellular interfaces. `global` adds global IPv6 (Phase 2).
   */
  localAddresses(global: boolean): Promise<string[]>;
  /**
   * Opens the TLS listener on every interface, on `port` if it is free (0 or taken: an ephemeral
   * one), and resolves with the port bound. A stable port is what lets the last known address work
   * again next session, before NSD has answered (D3). One
   * connection at a time; a second one is closed at once (C1). A client must present a certificate
   * whose ID is in `pins`, or anything when `acceptAny` (A waiting for a pairing code, L4): the ID
   * then reaches JS in `onConnected` and the token decides. The handshake has 5 s.
   */
  listen(pins: string[], acceptAny: boolean, port: number): Promise<number>;
  /** Changes who the listener accepts, for the next connection (A after the hero confirmed). */
  setPins(pins: string[], acceptAny: boolean): Promise<void>;
  stopListening(): Promise<void>;
  /**
   * Connects to `host:port` and resolves with the socket once TLS is up and the server's ID is
   * `pin`. Rejects with a message starting with `PIN` (another device answered), `UNREACHABLE`
   * (nothing answered within 5 s) or `TLS` (the handshake failed otherwise).
   */
  dial(host: string, port: number, pin: string): Promise<number>;
  /** Resolves once the bytes are handed to the socket. Rejects if it is closed. */
  send(socket: number, bytes: string): Promise<void>;
  close(socket: number): Promise<void>;
  /** Registers `_bati._tcp` under `name`, with an empty TXT record (D2). */
  announce(name: string, port: number): Promise<void>;
  /** Browses `_bati._tcp`; each service resolved is an `onFound`. */
  browse(): Promise<void>;
  /** Unregisters and stops browsing. Safe to call when neither runs. */
  stopDiscovery(): Promise<void>;
  addListener<E extends keyof P2pEvents>(
    event: E,
    listener: (payload: P2pEvents[E]) => void,
  ): {
    remove(): void;
  };
};

export type P2pEvents = {
  /** A client passed TLS on the listener. `peerId` is the ID of its certificate. */
  onConnected: { socket: number; peerId: string; address: string };
  /** Bytes as they came off the socket, in order, any length. */
  onData: { socket: number; bytes: string };
  /** The socket is gone, whoever closed it. Fires once per socket, dialled or accepted. */
  onClosed: { socket: number; reason: string };
  onFound: { name: string; host: string; port: number };
};

/** `null` in jest and in a build without the module. */
export const BatiP2pModule = requireOptionalNativeModule<BatiP2p>("BatiP2p");

/** The module, or a throw that names the missing build rather than an undefined call. */
export function batiP2p(): BatiP2p {
  if (!BatiP2pModule) throw new Error("BatiP2p native module is not in this build");
  return BatiP2pModule;
}
