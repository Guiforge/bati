package expo.modules.baticrypto

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.nio.ByteBuffer
import java.security.GeneralSecurityException
import java.security.MessageDigest

/**
 * The format, held in place. What a backup is must not change by accident, and the code that writes
 * one cannot be run by the TypeScript tests (they use a Node double of it), so the real thing is
 * driven here, on the JVM, against vectors that exist outside this repo.
 */
class BatiCryptoCoreTest {
  @get:Rule val tmp = TemporaryFolder()

  private val core = BatiCryptoCore()
  private val key = ByteArray(32) { (it * 7 + 1).toByte() }
  private val header = "BATB-test-header".toByteArray()
  private val segment = BatiCryptoCore.SEGMENT_BYTES
  private val nonce = BatiCryptoCore.NONCE_BYTES
  private val tag = BatiCryptoCore.TAG_BYTES

  private fun hex(bytes: ByteArray) = bytes.joinToString("") { "%02x".format(it) }

  private fun plain(size: Int) = ByteArray(size) { (it * 31 + it / 251).toByte() }

  private fun roundTrip(
    size: Int,
    header: ByteArray = this.header,
  ): Pair<File, ByteArray> {
    val data = plain(size)
    val input = tmp.newFile().apply { writeBytes(data) }
    val sealed = tmp.newFile()
    core.sealFile(key, input, sealed, header)
    return sealed to data
  }

  private fun open(
    sealed: File,
    header: ByteArray = this.header,
    withKey: ByteArray = key,
  ): File {
    val out = File(tmp.root, "out-${System.nanoTime()}")
    core.openFile(withKey, sealed, out, header.size)
    return out
  }

  /** `header ‖ index u32 BE ‖ last`, written out here on purpose: the AAD is part of the format. */
  private fun aad(
    header: ByteArray,
    index: Int,
    last: Boolean,
  ) = ByteBuffer
    .allocate(header.size + 5)
    .put(header)
    .putInt(index)
    .put(if (last) 1 else 0)
    .array()

  // --- PBKDF2: RFC 7914 section 11, the first 32 bytes (one output block)

  @Test
  fun pbkdf2MatchesRfc7914OneIteration() {
    val out = core.pbkdf2("passwd".toByteArray(), "salt".toByteArray(), 1)
    assertEquals("55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc", hex(out))
  }

  @Test
  fun pbkdf2MatchesRfc7914EightyThousandIterations() {
    val out = core.pbkdf2("Password".toByteArray(), "NaCl".toByteArray(), 80000)
    assertEquals("4ddcd8f60b98be21830cee5ef22701f9641a4418d04c0414aeff08876b34ab56", hex(out))
  }

  @Test
  fun pbkdf2StretchesTheBytesItIsGivenNotTheCharacters() {
    // An accented password: JS hands over the UTF-8 of its NFC form and the key must be exactly this.
    val out = core.pbkdf2("é".toByteArray(Charsets.UTF_8), "salt".toByteArray(), 2)
    assertEquals("dd194c8a1c9f6e71cd091adfd60427877fe1ff78845b2bf3e0b2f7b8c44599e8", hex(out))
  }

  // --- the small seal, for wrapped keys

  @Test
  fun sealOpensWithItsKeyAndItsAad() {
    val sealed = core.seal(key, "wrapped key".toByteArray(), "aad".toByteArray())
    assertEquals(nonce + "wrapped key".length + tag, sealed.size)
    assertArrayEquals("wrapped key".toByteArray(), core.open(key, sealed, "aad".toByteArray()))
  }

  @Test
  fun sealRefusesAWrongKeyAWrongAadAndAnyChangedByte() {
    val sealed = core.seal(key, "wrapped key".toByteArray(), "aad".toByteArray())
    assertThrows(GeneralSecurityException::class.java) {
      core.open(ByteArray(32), sealed, "aad".toByteArray())
    }
    assertThrows(GeneralSecurityException::class.java) { core.open(key, sealed, "other".toByteArray()) }
    for (i in sealed.indices) {
      val changed = sealed.copyOf().also { it[i] = (it[i].toInt() xor 1).toByte() }
      assertThrows("byte $i", GeneralSecurityException::class.java) {
        core.open(key, changed, "aad".toByteArray())
      }
    }
  }

  @Test
  fun twoSealsOfTheSameThingNeverShareANonce() {
    val a = core.seal(key, ByteArray(8), ByteArray(0))
    val b = core.seal(key, ByteArray(8), ByteArray(0))
    assertFalse(a.copyOfRange(0, nonce).contentEquals(b.copyOfRange(0, nonce)))
  }

  // --- files, in segments

  @Test
  fun filesOfEverySizeAroundASegmentBoundaryComeBackWhole() {
    for (size in listOf(0, 1, 100, segment - 1, segment, segment + 1, 2 * segment, 2 * segment + 5)) {
      val (sealed, data) = roundTrip(size)
      assertArrayEquals("size $size", data, open(sealed).readBytes())
    }
  }

  @Test
  fun aFileOfWholeSegmentsHasNoEmptySegmentAfterIt() {
    val (sealed, _) = roundTrip(2 * segment)
    // header + two full segments, nothing else: the second one is the last.
    assertEquals(header.size + 2 * (nonce + segment + tag).toLong(), sealed.length())
  }

  @Test
  fun anEmptyFileIsOneEmptySegment() {
    val (sealed, _) = roundTrip(0)
    assertEquals(header.size + (nonce + tag).toLong(), sealed.length())
  }

  @Test
  fun anythingShortOfAWholeSegmentIsOneSegment() {
    val (sealed, _) = roundTrip(segment + 1)
    assertEquals(header.size + (nonce + segment + tag) + (nonce + 1 + tag).toLong(), sealed.length())
  }

  @Test
  fun everyChangedByteOfAFileIsRefusedAndLeavesNothingBehind() {
    val (sealed, _) = roundTrip(100)
    val bytes = sealed.readBytes()
    for (i in bytes.indices) {
      val changed = tmp.newFile().apply { writeBytes(bytes.copyOf().also { it[i] = (it[i].toInt() xor 1).toByte() }) }
      val out = File(tmp.root, "refused-$i")
      assertThrows("byte $i", Exception::class.java) { core.openFile(key, changed, out, header.size) }
      assertFalse("byte $i left a file", out.exists() || File("${out.path}.part").exists())
    }
  }

  @Test
  fun aWrongKeyLeavesNothingAtTheTarget() {
    val (sealed, _) = roundTrip(segment + 10)
    val out = File(tmp.root, "target")
    assertThrows(GeneralSecurityException::class.java) { core.openFile(ByteArray(32), sealed, out, header.size) }
    assertFalse(out.exists())
    assertFalse(File("${out.path}.part").exists())
  }

  @Test
  fun aFileCutAtASegmentBoundaryIsRefused() {
    val (sealed, _) = roundTrip(2 * segment + 5)
    val cut =
      tmp.newFile().apply {
        writeBytes(sealed.readBytes().copyOf(header.size + 2 * (nonce + segment + tag)))
      }
    assertThrows(Exception::class.java) { open(cut) }
  }

  @Test
  fun aFileCutShortOfTheHeaderOrAnEmptyOneIsRefused() {
    val (sealed, _) = roundTrip(50)
    val short = tmp.newFile().apply { writeBytes(sealed.readBytes().copyOf(header.size - 1)) }
    assertThrows(IllegalArgumentException::class.java) { open(short) }
    val headerOnly = tmp.newFile().apply { writeBytes(sealed.readBytes().copyOf(header.size)) }
    assertThrows(IllegalArgumentException::class.java) { open(headerOnly) }
  }

  @Test
  fun swappingTwoSegmentsIsRefused() {
    val (sealed, _) = roundTrip(2 * segment + 5)
    val bytes = sealed.readBytes()
    val size = nonce + segment + tag
    val a = bytes.copyOfRange(header.size, header.size + size)
    val b = bytes.copyOfRange(header.size + size, header.size + 2 * size)
    val swapped = bytes.copyOf()
    b.copyInto(swapped, header.size)
    a.copyInto(swapped, header.size + size)
    val file = tmp.newFile().apply { writeBytes(swapped) }
    assertThrows(GeneralSecurityException::class.java) { open(file) }
  }

  @Test
  fun aDifferentHeaderIsRefusedBecauseEverySegmentBindsIt() {
    val (sealed, _) = roundTrip(100)
    val bytes = sealed.readBytes().also { it[0] = (it[0].toInt() xor 1).toByte() }
    val file = tmp.newFile().apply { writeBytes(bytes) }
    assertThrows(GeneralSecurityException::class.java) { open(file) }
  }

  /**
   * Files written by the Node double before it was aligned with this code carry one empty segment
   * after a body of whole segments. Real exports from that era exist, so they must open.
   */
  @Test
  fun opensAFileWithAnEmptyLastSegmentAfterWholeOnes() {
    val data = plain(segment)
    val first = core.seal(key, data, aad(header, 0, false))
    val last = core.seal(key, ByteArray(0), aad(header, 1, true))
    val file = tmp.newFile().apply { writeBytes(header + first + last) }
    assertArrayEquals(data, open(file).readBytes())
  }

  // --- golden files, so a change to what is written shows up as a diff

  /** A counter for a nonce: the same bytes on every run, and nothing a real seal ever uses. */
  private fun fixedRandomness(): BatiCryptoCore {
    var counter = 0
    return BatiCryptoCore { bytes -> for (i in bytes.indices) bytes[i] = (counter++ and 0xff).toByte() }
  }

  private fun sealWithFixedRandomness(size: Int): ByteArray {
    val input = tmp.newFile().apply { writeBytes(plain(size)) }
    val sealed = tmp.newFile()
    fixedRandomness().sealFile(key, input, sealed, header)
    return sealed.readBytes()
  }

  /** Regenerate with `BATI_UPDATE_GOLDEN=1`; otherwise a missing or different file fails. */
  private fun frozen(
    name: String,
    actual: ByteArray,
  ) {
    val golden = File(GOLDEN_DIR, name)
    if (System.getenv("BATI_UPDATE_GOLDEN") == "1") {
      golden.parentFile?.mkdirs()
      golden.writeBytes(actual)
    }
    assertTrue("missing $golden: run once with BATI_UPDATE_GOLDEN=1", golden.exists())
    assertArrayEquals(name, golden.readBytes(), actual)
  }

  @Test
  fun aSmallSealWithFixedRandomnessMatchesTheFileFrozenInTheRepo() {
    // The Jest suite opens this very file with its Node double: the two implementations agree on it.
    frozen("kotlin-golden-v2.bin", sealWithFixedRandomness(100))
  }

  @Test
  fun aMultiSegmentSealWithFixedRandomnessMatchesItsFrozenDigest() {
    // Too big to keep in the repo (it crosses a 1 MiB boundary), so its SHA-256 is what is frozen.
    val digest = MessageDigest.getInstance("SHA-256").digest(sealWithFixedRandomness(segment + 123))
    frozen("kotlin-golden-v2-multi.sha256", digest)
  }

  @Test
  fun `format 2 seal that fails keeps the previous file and leaves no part file`() {
    val (sealed, _) = roundTrip(1000)
    val before = sealed.readBytes()

    assertThrows(java.io.IOException::class.java) {
      core.sealFile(key, File(tmp.root, "no-such-input"), sealed, header)
    }

    assertArrayEquals(before, sealed.readBytes())
    assertFalse(File("${sealed.path}.part").exists())
  }

  @Test
  fun `format 2 seal removes its part file on success`() {
    val (sealed, _) = roundTrip(5000)

    assertFalse(File("${sealed.path}.part").exists())
    assertTrue(sealed.length() > 5000)
  }

  private companion object {
    /** modules/bati-crypto/android → the repository root, and `__tests__/fixtures/backup` under it. */
    val GOLDEN_DIR = File("../../../__tests__/fixtures/backup")
  }
}
