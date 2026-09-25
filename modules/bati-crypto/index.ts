import { requireOptionalNativeModule } from "expo";

/**
 * The platform's `javax.crypto`, four primitives wide. Every value is base64 except paths, which
 * are plain filesystem paths or `file://` URIs. See BatiCryptoModule.kt for why it is native and
 * why it is this small; the format built on it is src/backupCipher.ts.
 */
export type BatiCrypto = {
  randomBytes(length: number): Promise<string>;
  pbkdf2(password: string, salt: string, iterations: number): Promise<string>;
  seal(key: string, plaintext: string, aad: string): Promise<string>;
  /** Rejects on a wrong key or any altered byte. */
  open(key: string, sealed: string, aad: string): Promise<string>;
  readPrefix(path: string, length: number): Promise<string>;
  sealFile(key: string, inPath: string, outPath: string, header: string): Promise<void>;
  /** Rejects, and leaves nothing at `outPath`, unless the whole file authenticates. */
  openFile(key: string, inPath: string, outPath: string, headerLength: number): Promise<void>;
};

const native = requireOptionalNativeModule<BatiCrypto>("BatiCrypto");

/** The module, or a throw that names the missing build rather than an undefined call. */
export function batiCrypto(): BatiCrypto {
  if (!native) throw new Error("BatiCrypto native module is not in this build");
  return native;
}
