import * as SecureStore from "expo-secure-store";

/**
 * The one other device this one syncs with (SPEC.md L1, L2, section 3). SecureStore, never a
 * backup: a restore onto another phone must not bring a link with it. `{ v, links }` so a later
 * build can hold more than one without a new format.
 */
export type Link = {
  /** 64 hex digits: the SHA-256 of the peer's certificate, pinned. */
  peerId: string;
  peerInstallId: string;
  /** 64 hex digits, from both sides' random bytes (L4). Names the NSD service. */
  secret: string;
  name: string;
  /** Where the peer was last reached, tried before NSD (D3). */
  addresses: { host: string; port: number }[];
};

const STORE_LINK = "bati.p2p.link";

export async function readLink(): Promise<Link | null> {
  const value = await SecureStore.getItemAsync(STORE_LINK);
  if (value === null) return null;
  const stored = JSON.parse(value) as { v: number; links: Link[] };
  return stored.v === 1 ? (stored.links[0] ?? null) : null;
}

export function saveLink(link: Link): Promise<void> {
  return SecureStore.setItemAsync(STORE_LINK, JSON.stringify({ v: 1, links: [link] }));
}

export function forgetLink(): Promise<void> {
  return SecureStore.deleteItemAsync(STORE_LINK);
}

/** The name the peer's file has, the only one accepted from it (S5). */
export const peerFileName = (link: Pick<Link, "peerInstallId">) =>
  `bati-${link.peerInstallId}.batb`;

/** The last 4 characters of a device ID, shown after its name so two "Pixel 7" differ (A5b). */
export const idSuffix = (deviceId: string) => deviceId.slice(-4).toUpperCase();
