package expo.modules.baticrypto

import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.security.SecureRandom
import java.nio.ByteBuffer
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * The four primitives an encrypted backup needs, from the platform's own `javax.crypto` and
 * nothing else.
 *
 * Not a library: react-native-quick-crypto and react-native-libsodium both ship prebuilt native
 * binaries that F-Droid would have to rebuild, and a pure-JS KDF on Hermes (no JIT) takes tens of
 * seconds at a strength worth having. PBKDF2-HMAC-SHA256 and AES-GCM have been in every Android
 * since API 26, which is below this app's floor.
 *
 * Everything crosses the bridge as base64 except the snapshot itself, which stays on disk: a
 * database of a few MB would otherwise be copied through JS twice. The format — what the header
 * holds, what the key slots are — is decided in TypeScript (src/backupCipher.ts), where it is
 * tested; this file only ever sees opaque bytes.
 *
 * Every function is an `AsyncFunction`, so Expo runs it off the main thread: 600,000 PBKDF2
 * iterations is most of a second on a mid-range phone.
 */
class BatiCryptoModule : Module() {
  private val random = SecureRandom()

  override fun definition() = ModuleDefinition {
    Name("BatiCrypto")

    AsyncFunction("randomBytes") { length: Int ->
      val bytes = ByteArray(length)
      random.nextBytes(bytes)
      encode(bytes)
    }

    /**
     * PBKDF2-HMAC-SHA256 over the password's *bytes* (UTF-8 of its NFC form, made in JS). Not
     * `SecretKeyFactory`: that takes a `char[]` and leaves the char-to-byte conversion to the
     * provider, and a password with an accent has to stretch to the same key on every phone.
     * One output block, since the key is exactly one SHA-256 wide.
     */
    AsyncFunction("pbkdf2") { password: String, salt: String, iterations: Int ->
      val mac = Mac.getInstance("HmacSHA256").apply { init(SecretKeySpec(decode(password), "HmacSHA256")) }
      var u = mac.doFinal(decode(salt) + byteArrayOf(0, 0, 0, 1))
      val out = u.copyOf()
      repeat(iterations - 1) {
        u = mac.doFinal(u)
        for (i in out.indices) out[i] = (out[i].toInt() xor u[i].toInt()).toByte()
      }
      encode(out)
    }

    /** Up to `length` bytes from the start of a file: enough to read a header before any key. */
    AsyncFunction("readPrefix") { inPath: String, length: Int ->
      BufferedInputStream(FileInputStream(path(inPath))).use { input ->
        val bytes = ByteArray(length)
        var offset = 0
        while (offset < length) {
          val read = input.read(bytes, offset, length - offset)
          if (read < 0) break
          offset += read
        }
        encode(bytes.copyOf(offset))
      }
    }

    /** `nonce ‖ ciphertext ‖ tag`, for things small enough to live in a string: wrapped keys. */
    AsyncFunction("seal") { key: String, plaintext: String, aad: String ->
      val nonce = ByteArray(NONCE_BYTES).also(random::nextBytes)
      val cipher = cipher(Cipher.ENCRYPT_MODE, key, nonce, decode(aad))
      encode(nonce + cipher.doFinal(decode(plaintext)))
    }

    /** Throws `AEADBadTagException` on a wrong key or a single changed byte. */
    AsyncFunction("open") { key: String, sealed: String, aad: String ->
      val bytes = decode(sealed)
      val nonce = bytes.copyOfRange(0, NONCE_BYTES)
      val cipher = cipher(Cipher.DECRYPT_MODE, key, nonce, decode(aad))
      encode(cipher.doFinal(bytes, NONCE_BYTES, bytes.size - NONCE_BYTES))
    }

    /**
     * Writes `header ‖ segment ‖ segment ‖ …` to `outPath`, each segment `nonce ‖ ciphertext ‖ tag`
     * over at most `SEGMENT_BYTES` of plaintext. The header is authenticated but not encrypted,
     * which is what lets a reader find the key slots before it has a key.
     *
     * Segments, because one GCM over the whole file is not streaming on Android: Conscrypt buffers
     * every `update()` until `doFinal`, and a 128 MB database asked the heap for 134 MB at once and
     * failed on a 192 MB phone (measured on the emulator, 2026-09-26). Each segment's AAD is the
     * header, its index and whether it is the last, so segments cannot be reordered, dropped, or
     * cut off at a boundary without failing like any other altered byte.
     */
    AsyncFunction("sealFile") { key: String, inPath: String, outPath: String, header: String ->
      val headerBytes = decode(header)
      writeOrDelete(outPath) { out ->
        out.write(headerBytes)
        BufferedInputStream(FileInputStream(path(inPath))).use { input ->
          var current = input.readUpTo(SEGMENT_BYTES)
          var index = 0
          while (true) {
            val next = input.readUpTo(SEGMENT_BYTES)
            val last = next.isEmpty()
            val nonce = ByteArray(NONCE_BYTES).also(random::nextBytes)
            val cipher = cipher(Cipher.ENCRYPT_MODE, key, nonce, segmentAad(headerBytes, index, last))
            out.write(nonce)
            out.write(cipher.doFinal(current))
            if (last) break
            current = next
            index++
          }
        }
      }
    }

    /**
     * The reverse of `sealFile`, given the header's length. The plaintext is written beside the
     * target and only takes its name once the tag verified: whether a provider releases plaintext
     * before `doFinal` is its business, and a file cut short by a wrong key must never be found at
     * `outPath`.
     */
    AsyncFunction("openFile") { key: String, inPath: String, outPath: String, headerLength: Int ->
      val part = "${path(outPath).path}.part"
      BufferedInputStream(FileInputStream(path(inPath))).use { input ->
        val headerBytes = input.readExactly(headerLength)
        writeOrDelete(part) { out ->
          var index = 0
          while (true) {
            val segment = input.readUpTo(NONCE_BYTES + SEGMENT_BYTES + TAG_BYTES)
            if (segment.size < NONCE_BYTES + TAG_BYTES) {
              throw IllegalArgumentException("Truncated encrypted file")
            }
            input.mark(1)
            val last = input.read() < 0
            input.reset()
            val nonce = segment.copyOfRange(0, NONCE_BYTES)
            val cipher = cipher(Cipher.DECRYPT_MODE, key, nonce, segmentAad(headerBytes, index, last))
            out.write(cipher.doFinal(segment, NONCE_BYTES, segment.size - NONCE_BYTES))
            if (last) break
            index++
          }
        }
      }
      val target = path(outPath)
      target.delete()
      if (!File(part).renameTo(target)) {
        File(part).delete()
        throw IllegalStateException("Could not move the decrypted file into place")
      }
    }
  }

  private fun cipher(mode: Int, key: String, nonce: ByteArray, aad: ByteArray): Cipher =
    Cipher.getInstance("AES/GCM/NoPadding").apply {
      init(mode, SecretKeySpec(decode(key), "AES"), GCMParameterSpec(TAG_BITS, nonce))
      updateAAD(aad)
    }

  private fun writeOrDelete(outPath: String, write: (BufferedOutputStream) -> Unit) {
    val target = path(outPath)
    try {
      BufferedOutputStream(FileOutputStream(target)).use(write)
    } catch (error: Throwable) {
      target.delete()
      throw error
    }
  }

  /** `header ‖ index (u32 BE) ‖ last (0 or 1)`: what binds a segment to its place in its file. */
  private fun segmentAad(header: ByteArray, index: Int, last: Boolean): ByteArray =
    ByteBuffer.allocate(header.size + 5).put(header).putInt(index).put(if (last) 1 else 0).array()

  /** Up to `length` bytes, fewer only at the end of the stream; empty there. */
  private fun BufferedInputStream.readUpTo(length: Int): ByteArray {
    val bytes = ByteArray(length)
    var offset = 0
    while (offset < length) {
      val read = read(bytes, offset, length - offset)
      if (read < 0) break
      offset += read
    }
    return if (offset == length) bytes else bytes.copyOf(offset)
  }

  private fun BufferedInputStream.readExactly(length: Int): ByteArray =
    readUpTo(length).also {
      if (it.size < length) throw IllegalArgumentException("Truncated encrypted file")
    }

  /** SQLite speaks paths and expo-file-system speaks `file://` URIs; accept both. */
  private fun path(value: String) = File(value.removePrefix("file://"))

  private fun encode(bytes: ByteArray) = Base64.encodeToString(bytes, Base64.NO_WRAP)

  private fun decode(value: String) = Base64.decode(value, Base64.NO_WRAP)

  private companion object {
    const val NONCE_BYTES = 12
    const val TAG_BITS = 128
    const val TAG_BYTES = TAG_BITS / 8
    /** Plaintext per segment; the Node double in __tests__/helpers/nodeBatiCrypto.ts says the same. */
    const val SEGMENT_BYTES = 1024 * 1024
  }
}
