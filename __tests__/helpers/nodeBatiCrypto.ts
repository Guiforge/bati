import crypto from "node:crypto";
import fs from "node:fs";

import type { BatiCrypto } from "../../modules/bati-crypto";

/**
 * BatiCryptoModule.kt, in Node's `crypto`, byte for byte: same algorithms, same layout
 * (`nonce ‖ ciphertext ‖ tag`), same "nothing at outPath unless it authenticated". Tests then
 * encrypt and decrypt for real, so a format bug in src/backupCipher.ts fails here rather than on
 * a phone. It is a double of the *device*, not of the code under test.
 */
const NONCE = 12;
const TAG = 16;
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
const bytes = (value: string) => Buffer.from(value, "base64");
const path = (value: string) => value.replace(/^file:\/\//, "");

function seal(key: string, plaintext: Buffer, aad: Buffer): Buffer {
  const nonce = crypto.randomBytes(NONCE);
  const cipher = crypto.createCipheriv("aes-256-gcm", bytes(key), nonce);
  cipher.setAAD(aad);
  return Buffer.concat([nonce, cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
}

function open(key: string, sealed: Buffer, aad: Buffer): Buffer {
  const decipher = crypto.createDecipheriv("aes-256-gcm", bytes(key), sealed.subarray(0, NONCE));
  decipher.setAAD(aad);
  decipher.setAuthTag(sealed.subarray(sealed.length - TAG));
  return Buffer.concat([
    decipher.update(sealed.subarray(NONCE, sealed.length - TAG)),
    decipher.final(),
  ]);
}

/** Sync work, delivered the way a native AsyncFunction delivers it: a throw is a rejection. */
const later = <T>(work: () => T): Promise<T> => Promise.resolve().then(work);

/** PBKDF2 calls, counted, so a test can prove a secret was stretched and how hard. */
export const pbkdf2Calls: number[] = [];

export const nodeBatiCrypto: BatiCrypto = {
  randomBytes: (length) => later(() => b64(crypto.randomBytes(length))),
  pbkdf2: (password, salt, iterations) =>
    later(() => {
      pbkdf2Calls.push(iterations);
      return b64(crypto.pbkdf2Sync(bytes(password), bytes(salt), iterations, 32, "sha256"));
    }),
  seal: (key, plaintext, aad) => later(() => b64(seal(key, bytes(plaintext), bytes(aad)))),
  open: (key, sealed, aad) => later(() => b64(open(key, bytes(sealed), bytes(aad)))),
  readPrefix: (inPath, length) =>
    later(() => b64(fs.readFileSync(path(inPath)).subarray(0, length))),
  sealFile: (key, inPath, outPath, header) =>
    later(() => {
      const headerBytes = bytes(header);
      const sealed = seal(key, fs.readFileSync(path(inPath)), headerBytes);
      fs.writeFileSync(path(outPath), Buffer.concat([headerBytes, sealed]));
    }),
  openFile: (key, inPath, outPath, headerLength) =>
    later(() => {
      const all = fs.readFileSync(path(inPath));
      const plain = open(key, all.subarray(headerLength), all.subarray(0, headerLength));
      fs.writeFileSync(path(outPath), plain);
    }),
};
