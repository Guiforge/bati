package expo.modules.baticrypto

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.util.Base64

/**
 * Every way a file gets damaged on its way (a cut transfer, a flipped bit, a segment swapped or
 * repeated by something that meant harm), applied to the three-segment file a phone really wrote.
 * Each must be refused, and must leave no database behind: a half-opened file is the one outcome
 * a hero must never have.
 */
class FixtureAlterationTest {
  @get:Rule val tmp = TemporaryFolder()

  private val v3 = BatiCryptoV3()
  private val entry = EmulatorFixtures.format3().first { it.id == "F2b" }
  private val key = Base64.getDecoder().decode(entry.key)
  private val original = File(EmulatorFixtures.DIR, entry.file).readBytes()
  private val header = EmulatorFixtures.header(v3, File(EmulatorFixtures.DIR, entry.file))
  private val headerLength = header.length
  private val segment = BatiCryptoCore.SEGMENT_BYTES + BatiCryptoCore.TAG_BYTES

  private fun refused(
    label: String,
    bytes: ByteArray,
  ) {
    val input = tmp.newFile().apply { writeBytes(bytes) }
    val output = File(tmp.root, "out-${System.nanoTime()}")
    try {
      v3.openFile(key, input, output)
      fail("$label: the altered file opened")
    } catch (expected: Exception) {
      // Any refusal will do: what matters is that it was one, and that nothing was left behind.
    }
    assertTrue("$label: no database was written", !output.exists())
    assertTrue("$label: no temporary file was left", !File("${output.path}.part").exists())
  }

  private fun body(index: Int) =
    original.copyOfRange(
      headerLength + index * segment,
      minOf(
        original.size,
        headerLength + (index + 1) * segment,
      ),
    )

  @Test
  fun theUntouchedFileOpens() {
    val input = File(EmulatorFixtures.DIR, entry.file)
    val output = File(tmp.root, "control")
    v3.openFile(key, input, output)

    assertEquals(entry.plainSha256, EmulatorFixtures.sha256(output.readBytes()))
  }

  @Test
  fun everyTruncationIsRefused() {
    refused("empty file", ByteArray(0))
    refused("only the magic", original.copyOf(4))
    refused("half the header", original.copyOf(headerLength / 2))
    refused("the header alone", original.copyOf(headerLength))
    refused("a few bytes of body", original.copyOf(headerLength + 5))
    refused("inside the first segment", original.copyOf(headerLength + segment / 2))
    refused(
      "the last segment dropped, cut at a boundary",
      original.copyOf(headerLength + (original.size - headerLength) / segment * segment - segment),
    )
    refused("one byte short", original.copyOf(original.size - 1))
  }

  @Test
  fun everyFlippedByteIsRefused() {
    for (
    (label, at) in
    listOf(
      "a header byte inside a slot" to 20,
      "the install id" to 6,
      "the first body byte" to headerLength,
      "the middle of the first segment" to headerLength + segment / 2,
      "a tag" to headerLength + segment - 3,
      "the first byte of the last segment" to original.size - body(2).size,
      "the very last byte" to original.size - 1,
    )
    ) {
      val copy = original.copyOf()
      copy[at] = (copy[at].toInt() xor 0x01).toByte()
      refused(label, copy)
    }
  }

  @Test
  fun segmentsSwappedRepeatedOrAddedAreRefused() {
    val head = original.copyOf(headerLength)
    val s0 = body(0)
    val s1 = body(1)
    val s2 = body(2)

    refused("segments 0 and 1 swapped", head + s1 + s0 + s2)
    refused("segments 1 and 2 swapped", head + s0 + s2 + s1)
    refused("segment 0 repeated", head + s0 + s0 + s1 + s2)
    refused("segment 1 dropped", head + s0 + s2)
    refused("segment 0 moved to the end", head + s1 + s2 + s0)
    refused("a byte appended", original + byteArrayOf(0))
    refused("a whole zero segment appended", original + ByteArray(segment))
  }
}
