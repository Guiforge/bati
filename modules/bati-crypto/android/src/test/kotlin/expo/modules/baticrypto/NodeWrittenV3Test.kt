package expo.modules.baticrypto

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.security.MessageDigest

/**
 * The other half of the cross test: what the Node double writes (`__tests__/backup-node-written-v3.test.ts`),
 * opened by the Kotlin that runs on a phone, through each of its two slots, and a three segment seal
 * reproduced from the same randomness. `BatiCryptoV3Test` and `__tests__/backup-kotlin-golden.test.ts` are the
 * half where Kotlin writes and Node reads.
 */
class NodeWrittenV3Test {
  @get:Rule val tmp = TemporaryFolder()

  private val v3 = BatiCryptoV3()
  private val master = ByteArray(32) { (it * 5 + 3).toByte() }
  private val installId = ByteArray(16) { (it + 1).toByte() }
  private val password = "correct horse battery staple".toByteArray()
  private val words = ByteArray(16) { (it * 11 + 2).toByte() }
  private val dir = File("../../../__tests__/fixtures/backup/node-written")

  private fun plain(size: Int) = ByteArray(size) { (it * 17 + it / 199).toByte() }

  @Test
  fun everyFileTheNodeDoubleWroteOpensThroughBothItsSlotsAndHoldsWhatWasSealed() {
    for (size in listOf(0, 1, 100_000)) {
      val file = File(dir, "node-v3-$size.batb")
      assertTrue("missing $file", file.exists())
      val header = EmulatorFixtures.header(v3, file)

      val byPassword = header.slots.first { it.kind == BatiCryptoV3.KIND_PASSWORD }
      val byWords = header.slots.first { it.kind == BatiCryptoV3.KIND_RECOVERY }
      assertArrayEquals("$size by password", master, v3.unwrap(byPassword, password))
      assertArrayEquals("$size by words", master, v3.unwrap(byWords, words))
      assertTrue("$size check value", v3.checkKey(master, header))
      assertArrayEquals("$size installId", installId, header.installId)

      val out = File(tmp.root, "out-$size")
      v3.openFile(master, file, out)
      assertArrayEquals("$size body", plain(size), out.readBytes())
    }
  }

  @Test
  fun aThreeSegmentSealFromTheSameRandomnessHasTheDigestTheNodeDoubleFroze() {
    var counter = 0
    val fixed =
      BatiCryptoV3(
        fill = { bytes -> for (i in bytes.indices) bytes[i] = (counter++ and 0xff).toByte() },
        now = { 1_700_000_000_000L },
      )
    val input = tmp.newFile().apply { writeBytes(plain(2 * BatiCryptoCore.SEGMENT_BYTES + 7)) }
    val sealed = tmp.newFile()
    val slots =
      listOf(
        fixed.wrap(master, password, BatiCryptoV3.KIND_PASSWORD, 1, 19 * 1024, 2, 1),
        fixed.wrap(master, words, BatiCryptoV3.KIND_RECOVERY, 1),
      )
    fixed.sealFile(master, input, sealed, slots, installId, 41)

    val digest = MessageDigest.getInstance("SHA-256").digest(sealed.readBytes())
    assertArrayEquals(File(dir, "node-v3-multi.sha256").readBytes(), digest)
  }
}
