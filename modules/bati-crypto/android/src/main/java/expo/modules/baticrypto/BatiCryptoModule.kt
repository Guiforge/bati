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
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
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

    AsyncFunction("pbkdf2") { password: String, salt: String, iterations: Int ->
      val spec = PBEKeySpec(password.toCharArray(), decode(salt), iterations, KEY_BITS)
      try {
        encode(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded)
      } finally {
        spec.clearPassword()
      }
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
     * The reverse of `sealFile`, given the header's length. Nothing is left at `outPath` unless the
     * tag verified: a plaintext cut short by a wrong key is exactly what must never be restored.
     */
    AsyncFunction("openFile") { key: String, inPath: String, outPath: String, headerLength: Int ->
      BufferedInputStream(FileInputStream(path(inPath))).use { input ->
        val headerBytes = input.readExactly(headerLength)
        val nonce = input.readExactly(NONCE_BYTES)
        val cipher = cipher(Cipher.DECRYPT_MODE, key, nonce, headerBytes)
        writeOrDelete(outPath) { out ->
          val buffer = ByteArray(BUFFER_BYTES)
          while (true) {
            val read = input.read(buffer)
            if (read < 0) break
            cipher.update(buffer, 0, read)?.let(out::write)
          }
          out.write(cipher.doFinal())
        }
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
    const val KEY_BITS = 256
    const val NONCE_BYTES = 12
    const val TAG_BITS = 128
    const val BUFFER_BYTES = 64 * 1024
  }
}
