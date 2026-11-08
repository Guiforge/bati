import { sha256 } from "@noble/hashes/sha2.js";
import { Directory, File, FileMode, Paths } from "expo-file-system";

import { MAX_SEALED_BYTES } from "@/src/backupCipher";

import { type AnnouncedFile, BLOCK_BYTES } from "./frames";

/**
 * The files of device-to-device sync, all under `Paths.document/p2p/` (SPEC.md T1 to T4, S6):
 *   out/<name>          what this device last wrote for the peer: its own file "on the server"
 *   in/<name>           the peer's last file, verified, with in/state.json naming its SHA-256
 *   in/<sha>.part       a file on its way, resumed for 24 h while its SHA-256 is announced again
 * Nothing here is in a backup: the three backed-up files live elsewhere.
 */
export const p2pDir = () => new Directory(Paths.document, "p2p");
const outDir = () => new Directory(p2pDir(), "out");
const inDir = () => new Directory(p2pDir(), "in");
const PART_HOURS = 24;
/** Blocks asked for at a time: enough to keep the socket busy, few enough to resend after a bad one. */
export const WINDOW = 8;

export const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function ensure(dir: Directory): Directory {
  if (!dir.exists) dir.create();
  return dir;
}

/** The name, size, SHA-256 and block hashes of a file, read 128 KiB at a time. */
export async function describe(file: File, name: string): Promise<AnnouncedFile> {
  const handle = file.open(FileMode.ReadOnly);
  try {
    const whole = sha256.create();
    const blocks: Uint8Array[] = [];
    const size = handle.size ?? 0;
    for (let at = 0; at < size; at += BLOCK_BYTES) {
      const block = await handle.readBytes(BLOCK_BYTES);
      whole.update(block);
      blocks.push(sha256(block));
    }
    return { name, size, sha256: whole.digest(), blocks };
  } finally {
    handle.close();
  }
}

export async function readBlock(file: File, index: number): Promise<Uint8Array> {
  const handle = file.open(FileMode.ReadOnly);
  try {
    handle.offset = index * BLOCK_BYTES;
    return await handle.readBytes(BLOCK_BYTES);
  } finally {
    handle.close();
  }
}

/** This device's outbox: the one file it offers the peer. */
export function outbox(): File | null {
  const dir = outDir();
  if (!dir.exists) return null;
  const file = dir.list().find((f): f is File => f instanceof File && f.name.endsWith(".batb"));
  return file ?? null;
}

/** Replaces the outbox with `source`, under `name`, without a moment where it holds neither (T1, S4). */
export async function replaceOutbox(source: File, name: string): Promise<File> {
  const dir = ensure(outDir());
  const next = new File(dir, `${name}.next`);
  if (next.exists) next.delete();
  await source.copy(next);
  for (const old of dir.list()) if (old instanceof File && old.name !== next.name) old.delete();
  const target = new File(dir, name);
  next.moveSync(target);
  return target;
}

type InState = { name: string; sha: string };

function readInState(): InState | null {
  const state = new File(inDir(), "state.json");
  if (!state.exists) return null;
  const parsed = JSON.parse(state.textSync()) as InState;
  return new File(inDir(), parsed.name).exists ? parsed : null;
}

/** The peer's last verified file, or `null`. */
export function received(): { file: File; sha: string } | null {
  const state = readInState();
  return state ? { file: new File(inDir(), state.name), sha: state.sha } : null;
}

export type Incoming = {
  announced: AnnouncedFile;
  part: File;
  /** Blocks already on disk and checked, from the start: a resumed `.part` (T4). */
  next: number;
};

export type Refusal = "name" | "size" | "noSpace";

/**
 * Where an announced file goes. `null` when it is the one already received (nothing to fetch).
 * Every other `.part` is deleted, and so is this one if it is older than 24 h.
 */
export async function prepareIncoming(
  announced: AnnouncedFile,
  expectedName: string,
): Promise<Incoming | Refusal | null> {
  if (announced.name !== expectedName) return "name";
  if (announced.size > MAX_SEALED_BYTES) return "size";
  const sha = hex(announced.sha256);
  if (readInState()?.sha === sha) return null;
  const part = freshPart(sha);
  const have = part.exists ? part.size : 0;
  if (announced.size - have > Paths.availableDiskSpace) return "noSpace";
  if (!part.exists) part.writeSync(new Uint8Array(0));
  return { announced, part, next: await blocksAlreadyThere(part, announced, have) };
}

/** The `.part` of this SHA-256, after every other one is deleted, and this one too past 24 h (T4). */
function freshPart(sha: string): File {
  const dir = ensure(inDir());
  const part = new File(dir, `${sha}.part`);
  const others = dir.list().filter((f) => f instanceof File && f.name.endsWith(".part"));
  for (const other of others) if (other.name !== part.name) other.delete();
  const stale = Date.now() - (part.exists ? (part.info().modificationTime ?? 0) : Date.now());
  if (stale > PART_HOURS * 3_600_000) part.delete();
  return part;
}

/** Resume from the first block that is not there whole and right: the sender sends in order. */
async function blocksAlreadyThere(
  part: File,
  announced: AnnouncedFile,
  have: number,
): Promise<number> {
  let next = 0;
  while (next < announced.blocks.length && (next + 1) * BLOCK_BYTES <= have) {
    const block = await readBlock(part, next);
    if (hex(sha256(block)) !== hex(announced.blocks[next] ?? new Uint8Array(0))) break;
    next++;
  }
  return next;
}

export function blockIsRight(incoming: Incoming, index: number, bytes: Uint8Array): boolean {
  const expected = incoming.announced.blocks[index];
  const length = Math.min(BLOCK_BYTES, incoming.announced.size - index * BLOCK_BYTES);
  return expected !== undefined && bytes.length === length && hex(sha256(bytes)) === hex(expected);
}

export async function writeBlock(incoming: Incoming, bytes: Uint8Array): Promise<void> {
  const handle = incoming.part.open(FileMode.ReadWrite);
  try {
    handle.offset = incoming.next * BLOCK_BYTES;
    await handle.writeBytes(bytes);
  } finally {
    handle.close();
  }
  incoming.next++;
}

/**
 * The whole `.part` checked again from the disk (T3), then renamed into place, replacing the
 * previous file. False, and the `.part` deleted, when the bytes on disk are not the file announced.
 */
export async function finish(incoming: Incoming): Promise<boolean> {
  const { announced, part } = incoming;
  const onDisk = await describe(part, announced.name);
  if (onDisk.size !== announced.size || hex(onDisk.sha256) !== hex(announced.sha256)) {
    part.delete();
    return false;
  }
  const dir = inDir();
  for (const old of dir.list()) if (old instanceof File && old.name.endsWith(".batb")) old.delete();
  part.moveSync(new File(dir, announced.name));
  new File(dir, "state.json").writeSync(
    JSON.stringify({ name: announced.name, sha: hex(announced.sha256) }),
  );
  return true;
}

/** The peer's files and this device's outbox, for "Forget this device" (L7). Kept copies stay. */
export function wipe(): void {
  for (const dir of [inDir(), outDir()]) if (dir.exists) dir.delete();
}
