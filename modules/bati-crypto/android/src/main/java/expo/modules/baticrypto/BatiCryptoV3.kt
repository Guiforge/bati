package expo.modules.baticrypto

import org.bouncycastle.crypto.generators.Argon2BytesGenerator
import org.bouncycastle.crypto.params.Argon2Parameters
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.security.GeneralSecurityException
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * The install id crosses the bridge as 32 hex digits (everything else is base64). Hex digits are
 * valid base64, so decoding one as the other does not fail: 32 characters become 24 bytes, and the
 * seal then refuses an install id of the wrong size, on every device, for every format 3 file.
 */
internal fun hexBytes(value: String): ByteArray {
  require(value.length % 2 == 0 && value.all { it in '0'..'9' || it in 'a'..'f' }) { "hex" }
  return ByteArray(value.length / 2) { value.substring(it * 2, it * 2 + 2).toInt(16).toByte() }
}

/**
 * Format 3 of an encrypted backup: Argon2id for the password, a key per file, a nonce that is a
 * counter, and a header that is read here and nowhere else.
 *
 * Why a second format and not a better first one: files of format 2 are on phones, in folders and
 * on servers, and [BatiCryptoCore] opens them exactly as it always did. This class never touches
 * that path.
 *
 * ```
 * file   = "BATB" | 3 | install id 16 | counter u64 | sealed_at u64 ms | slot count u8
 *          | slot × n | file salt 32 | nonce prefix 7 | check 32 | segment × n
 * slot   = kind u8 | length u16 | gen u32 | body             (length counts gen and body)
 *   kind 3 (password, Argon2id): m_kib u32 | t u8 | p u8 | salt 16 | wrapped
 *   kind 4 (12 words):           salt 16 | wrapped
 *   wrapped = nonce 12 | master key 32 | tag 16
 * segment = ciphertext | tag 16          (at most 1 MiB of plaintext, the nonce is not written)
 *   nonce = prefix 7 | index u32 | last u8        aad = the whole header
 * body key = HKDF(master, file salt, "bati/v3/body")
 * check    = HMAC-SHA256(HKDF(master, file salt, "bati/v3/check"), header without the check)
 * key id   = HKDF(master, "", "bati/v3/key-id") first 16 bytes
 * ```
 *
 * Why a key per file: with the master key itself under every file, a random 96-bit nonce per
 * segment is a birthday problem that grows with every backup ever made. With a key per file the
 * nonces only have to be distinct within one file, and a counter guarantees that.
 *
 * Everything that reads a header from a file (hostile input, from a server or a stranger) is
 * bounded before it allocates or computes anything.
 */
class BatiCryptoV3(
  private val fill: (ByteArray) -> Unit = SecureRandom()::nextBytes,
  /** Free heap in bytes, asked before Argon2 allocates. Injectable so a test can say "none". */
  private val freeMemory: () -> Long = {
    val rt = Runtime.getRuntime()
    rt.maxMemory() - (rt.totalMemory() - rt.freeMemory())
  },
  private val now: () -> Long = System::currentTimeMillis,
) {
  private val core = BatiCryptoCore(fill)

  /** A key slot as read from a header, or about to be written into one. */
  class Slot(
    val kind: Int,
    val gen: Long,
    /** Argon2id memory in KiB, time and lanes; zero for a slot that has none. */
    val memoryKib: Long,
    val passes: Int,
    val lanes: Int,
    val salt: ByteArray,
    val wrapped: ByteArray,
  ) {
    /** The bytes that bind a wrapped key to its slot, so a slot cannot be moved or relabelled. */
    fun aad(): ByteArray {
      val out = ByteArrayOutputStream()
      out.write(MAGIC)
      out.write(VERSION)
      out.write(kind)
      out.write(u32(gen))
      if (kind == KIND_PASSWORD) {
        out.write(u32(memoryKib))
        out.write(passes)
        out.write(lanes)
      }
      out.write(salt)
      return out.toByteArray()
    }

    /** `kind | length | gen | body`, as it sits in a header. */
    fun encode(): ByteArray {
      val body = ByteArrayOutputStream()
      body.write(u32(gen))
      if (kind == KIND_PASSWORD) {
        body.write(u32(memoryKib))
        body.write(passes)
        body.write(lanes)
      }
      body.write(salt)
      body.write(wrapped)
      val bytes = body.toByteArray()
      return byteArrayOf(kind.toByte()) + u16(bytes.size) + bytes
    }
  }

  /** What a header says, once its shape has been checked. Nothing here has been authenticated yet. */
  class Header(
    val installId: ByteArray,
    /** Unsigned 64-bit, as a decimal string: JS numbers stop being exact at 2^53. */
    val counter: String,
    val sealedAt: Long,
    val slots: List<Slot>,
    val fileSalt: ByteArray,
    val noncePrefix: ByteArray,
    val check: ByteArray,
    val bytes: ByteArray,
  ) {
    val length: Int get() = bytes.size
  }

  sealed class Parsed {
    class Ok(
      val header: Header,
    ) : Parsed()

    /** A `BATB` file of a version this build does not know: the hero has to update, not retry. */
    object NewerVersion : Parsed()

    object NotThis : Parsed()
  }

  /** Reads and shape-checks a header from the first bytes of a file. Version 3 only. */
  fun parse(prefix: ByteArray): Parsed {
    if (prefix.size < 5 || !prefix.copyOfRange(0, 4).contentEquals(MAGIC)) return Parsed.NotThis
    val version = prefix[4].toInt() and 0xff
    if (version > VERSION) return Parsed.NewerVersion
    if (version != VERSION) return Parsed.NotThis

    return try {
      val buf = ByteBuffer.wrap(prefix)
      buf.position(5)
      val installId = buf.take(16)
      val counter = java.lang.Long.toUnsignedString(buf.long)
      val sealedAt = buf.long
      val count = buf.get().toInt() and 0xff
      if (count < 1 || count > MAX_SLOTS) return Parsed.NotThis
      val slots = ArrayList<Slot>()
      repeat(count) {
        val kind = buf.get().toInt() and 0xff
        val length = buf.short.toInt() and 0xffff
        if (length > MAX_SLOT_BYTES || length < 4 || length > buf.remaining()) throw IllegalArgumentException("slot")
        val body = buf.take(length)
        parseSlot(kind, body)?.let(slots::add)
      }
      val fileSalt = buf.take(FILE_SALT_BYTES)
      val noncePrefix = buf.take(PREFIX_BYTES)
      val check = buf.take(CHECK_BYTES)
      val length = buf.position()
      Parsed.Ok(Header(installId, counter, sealedAt, slots, fileSalt, noncePrefix, check, prefix.copyOf(length)))
    } catch (e: RuntimeException) {
      // Too short, a length that overruns, a slot with the wrong body size: not a file this
      // version wrote, and nothing about it has been computed.
      Parsed.NotThis
    }
  }

  private fun parseSlot(
    kind: Int,
    body: ByteArray,
  ): Slot? {
    val buf = ByteBuffer.wrap(body)
    val gen = buf.int.toLong() and 0xffffffffL
    return when (kind) {
      KIND_PASSWORD -> {
        if (body.size != 4 + 4 + 1 + 1 + SALT_BYTES + WRAPPED_BYTES) throw IllegalArgumentException("slot")
        val m = buf.int.toLong() and 0xffffffffL
        val t = buf.get().toInt() and 0xff
        val p = buf.get().toInt() and 0xff
        Slot(kind, gen, m, t, p, buf.take(SALT_BYTES), buf.take(WRAPPED_BYTES))
      }

      KIND_RECOVERY -> {
        if (body.size != 4 + SALT_BYTES + WRAPPED_BYTES) throw IllegalArgumentException("slot")
        Slot(kind, gen, 0, 0, 0, buf.take(SALT_BYTES), buf.take(WRAPPED_BYTES))
      }

      // A kind a later build may add. Skipped by its length, kept out of the list: this build can
      // neither open nor rewrite it, and says so by not offering it.
      else -> {
        null
      }
    }
  }

  /** A slot back from `Slot.encode()`: how JS hands one in, as bytes it never has to understand. */
  fun decodeSlot(raw: ByteArray): Slot {
    require(raw.size >= 3) { "slot" }
    val kind = raw[0].toInt() and 0xff
    val length = ByteBuffer.wrap(raw, 1, 2).short.toInt() and 0xffff
    require(length == raw.size - 3 && length <= MAX_SLOT_BYTES) { "slot" }
    return parseSlot(kind, raw.copyOfRange(3, raw.size)) ?: throw IllegalArgumentException("slot kind")
  }

  // --- the key schedule

  fun hkdf(
    ikm: ByteArray,
    salt: ByteArray,
    info: ByteArray,
    length: Int,
  ): ByteArray {
    val mac = Mac.getInstance("HmacSHA256")
    mac.init(SecretKeySpec(if (salt.isEmpty()) ByteArray(32) else salt, "HmacSHA256"))
    val prk = mac.doFinal(ikm)
    mac.init(SecretKeySpec(prk, "HmacSHA256"))
    val out = ByteArrayOutputStream()
    var block = ByteArray(0)
    var counter = 1
    while (out.size() < length) {
      mac.update(block)
      mac.update(info)
      mac.update(counter.toByte())
      block = mac.doFinal()
      out.write(block)
      counter++
    }
    return out.toByteArray().copyOf(length)
  }

  /** Argon2id, with the optional `secret` and `ad` only so the RFC 9106 vector can be run. */
  fun argon2id(
    password: ByteArray,
    salt: ByteArray,
    memoryKib: Int,
    passes: Int,
    lanes: Int,
    length: Int = 32,
    secret: ByteArray? = null,
    ad: ByteArray? = null,
  ): ByteArray {
    val params =
      Argon2Parameters
        .Builder(Argon2Parameters.ARGON2_id)
        .withVersion(Argon2Parameters.ARGON2_VERSION_13)
        .withIterations(passes)
        .withMemoryAsKB(memoryKib)
        .withParallelism(lanes)
        .withSalt(salt)
        .apply {
          if (secret != null) withSecret(secret)
          if (ad != null) withAdditional(ad)
        }.build()
    val out = ByteArray(length)
    Argon2BytesGenerator().apply { init(params) }.generateBytes(password, out)
    return out
  }

  /** The key a slot's wrapped master key is sealed under, from what the hero typed or was shown. */
  private fun wrappingKey(
    slot: Slot,
    secret: ByteArray,
  ): ByteArray =
    when (slot.kind) {
      KIND_PASSWORD -> {
        requireHeapFor(slot.memoryKib)
        argon2id(secret, slot.salt, slot.memoryKib.toInt(), slot.passes, slot.lanes)
      }

      else -> {
        hkdf(secret, slot.salt, RECOVERY_INFO, 32)
      }
    }

  /**
   * Refuses, before computing anything, what a header may not ask for. The file is untrusted input:
   * a slot asking for 2 GiB of memory is how a file from a server takes a phone down.
   */
  private fun checkBounds(slot: Slot) {
    if (slot.kind == KIND_PASSWORD) {
      require(slot.memoryKib in MIN_MEMORY_KIB..MAX_MEMORY_KIB) { "Argon2 memory out of bounds" }
      require(slot.passes in MIN_PASSES..MAX_PASSES) { "Argon2 passes out of bounds" }
      require(slot.lanes in MIN_LANES..MAX_LANES) { "Argon2 lanes out of bounds" }
    }
  }

  private fun requireHeapFor(memoryKib: Long) {
    // A tenth over: the blocks are not the only thing Argon2 holds.
    if (freeMemory() < memoryKib * 1024 * 11 / 10) throw LowMemoryException()
  }

  /** The master key a slot holds, or `null` if `secret` is not what it was made with. */
  fun unwrap(
    slot: Slot,
    secret: ByteArray,
  ): ByteArray? {
    checkBounds(slot)
    return try {
      core.open(wrappingKey(slot, secret), slot.wrapped, slot.aad())
    } catch (e: GeneralSecurityException) {
      null
    }
  }

  /** A slot holding `masterKey` under `secret`. The salt is drawn here, never by the caller. */
  fun wrap(
    masterKey: ByteArray,
    secret: ByteArray,
    kind: Int,
    gen: Long,
    memoryKib: Long = 0,
    passes: Int = 0,
    lanes: Int = 0,
  ): Slot {
    val bare = Slot(kind, gen, memoryKib, passes, lanes, core.randomBytes(SALT_BYTES), ByteArray(0))
    checkBounds(bare)
    val sealed = core.seal(wrappingKey(bare, secret), masterKey, bare.aad())
    return Slot(kind, gen, memoryKib, passes, lanes, bare.salt, sealed)
  }

  fun keyId(masterKey: ByteArray): ByteArray = hkdf(masterKey, ByteArray(0), KEY_ID_INFO, 16)

  // --- files

  private fun checkValue(
    masterKey: ByteArray,
    fileSalt: ByteArray,
    headerWithoutCheck: ByteArray,
  ): ByteArray {
    val mac = Mac.getInstance("HmacSHA256")
    mac.init(SecretKeySpec(hkdf(masterKey, fileSalt, CHECK_INFO, 32), "HmacSHA256"))
    return mac.doFinal(headerWithoutCheck)
  }

  /** True when `masterKey` is the key this header was made under. Constant time, no body read. */
  fun checkKey(
    masterKey: ByteArray,
    header: Header,
  ): Boolean {
    val body = header.bytes.copyOf(header.length - CHECK_BYTES)
    return MessageDigest.isEqual(checkValue(masterKey, header.fileSalt, body), header.check)
  }

  private fun nonce(
    prefix: ByteArray,
    index: Int,
    last: Boolean,
  ): ByteArray =
    ByteBuffer
      .allocate(BatiCryptoCore.NONCE_BYTES)
      .put(prefix)
      .putInt(index)
      .put(if (last) 1 else 0)
      .array()

  private fun segmentCipher(
    mode: Int,
    bodyKey: ByteArray,
    header: Header,
    index: Int,
    last: Boolean,
  ): Cipher =
    Cipher.getInstance("AES/GCM/NoPadding").apply {
      init(
        mode,
        SecretKeySpec(bodyKey, "AES"),
        GCMParameterSpec(BatiCryptoCore.TAG_BITS, nonce(header.noncePrefix, index, last)),
      )
      updateAAD(header.bytes)
    }

  /** The header every sealing builds fresh: a new salt and a new nonce prefix, so nothing repeats. */
  fun buildHeader(
    masterKey: ByteArray,
    slots: List<Slot>,
    installId: ByteArray,
    counter: Long,
  ): Header {
    require(installId.size == 16) { "install id" }
    require(slots.size in 1..MAX_SLOTS) { "slot count" }
    require(counter >= 0) { "counter" }
    val fileSalt = core.randomBytes(FILE_SALT_BYTES)
    val prefix = core.randomBytes(PREFIX_BYTES)
    val out = ByteArrayOutputStream()
    out.write(MAGIC)
    out.write(VERSION)
    out.write(installId)
    out.write(ByteBuffer.allocate(8).putLong(counter).array())
    out.write(ByteBuffer.allocate(8).putLong(now()).array())
    out.write(slots.size)
    slots.forEach { out.write(it.encode()) }
    out.write(fileSalt)
    out.write(prefix)
    val withoutCheck = out.toByteArray()
    val check = checkValue(masterKey, fileSalt, withoutCheck)
    return when (val parsed = parse(withoutCheck + check)) {
      is Parsed.Ok -> parsed.header
      else -> throw IllegalStateException("built a header this version cannot read")
    }
  }

  /** Seals a file under `masterKey`, with a header that is new every time. Returns it. */
  fun sealFile(
    masterKey: ByteArray,
    input: File,
    output: File,
    slots: List<Slot>,
    installId: ByteArray,
    counter: Long,
  ): Header {
    val header = buildHeader(masterKey, slots, installId, counter)
    val bodyKey = hkdf(masterKey, header.fileSalt, BODY_INFO, 32)
    core.writeAtomically(output) { out ->
      out.write(header.bytes)
      BufferedInputStream(FileInputStream(input)).use { source ->
        var current = source.readUpTo(BatiCryptoCore.SEGMENT_BYTES)
        var index = 0
        while (true) {
          val next = source.readUpTo(BatiCryptoCore.SEGMENT_BYTES)
          val last = next.isEmpty()
          out.write(segmentCipher(Cipher.ENCRYPT_MODE, bodyKey, header, index, last).doFinal(current))
          if (last) break
          current = next
          index++
        }
      }
    }
    return header
  }

  /**
   * Opens a format 3 file. The check value is verified first, in constant time, so a wrong key
   * costs one HMAC and not a pass over a database; the plaintext lands beside the target and only
   * takes its name once every tag verified.
   */
  fun openFile(
    masterKey: ByteArray,
    input: File,
    output: File,
  ) {
    val header =
      when (val parsed = parse(core.readPrefix(input, MAX_HEADER_BYTES))) {
        is Parsed.Ok -> parsed.header
        is Parsed.NewerVersion -> throw UnsupportedOperationException("newer version")
        else -> throw IllegalArgumentException("Not a format 3 file")
      }
    if (!checkKey(masterKey, header)) throw GeneralSecurityException("Wrong key")

    val bodyKey = hkdf(masterKey, header.fileSalt, BODY_INFO, 32)
    val part = File("${output.path}.part")
    try {
      BufferedInputStream(FileInputStream(input)).use { source ->
        source.readUpTo(header.length)
        BufferedOutputStream(FileOutputStream(part)).use { out ->
          var index = 0
          while (true) {
            val segment = source.readUpTo(BatiCryptoCore.SEGMENT_BYTES + BatiCryptoCore.TAG_BYTES)
            if (segment.size < BatiCryptoCore.TAG_BYTES) throw IllegalArgumentException("Truncated encrypted file")
            source.mark(1)
            val last = source.read() < 0
            source.reset()
            out.write(segmentCipher(Cipher.DECRYPT_MODE, bodyKey, header, index, last).doFinal(segment))
            if (last) break
            index++
          }
        }
      }
    } catch (error: Throwable) {
      part.delete()
      throw error
    }
    output.delete()
    if (!part.renameTo(output)) {
      part.delete()
      throw IllegalStateException("Could not move the decrypted file into place")
    }
  }

  /** Not enough memory for the Argon2 pass a slot asks for: the hero is told to close other apps. */
  class LowMemoryException : RuntimeException("LOW_MEMORY")

  private fun ByteBuffer.take(length: Int): ByteArray = ByteArray(length).also { get(it) }

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

  companion object {
    val MAGIC = "BATB".toByteArray()
    const val VERSION = 3
    const val KIND_PASSWORD = 3
    const val KIND_RECOVERY = 4
    const val SALT_BYTES = 16
    const val WRAPPED_BYTES = BatiCryptoCore.NONCE_BYTES + 32 + BatiCryptoCore.TAG_BYTES
    const val FILE_SALT_BYTES = 32
    const val PREFIX_BYTES = 7
    const val CHECK_BYTES = 32
    const val MAX_SLOTS = 4
    const val MAX_SLOT_BYTES = 128

    /** The most a v3 header can occupy, so a reader never takes more of a hostile file than this. */
    const val MAX_HEADER_BYTES =
      5 + 16 + 8 + 8 + 1 + MAX_SLOTS * (1 + 2 + MAX_SLOT_BYTES) + FILE_SALT_BYTES + PREFIX_BYTES + CHECK_BYTES

    // What a header may ask of Argon2 when it is read, and so the room a new write has to stay in.
    const val MIN_MEMORY_KIB = 19L * 1024
    const val MAX_MEMORY_KIB = 128L * 1024
    const val MIN_PASSES = 2
    const val MAX_PASSES = 4
    const val MIN_LANES = 1
    const val MAX_LANES = 4

    private val RECOVERY_INFO = "bati/v3/recovery".toByteArray()
    private val BODY_INFO = "bati/v3/body".toByteArray()
    private val CHECK_INFO = "bati/v3/check".toByteArray()
    private val KEY_ID_INFO = "bati/v3/key-id".toByteArray()

    private fun u32(value: Long) = ByteBuffer.allocate(4).putInt(value.toInt()).array()

    private fun u16(value: Int) = ByteBuffer.allocate(2).putShort(value.toShort()).array()
  }
}
