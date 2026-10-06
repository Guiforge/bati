package expo.modules.baticrypto

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.nio.ByteBuffer
import java.security.GeneralSecurityException
import java.util.Base64

/**
 * Format 3, held in place by vectors that exist outside this repository (RFC 9106 for Argon2id,
 * RFC 5869 for HKDF) and by every way a hostile or damaged file can be wrong.
 *
 * The cheap Argon2 parameters here (19 MiB, 2 passes) are the floor a reader accepts; what a build
 * writes (64 MiB, 3 passes) is chosen in TypeScript and measured on a phone, not on a laptop.
 */
class BatiCryptoV3Test {
  @get:Rule val tmp = TemporaryFolder()

  private val v3 = BatiCryptoV3()
  private val master = ByteArray(32) { (it * 5 + 3).toByte() }
  private val installId = ByteArray(16) { (it + 1).toByte() }
  private val password = "correct horse battery staple".toByteArray()
  private val words = ByteArray(16) { (it * 11 + 2).toByte() }
  private val segment = BatiCryptoCore.SEGMENT_BYTES

  private fun hex(bytes: ByteArray) = bytes.joinToString("") { "%02x".format(it) }

  private fun seq(
    from: Int,
    count: Int,
  ) = ByteArray(count) { (from + it).toByte() }

  private fun plain(size: Int) = ByteArray(size) { (it * 17 + it / 199).toByte() }

  private fun passwordSlot(gen: Long = 1) = v3.wrap(master, password, BatiCryptoV3.KIND_PASSWORD, gen, 19 * 1024, 2, 1)

  private fun recoverySlot(gen: Long = 1) = v3.wrap(master, words, BatiCryptoV3.KIND_RECOVERY, gen)

  private fun seal(
    size: Int,
    counter: Long = 7,
  ): Pair<File, ByteArray> {
    val data = plain(size)
    val input = tmp.newFile().apply { writeBytes(data) }
    val sealed = tmp.newFile()
    v3.sealFile(master, input, sealed, listOf(passwordSlot(), recoverySlot()), installId, counter)
    return sealed to data
  }

  private fun header(file: File): BatiCryptoV3.Header =
    (
      v3.parse(
        file.readBytes().copyOf(BatiCryptoV3.MAX_HEADER_BYTES.coerceAtMost(file.length().toInt())),
      ) as BatiCryptoV3.Parsed.Ok
    ).header

  private fun open(
    sealed: File,
    key: ByteArray = master,
  ): ByteArray {
    val out = File(tmp.root, "out-${System.nanoTime()}")
    v3.openFile(key, sealed, out)
    return out.readBytes()
  }

  // --- vectors

  @Test
  fun argon2idMatchesRfc9106Section5_3() {
    val out =
      v3.argon2id(
        password = ByteArray(32) { 1 },
        salt = ByteArray(16) { 2 },
        memoryKib = 32,
        passes = 3,
        lanes = 4,
        secret = ByteArray(8) { 3 },
        ad = ByteArray(12) { 4 },
      )
    assertEquals("0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659", hex(out))
  }

  @Test
  fun argon2idAtTheFloorMatchesNodesImplementation() {
    // Computed by Node's own crypto.argon2Sync, which is not this code and not Bouncy Castle.
    val out = v3.argon2id("correct horse battery staple".toByteArray(), ByteArray(16) { 7 }, 19456, 2, 1)
    assertEquals("799f12b9e17710824482d829835acb69f5a9355bf774c4f07342823b11b90928", hex(out))
  }

  @Test
  fun hkdfMatchesRfc5869() {
    assertEquals(
      "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865",
      hex(v3.hkdf(ByteArray(22) { 0x0b }, seq(0, 13), seq(0xf0, 10), 42)),
    )
    assertEquals(
      "b11e398dc80327a1c8e7f78c596a49344f012eda2d4efad8a050cc4c19afa97c59045a99cac7827271cb41c65e590e09" +
        "da3275600c2f09b8367793a9aca3db71cc30c58179ec3e87c14c01d5c1f3434f1d87",
      hex(v3.hkdf(seq(0, 80), seq(0x60, 80), seq(0xb0, 80), 82)),
    )
    assertEquals(
      "8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d9d201395faa4b61a96c8",
      hex(v3.hkdf(ByteArray(22) { 0x0b }, ByteArray(0), ByteArray(0), 42)),
    )
  }

  // --- slots

  @Test
  fun aPasswordSlotOpensWithItsPasswordAndNoOther() {
    val slot = passwordSlot()
    assertArrayEquals(master, v3.unwrap(slot, password))
    assertNull(v3.unwrap(slot, "not the one".toByteArray()))
  }

  @Test
  fun aRecoverySlotOpensWithItsWordsAndNoOther() {
    val slot = recoverySlot()
    assertArrayEquals(master, v3.unwrap(slot, words))
    assertNull(v3.unwrap(slot, ByteArray(16)))
  }

  @Test
  fun twoSlotsOfTheSameKeyAndSecretNeverShareASaltOrAWrap() {
    val a = passwordSlot()
    val b = passwordSlot()
    assertFalse(a.salt.contentEquals(b.salt))
    assertFalse(a.wrapped.contentEquals(b.wrapped))
  }

  @Test
  fun aSlotCannotBeRelabelledBecauseItsAadBindsKindGenAndParameters() {
    val slot = passwordSlot(gen = 1)
    val regen = BatiCryptoV3.Slot(slot.kind, 2, slot.memoryKib, slot.passes, slot.lanes, slot.salt, slot.wrapped)
    assertNull(v3.unwrap(regen, password))
    val heavier =
      BatiCryptoV3.Slot(
        slot.kind,
        1,
        slot.memoryKib + 1024,
        slot.passes,
        slot.lanes,
        slot.salt,
        slot.wrapped,
      )
    assertNull(v3.unwrap(heavier, password))
    val moved = BatiCryptoV3.Slot(BatiCryptoV3.KIND_RECOVERY, 1, 0, 0, 0, slot.salt, slot.wrapped)
    assertNull(v3.unwrap(moved, words))
  }

  @Test
  fun argonParametersOutsideWhatAReaderAcceptsAreRefusedWithoutRunningArgon() {
    val ok = passwordSlot()

    fun with(
      m: Long = ok.memoryKib,
      t: Int = ok.passes,
      p: Int = ok.lanes,
    ) = BatiCryptoV3.Slot(ok.kind, ok.gen, m, t, p, ok.salt, ok.wrapped)

    // 2 GiB would be the file a stranger sends to take a phone down: refused on the number alone.
    for (bad in listOf(
      with(m = 2L * 1024 * 1024),
      with(m = 1024),
      with(t = 1),
      with(t = 9),
      with(p = 0),
      with(p = 9),
    )) {
      assertThrows(IllegalArgumentException::class.java) { v3.unwrap(bad, password) }
    }
  }

  @Test
  fun notEnoughFreeMemoryIsSaidBeforeArgonAllocatesAnything() {
    val starved = BatiCryptoV3(freeMemory = { 1024L })
    assertEquals(
      "LOW_MEMORY",
      assertThrows(BatiCryptoV3.LowMemoryException::class.java) { starved.unwrap(passwordSlot(), password) }.message,
    )
    assertThrows(BatiCryptoV3.LowMemoryException::class.java) {
      starved.wrap(master, password, BatiCryptoV3.KIND_PASSWORD, 1, 19 * 1024, 2, 1)
    }
  }

  @Test
  fun aWriteOutsideTheReadBoundsIsRefusedToo() {
    // What a build may write must stay inside what every build will read.
    assertThrows(IllegalArgumentException::class.java) {
      v3.wrap(master, password, BatiCryptoV3.KIND_PASSWORD, 1, 1024, 3, 1)
    }
  }

  // --- the header

  @Test
  fun aSealedFileHasAHeaderThatReadsBackWhatWasPutInIt() {
    val (sealed, _) = seal(100, counter = 41)
    val h = header(sealed)

    assertArrayEquals(installId, h.installId)
    assertEquals("41", h.counter)
    assertEquals(2, h.slots.size)
    assertEquals(listOf(BatiCryptoV3.KIND_PASSWORD, BatiCryptoV3.KIND_RECOVERY), h.slots.map { it.kind })
    assertEquals(BatiCryptoV3.FILE_SALT_BYTES, h.fileSalt.size)
    assertEquals(BatiCryptoV3.PREFIX_BYTES, h.noncePrefix.size)
    assertTrue(h.sealedAt > 1_600_000_000_000L)
  }

  @Test
  fun theMasterKeyOpensTheSlotsOfAFileItSealed() {
    val h = header(seal(100).first)
    assertArrayEquals(master, v3.unwrap(h.slots[0], password))
    assertArrayEquals(master, v3.unwrap(h.slots[1], words))
  }

  @Test
  fun aCounterAboveTwoToTheFiftyThirdSurvivesAsText() {
    val (sealed, _) = seal(10, counter = Long.MAX_VALUE)
    // JS reads it as a BigInt and refuses it past 2^53; here it must not be rounded on the way.
    assertEquals(Long.MAX_VALUE.toString(), header(sealed).counter)
  }

  @Test
  fun aFileOfAnOlderOrAnotherKindIsNotThis() {
    assertTrue(v3.parse(ByteArray(0)) is BatiCryptoV3.Parsed.NotThis)
    assertTrue(v3.parse("SQLite format 3\u0000".toByteArray()) is BatiCryptoV3.Parsed.NotThis)
    assertTrue(
      v3.parse(
        byteArrayOf('B'.code.toByte(), 'A'.code.toByte(), 'T'.code.toByte(), 'B'.code.toByte(), 2, 0, 0),
      ) is BatiCryptoV3.Parsed.NotThis,
    )
  }

  @Test
  fun aNewerVersionIsNamedSoTheHeroUpdatesInsteadOfRetrying() {
    val newer = seal(10).first.readBytes().also { it[4] = 4 }
    assertTrue(v3.parse(newer.copyOf(BatiCryptoV3.MAX_HEADER_BYTES)) is BatiCryptoV3.Parsed.NewerVersion)
    // Even with nothing after the version byte: the version is what the hero has to act on.
    assertTrue(
      v3.parse(
        byteArrayOf('B'.code.toByte(), 'A'.code.toByte(), 'T'.code.toByte(), 'B'.code.toByte(), 9),
      ) is BatiCryptoV3.Parsed.NewerVersion,
    )
  }

  @Test
  fun everyTruncationOfTheHeaderIsNotThisAndNeverACrash() {
    val prefix = seal(10).first.readBytes().copyOf(header(seal(10).first).length)
    for (cut in 0 until prefix.size) {
      val parsed = v3.parse(prefix.copyOf(cut))
      assertFalse("cut at $cut", parsed is BatiCryptoV3.Parsed.Ok)
    }
  }

  @Test
  fun aSlotLengthThatOverrunsOrExceedsTheLimitIsNotThis() {
    val bytes = seal(10).first.readBytes()
    val slotLengthAt = 5 + 16 + 8 + 8 + 1 + 1 // after the first slot's kind byte
    for (bad in listOf(0xffff, BatiCryptoV3.MAX_SLOT_BYTES + 1, 3, 0)) {
      val broken = bytes.copyOf()
      ByteBuffer.wrap(broken).putShort(slotLengthAt, bad.toShort())
      assertFalse("length $bad", v3.parse(broken.copyOf(BatiCryptoV3.MAX_HEADER_BYTES)) is BatiCryptoV3.Parsed.Ok)
    }
  }

  @Test
  fun zeroOrTooManySlotsIsNotThis() {
    val bytes = seal(10).first.readBytes()
    val countAt = 5 + 16 + 8 + 8
    for (bad in listOf(0, BatiCryptoV3.MAX_SLOTS + 1, 255)) {
      val broken = bytes.copyOf().also { it[countAt] = bad.toByte() }
      assertFalse("count $bad", v3.parse(broken.copyOf(BatiCryptoV3.MAX_HEADER_BYTES)) is BatiCryptoV3.Parsed.Ok)
    }
  }

  @Test
  fun aSlotKindThisBuildDoesNotKnowIsSkippedByItsLengthAndTheRestStillReads() {
    val (sealed, _) = seal(10)
    val h = header(sealed)
    // Rebuild a header with an extra slot of kind 9 in the middle, the way a later build might.
    val unknown = byteArrayOf(9) + ByteBuffer.allocate(2).putShort(8).array() + ByteArray(8) { 5 }
    val first = h.slots[0].encode()
    val second = h.slots[1].encode()
    val start = 5 + 16 + 8 + 8
    val body = h.bytes.copyOfRange(start + 1 + first.size + second.size, h.bytes.size)
    val rebuilt = h.bytes.copyOfRange(0, start) + byteArrayOf(3) + first + unknown + second + body
    val parsed = v3.parse(rebuilt) as BatiCryptoV3.Parsed.Ok
    assertEquals(2, parsed.header.slots.size)
    assertEquals(h.fileSalt.toList(), parsed.header.fileSalt.toList())
  }

  // --- the body

  @Test
  fun filesOfEverySizeAroundASegmentBoundaryComeBackWhole() {
    for (size in listOf(0, 1, 100, segment - 1, segment, segment + 1, 2 * segment, 2 * segment + 5)) {
      val (sealed, data) = seal(size)
      assertArrayEquals("size $size", data, open(sealed))
    }
  }

  @Test
  fun aFileOfWholeSegmentsHasNoEmptySegmentAfterItAndAnEmptyFileHasOne() {
    val h = header(seal(10).first)
    val whole = seal(2 * segment).first
    assertEquals(h.length + 2L * (segment + BatiCryptoCore.TAG_BYTES), whole.length())
    assertEquals(h.length + BatiCryptoCore.TAG_BYTES.toLong(), seal(0).first.length())
  }

  @Test
  fun everyChangedByteOfASmallFileIsRefusedAndLeavesNothingBehind() {
    val bytes = seal(40).first.readBytes()
    for (i in bytes.indices) {
      val changed = tmp.newFile().apply { writeBytes(bytes.copyOf().also { it[i] = (it[i].toInt() xor 1).toByte() }) }
      val out = File(tmp.root, "refused-$i")
      assertThrows("byte $i", Exception::class.java) { v3.openFile(master, changed, out) }
      assertFalse("byte $i left a file", out.exists() || File("${out.path}.part").exists())
    }
  }

  @Test
  fun aWrongKeyIsRefusedByTheCheckBeforeTheBodyIsRead() {
    val (sealed, _) = seal(segment + 10)
    val out = File(tmp.root, "target")
    // A file whose body is garbage after the header: only the check can say "wrong key" first.
    val headerOnly = tmp.newFile().apply { writeBytes(sealed.readBytes().copyOf(header(sealed).length)) }
    assertThrows(GeneralSecurityException::class.java) { v3.openFile(ByteArray(32), headerOnly, out) }
    assertFalse(out.exists())
    assertFalse(File("${out.path}.part").exists())
  }

  @Test
  fun checkKeyAcceptsTheMasterKeyAndNothingElse() {
    val h = header(seal(10).first)
    assertTrue(v3.checkKey(master, h))
    assertFalse(v3.checkKey(ByteArray(32), h))
    assertFalse(v3.checkKey(master.copyOf().also { it[0] = (it[0].toInt() xor 1).toByte() }, h))
  }

  @Test
  fun aFileCutAtASegmentBoundaryIsRefused() {
    val (sealed, _) = seal(2 * segment + 5)
    val h = header(sealed)
    val cut =
      tmp.newFile().apply {
        writeBytes(
          sealed.readBytes().copyOf(h.length + 2 * (segment + BatiCryptoCore.TAG_BYTES)),
        )
      }
    assertThrows(Exception::class.java) { open(cut) }
  }

  @Test
  fun swappingTwoSegmentsIsRefused() {
    val (sealed, _) = seal(2 * segment + 5)
    val h = header(sealed)
    val bytes = sealed.readBytes()
    val size = segment + BatiCryptoCore.TAG_BYTES
    val swapped = bytes.copyOf()
    bytes.copyOfRange(h.length + size, h.length + 2 * size).copyInto(swapped, h.length)
    bytes.copyOfRange(h.length, h.length + size).copyInto(swapped, h.length + size)
    assertThrows(GeneralSecurityException::class.java) { open(tmp.newFile().apply { writeBytes(swapped) }) }
  }

  // --- nothing repeats

  @Test
  fun twoSealingsOfTheSameFileShareNeitherSaltNorNoncePrefix() {
    val a = header(seal(100).first)
    val b = header(seal(100).first)
    assertFalse(a.fileSalt.contentEquals(b.fileSalt))
    assertFalse(a.noncePrefix.contentEquals(b.noncePrefix))
    // So the body key and the nonces differ: the same plaintext seals to different bytes.
    assertFalse(a.check.contentEquals(b.check))
  }

  @Test
  fun theNonceOfEverySegmentIsDistinctWithinAFile() {
    // The nonce is prefix | index | last, so two segments can only collide if they share an index.
    val (sealed, _) = seal(3 * segment)
    val h = header(sealed)
    val tags =
      (0 until 3).map { i ->
        val at = h.length + i * (segment + BatiCryptoCore.TAG_BYTES) + segment
        sealed.readBytes().copyOfRange(at, at + BatiCryptoCore.TAG_BYTES).toList()
      }
    assertEquals(3, tags.toSet().size)
  }

  @Test
  fun theKeyIdIsStableForAKeyAndDifferentForAnother() {
    assertArrayEquals(v3.keyId(master), v3.keyId(master.copyOf()))
    assertFalse(v3.keyId(master).contentEquals(v3.keyId(ByteArray(32))))
    assertEquals(16, v3.keyId(master).size)
    assertNotNull(v3.keyId(master))
  }

  // --- a golden file: the key schedule and the layout, frozen

  /** Randomness as a counter and a fixed clock, so the same file comes out on every run. */
  private fun deterministic(): BatiCryptoV3 {
    var counter = 0
    return BatiCryptoV3(
      fill = { bytes -> for (i in bytes.indices) bytes[i] = (counter++ and 0xff).toByte() },
      now = { 1_700_000_000_000L },
    )
  }

  /** Regenerate with `BATI_UPDATE_GOLDEN=1`; otherwise a missing or different file fails. */
  private fun frozen(
    name: String,
    actual: ByteArray,
  ) {
    val golden = File(File("../../../__tests__/fixtures/backup"), name)
    if (System.getenv("BATI_UPDATE_GOLDEN") == "1") {
      golden.parentFile?.mkdirs()
      golden.writeBytes(actual)
    }
    assertTrue("missing $golden: run once with BATI_UPDATE_GOLDEN=1", golden.exists())
    assertArrayEquals(name, golden.readBytes(), actual)
  }

  @Test
  fun aSealWithFixedRandomnessMatchesTheFileFrozenInTheRepo() {
    val fixed = deterministic()
    val input = tmp.newFile().apply { writeBytes(plain(100)) }
    val sealed = tmp.newFile()
    val slots =
      listOf(
        fixed.wrap(master, password, BatiCryptoV3.KIND_PASSWORD, 1, 19 * 1024, 2, 1),
        fixed.wrap(master, words, BatiCryptoV3.KIND_RECOVERY, 1),
      )
    fixed.sealFile(master, input, sealed, slots, installId, 41)

    // The Jest suite opens this very file with its own implementation of the format.
    frozen("kotlin-golden-v3.bin", sealed.readBytes())
  }

  @Test
  fun aBuiltHeaderRefusesWhatNoReaderWouldAccept() {
    assertThrows(IllegalArgumentException::class.java) { v3.buildHeader(master, emptyList(), installId, 1) }
    assertThrows(
      IllegalArgumentException::class.java,
    ) { v3.buildHeader(master, listOf(passwordSlot()), ByteArray(15), 1) }
    assertThrows(IllegalArgumentException::class.java) { v3.buildHeader(master, listOf(passwordSlot()), installId, -1) }
    val five = List(5) { recoverySlot() }
    assertThrows(IllegalArgumentException::class.java) { v3.buildHeader(master, five, installId, 1) }
  }

  @Test
  fun `a seal that fails leaves the previous file untouched and no part file behind`() {
    val (sealed, _) = seal(1000)
    val before = sealed.readBytes()
    val missing = File(tmp.root, "no-such-input")

    assertThrows(java.io.IOException::class.java) {
      v3.sealFile(master, missing, sealed, listOf(passwordSlot(), recoverySlot()), installId, 9)
    }

    assertArrayEquals(before, sealed.readBytes())
    assertFalse(File("${sealed.path}.part").exists())
  }

  @Test
  fun `a seal onto a name that does not exist yet leaves nothing when it fails`() {
    val target = File(tmp.root, "bati-sync-out.batb")

    assertThrows(java.io.IOException::class.java) {
      v3.sealFile(master, File(tmp.root, "no-such-input"), target, listOf(passwordSlot()), installId, 1)
    }

    assertFalse(target.exists())
    assertFalse(File("${target.path}.part").exists())
  }

  @Test
  fun `a good seal replaces the old file in one step and removes its part`() {
    val (sealed, data) = seal(70_000, counter = 1)
    val input = tmp.newFile().apply { writeBytes(plain(80_000)) }

    v3.sealFile(master, input, sealed, listOf(passwordSlot(), recoverySlot()), installId, 2)

    assertFalse(File("${sealed.path}.part").exists())
    assertEquals("2", header(sealed).counter)
    assertTrue(sealed.length() > data.size)
  }

  @Test
  fun `the install id arrives as hex and is read as hex, not as base64`() {
    val hex = installId.joinToString("") { "%02x".format(it) }
    assertArrayEquals(installId, hexBytes(hex))
    // Valid base64 of the wrong size: the mistake this guards against decodes without complaint.
    assertEquals(24, Base64.getDecoder().decode(hex).size)
    assertThrows(IllegalArgumentException::class.java) { hexBytes("zz") }
    assertThrows(IllegalArgumentException::class.java) { hexBytes("abc") }
  }
}
