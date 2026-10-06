import type { Peer } from "@/src/deviceSync";

/**
 * The order in which locked peers are offered, best vault first: a higher format, then the one
 * written last, then the larger file name. With several to join, the hero is asked about the one
 * the others will end up joining too.
 */
export function joinOrder(a: Peer, b: Peer): number {
  const formatOf = (p: Peer) => (p.state === "locked" ? p.format : 0);
  return (
    formatOf(b) - formatOf(a) || (b.modified ?? 0) - (a.modified ?? 0) || (a.name < b.name ? 1 : -1)
  );
}

/**
 * `peers` as they are, except that every device to join stands for the best of them. The prompt
 * takes the first peer that asks something of the hero, so with two vaults on offer it asks about
 * the better one and, once that is settled, the next sync judges the other again. The other peers
 * keep their places: the order the hero is asked in is otherwise the order they were found.
 */
export function bestVaultFirst(peers: Peer[]): Peer[] {
  const [best] = peers.filter((peer) => peer.state === "locked").sort(joinOrder);
  return best === undefined ? peers : peers.map((peer) => (peer.state === "locked" ? best : peer));
}
