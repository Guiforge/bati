package expo.modules.baticrypto

import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.FilterOutputStream
import java.io.OutputStream
import java.nio.ByteBuffer
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * The primitives an encrypted backup needs, over plain `ByteArray` and `File`, with nothing from
 * Android in it.
 *
 * That is the whole reason this is not inside [BatiCryptoModule]: a class that touches
 * `android.util.Base64` cannot run in a JVM unit test, and the format is the one thing in this app
 * that must never change by accident. The module encodes and decodes at the bridge and calls this;
 * the tests under `src/test` call this directly, against the RFC vectors and against files frozen
 * in `__tests__/fixtures/backup`.
 *
 * `random` is injectable for the same reason: a golden file needs a fixed nonce, and nothing else
 * ever passes anything but [SecureRandom].
 */
class BatiCryptoCore(
  private val fill: (ByteArray) -> Unit = SecureRandom()::nextBytes,
) {
  fun randomBytes(length: Int): ByteArray = ByteArray(length).also(fill)

  /**
   * PBKDF2-HMAC-SHA256 over the password's *bytes* (UTF-8 of its NFC form, made in JS). Not
   * `SecretKeyFactory`: that takes a `char[]` and leaves the char-to-byte conversion to the
   * provider, and a password with an accent has to stretch to the same key on every phone. One
   * output block, since the key is exactly one SHA-256 wide.
   */
  fun pbkdf2(
    password: ByteArray,
    salt: ByteArray,
    iterations: Int,
  ): ByteArray {
    val mac = Mac.getInstance("HmacSHA256").apply { init(SecretKeySpec(password, "HmacSHA256")) }
    var u = mac.doFinal(salt + byteArrayOf(0, 0, 0, 1))
    val out = u.copyOf()
    repeat(iterations - 1) {
      u = mac.doFinal(u)
      for (i in out.indices) out[i] = (out[i].toInt() xor u[i].toInt()).toByte()
    }
    return out
  }

  /** Up to `length` bytes from the start of a file: enough to read a header before any key. */
  fun readPrefix(
    file: File,
    length: Int,
  ): ByteArray = BufferedInputStream(FileInputStream(file)).use { it.readUpTo(length) }

  /** `nonce ‖ ciphertext ‖ tag`, for things small enough to live in a string: wrapped keys. */
  fun seal(
    key: ByteArray,
    plaintext: ByteArray,
    aad: ByteArray,
  ): ByteArray {
    val nonce = randomBytes(NONCE_BYTES)
    return nonce + cipher(Cipher.ENCRYPT_MODE, key, nonce, aad).doFinal(plaintext)
  }

  /** Throws `AEADBadTagException` on a wrong key or a single changed byte. */
  fun open(
    key: ByteArray,
    sealed: ByteArray,
    aad: ByteArray,
  ): ByteArray {
    val nonce = sealed.copyOfRange(0, NONCE_BYTES)
    return cipher(Cipher.DECRYPT_MODE, key, nonce, aad).doFinal(sealed, NONCE_BYTES, sealed.size - NONCE_BYTES)
  }

  /**
   * Writes `header ‖ segment ‖ segment ‖ …`, each segment `nonce ‖ ciphertext ‖ tag` over at most
   * [SEGMENT_BYTES] of plaintext. The header is authenticated but not encrypted, which is what lets
   * a reader find the key slots before it has a key.
   *
   * Segments, because one GCM over the whole file is not streaming on Android: Conscrypt buffers
   * every `update()` until `doFinal`, and a 128 MB database asked the heap for 134 MB at once and
   * failed on a 192 MB phone (measured on the emulator, 2026-09-26). Each segment's AAD is the
   * header, its index and whether it is the last, so segments cannot be reordered, dropped, or cut
   * off at a boundary without failing like any other altered byte.
   *
   * A file of exactly N segments has N segments and the Nth is the last; an empty file has one
   * empty segment, marked last. (Older files written by the Node double in the tests have one more,
   * empty, and open all the same: "last" is where the file ends, not what the writer meant.)
   */
  fun sealFile(
    key: ByteArray,
    input: File,
    output: File,
    header: ByteArray,
  ) {
    writeAtomically(output) { out ->
      out.write(header)
      BufferedInputStream(FileInputStream(input)).use { source ->
        var current = source.readUpTo(SEGMENT_BYTES)
        var index = 0
        while (true) {
          val next = source.readUpTo(SEGMENT_BYTES)
          val last = next.isEmpty()
          val nonce = randomBytes(NONCE_BYTES)
          val cipher = cipher(Cipher.ENCRYPT_MODE, key, nonce, segmentAad(header, index, last))
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
   * The reverse of [sealFile], given the header's length. The plaintext is written beside the
   * target and only takes its name once every tag verified: whether a provider releases plaintext
   * before `doFinal` is its business, and a file cut short by a wrong key must never be found at
   * `output`.
   */
  fun openFile(
    key: ByteArray,
    input: File,
    output: File,
    headerLength: Int,
  ) {
    val part = File("${output.path}.part")
    BufferedInputStream(FileInputStream(input)).use { source ->
      val header = source.readExactly(headerLength)
      writeOrDelete(part) { out ->
        var index = 0
        while (true) {
          val segment = source.readUpTo(NONCE_BYTES + SEGMENT_BYTES + TAG_BYTES)
          if (segment.size < NONCE_BYTES + TAG_BYTES) {
            throw IllegalArgumentException("Truncated encrypted file")
          }
          source.mark(1)
          val last = source.read() < 0
          source.reset()
          val nonce = segment.copyOfRange(0, NONCE_BYTES)
          val cipher = cipher(Cipher.DECRYPT_MODE, key, nonce, segmentAad(header, index, last))
          out.write(cipher.doFinal(segment, NONCE_BYTES, segment.size - NONCE_BYTES))
          if (last) break
          index++
        }
      }
    }
    output.delete()
    if (!part.renameTo(output)) {
      part.delete()
      throw IllegalStateException("Could not move the decrypted file into place")
    }
  }

  private fun cipher(
    mode: Int,
    key: ByteArray,
    nonce: ByteArray,
    aad: ByteArray,
  ): Cipher =
    Cipher.getInstance("AES/GCM/NoPadding").apply {
      init(mode, SecretKeySpec(key, "AES"), GCMParameterSpec(TAG_BITS, nonce))
      updateAAD(aad)
    }

  /**
   * Writes beside `output` and only gives the file its name once every byte is there: a kill, a
   * full disk or a failing segment leaves the previous `output` untouched (or nothing), never a
   * file that starts like a backup and stops. The byte count is checked against what the file
   * system holds, because the next thing to read it is a restore.
   *
   * Beside, in the same directory, so the rename never crosses a file system and replaces the old
   * file in one step. A `content://` target cannot be renamed at all: those are written by
   * copying a finished file into place (`BatiSaveModule.writeTo`, which checks the size and
   * deletes what it could not finish) or by expo-file-system's `copy`, which has no such check.
   */
  internal fun writeAtomically(
    output: File,
    write: (OutputStream) -> Unit,
  ) {
    val part = File("${output.path}.part")
    try {
      var written = 0L
      FileOutputStream(part).use { raw ->
        val counting =
          object : FilterOutputStream(raw) {
            override fun write(b: Int) {
              out.write(b)
              written += 1
            }

            override fun write(
              b: ByteArray,
              off: Int,
              len: Int,
            ) {
              out.write(b, off, len)
              written += len
            }
          }
        val buffered = BufferedOutputStream(counting)
        write(buffered)
        // Flushed and synced before the descriptor closes: a sync after `close()` always fails.
        buffered.flush()
        raw.fd.sync()
      }
      if (part.length() != written) throw IllegalStateException("Short write: ${part.length()} of $written bytes")
      if (!part.renameTo(output)) throw IllegalStateException("Could not move the sealed file into place")
    } catch (error: Throwable) {
      part.delete()
      throw error
    }
  }

  private fun writeOrDelete(
    target: File,
    write: (BufferedOutputStream) -> Unit,
  ) {
    try {
      BufferedOutputStream(FileOutputStream(target)).use(write)
    } catch (error: Throwable) {
      target.delete()
      throw error
    }
  }

  /** `header ‖ index (u32 BE) ‖ last (0 or 1)`: what binds a segment to its place in its file. */
  private fun segmentAad(
    header: ByteArray,
    index: Int,
    last: Boolean,
  ): ByteArray =
    ByteBuffer
      .allocate(header.size + 5)
      .put(header)
      .putInt(index)
      .put(if (last) 1 else 0)
      .array()

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

  companion object {
    const val NONCE_BYTES = 12
    const val TAG_BITS = 128
    const val TAG_BYTES = TAG_BITS / 8

    /** Plaintext per segment; the Node double in __tests__/helpers/nodeBatiCrypto.ts says the same. */
    const val SEGMENT_BYTES = 1024 * 1024
  }
}
