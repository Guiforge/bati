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
import javax.crypto.Cipher
import javax.crypto.CipherOutputStream
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
     * Writes `header ‖ nonce ‖ ciphertext ‖ tag` to `outPath`. The header is authenticated but not
     * encrypted, which is what lets a reader find the key slots before it has a key, and what makes
     * any edit to those slots fail decryption rather than go unnoticed.
     */
    AsyncFunction("sealFile") { key: String, inPath: String, outPath: String, header: String ->
      val headerBytes = decode(header)
      val nonce = ByteArray(NONCE_BYTES).also(random::nextBytes)
      val cipher = cipher(Cipher.ENCRYPT_MODE, key, nonce, headerBytes)
      writeOrDelete(outPath) { out ->
        out.write(headerBytes)
        out.write(nonce)
        CipherOutputStream(out, cipher).use { sealed -> copy(inPath, sealed) }
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
        val nonce = input.readExactly(NONCE_BYTES)
        val cipher = cipher(Cipher.DECRYPT_MODE, key, nonce, headerBytes)
        writeOrDelete(part) { out ->
          val buffer = ByteArray(BUFFER_BYTES)
          while (true) {
            val read = input.read(buffer)
            if (read < 0) break
            cipher.update(buffer, 0, read)?.let(out::write)
          }
          out.write(cipher.doFinal())
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

  private fun copy(inPath: String, out: java.io.OutputStream) {
    BufferedInputStream(FileInputStream(path(inPath))).use { it.copyTo(out, BUFFER_BYTES) }
  }

  private fun BufferedInputStream.readExactly(length: Int): ByteArray {
    val bytes = ByteArray(length)
    var offset = 0
    while (offset < length) {
      val read = read(bytes, offset, length - offset)
      if (read < 0) throw IllegalArgumentException("Truncated encrypted file")
      offset += read
    }
    return bytes
  }

  /** SQLite speaks paths and expo-file-system speaks `file://` URIs; accept both. */
  private fun path(value: String) = File(value.removePrefix("file://"))

  private fun encode(bytes: ByteArray) = Base64.encodeToString(bytes, Base64.NO_WRAP)

  private fun decode(value: String) = Base64.decode(value, Base64.NO_WRAP)

  private companion object {
    const val NONCE_BYTES = 12
    const val TAG_BITS = 128
    const val BUFFER_BYTES = 64 * 1024
  }
}
