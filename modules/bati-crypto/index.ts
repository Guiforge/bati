import { requireOptionalNativeModule } from "expo";

/**
 * The platform's `javax.crypto`, four primitives wide. Every value is base64 except paths, which
 * are plain filesystem paths or `file://` URIs. See BatiCryptoModule.kt for why it is native and
 * why it is this small; the format built on it is src/backupCipher.ts.
 */
export type BatiCrypto = {
  randomBytes(length: number): Promise<string>;
  /** `password` is base64 of its UTF-8 bytes; see BatiCryptoModule.kt. */
  pbkdf2(password: string, salt: string, iterations: number): Promise<string>;
  seal(key: string, plaintext: string, aad: string): Promise<string>;
  /** Rejects on a wrong key or any altered byte. */
  open(key: string, sealed: string, aad: string): Promise<string>;
  readPrefix(path: string, length: number): Promise<string>;
  sealFile(key: string, inPath: string, outPath: string, header: string): Promise<void>;
  /** Rejects, and leaves nothing at `outPath`, unless the whole file authenticates. */
  openFile(key: string, inPath: string, outPath: string, headerLength: number): Promise<void>;

  // --- format 3 (BatiCryptoV3.kt). The header is parsed there and nowhere else; a slot is handed
  // around as the `raw` bytes it came with, so JS decides what to do with slots and never what
  // they contain.

  /** The header of a format 3 file, shape-checked, or why it is not one. Reads the file's start only. */
  readHeader(path: string): Promise<ReadHeaderResult>;
  /** Whether `key` made this file's header. Constant time, and no body is read. */
  checkKey(key: string, path: string): Promise<boolean>;
  /** The master key in a slot, or `null`. `secret` is base64 of the password bytes or of the 16 word bytes. */
  unwrapSlot(secret: string, slotRaw: string): Promise<string | null>;
  /** Rejects with a message containing `LOW_MEMORY` when Argon2 would not fit in the heap. */
  wrapSlot(
    key: string,
    secret: string,
    kind: number,
    gen: number,
    memoryKib: number,
    passes: number,
    lanes: number,
  ): Promise<SlotInfo>;
  /** `installId` is 32 hex digits; `counter` is a decimal string, exact past 2^53. */
  sealFileV3(
    key: string,
    inPath: string,
    outPath: string,
    slotsRaw: string[],
    installId: string,
    counter: string,
  ): Promise<void>;
  /** Rejects, and leaves nothing at `outPath`, unless the check and every segment authenticate. */
  openFileV3(key: string, inPath: string, outPath: string): Promise<void>;
  /** 16 bytes, base64: names a key without revealing it, for sync to compare. */
  keyId(key: string): Promise<string>;
};

/** One key slot. `raw` is what goes back into `sealFileV3`; the rest is what JS decides on. */
export type SlotInfo = {
  /** 3 is a password (Argon2id), 4 is the twelve words. */
  kind: number;
  gen: number;
  memoryKib: number;
  passes: number;
  lanes: number;
  raw: string;
};

export type HeaderInfo = {
  headerLength: number;
  /** 32 hex digits, lower case, no dashes. */
  installId: string;
  /** Decimal: JS numbers stop being exact at 2^53, and a counter is an unsigned 64-bit. */
  counter: string;
  sealedAt: number;
  slots: SlotInfo[];
};

export type ReadHeaderResult =
  | { kind: "ok"; header: HeaderInfo }
  | { kind: "newerVersion" }
  | { kind: "notThis" };

const native = requireOptionalNativeModule<BatiCrypto>("BatiCrypto");

/** The module, or a throw that names the missing build rather than an undefined call. */
export function batiCrypto(): BatiCrypto {
  if (!native) throw new Error("BatiCrypto native module is not in this build");
  return native;
}
