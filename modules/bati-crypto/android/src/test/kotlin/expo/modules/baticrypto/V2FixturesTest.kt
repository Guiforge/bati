package expo.modules.baticrypto

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.security.MessageDigest
import java.util.Base64

/**
 * The format 2 files frozen in `__tests__/fixtures/backup`, opened by the real Kotlin.
 *
 * They were written by the TypeScript code and the Node double of this module, and the Jest suite
 * reads them back through the same two. This is the third reader, the one that runs on a phone: if
 * it cannot open a file the others wrote, a hero's backup opens in CI and not on their device.
 *
 * Only the segment layer is read here: the manifest carries each file's master key and header
 * length, so the key slots, the check value and the password stretching stay the business of the
 * TypeScript tests. What this proves is that the bytes after the header are what Kotlin expects.
 */
class V2FixturesTest {
  @get:Rule val tmp = TemporaryFolder()

  private val core = BatiCryptoCore()

  private data class Entry(
    val file: String,
    val size: Long,
    val sha256: String,
    val key: ByteArray,
    val headerLength: Int,
  )

  /** The manifest is written by a test with a fixed shape, so a few patterns read it: no JSON library. */
  private fun entries(): List<Entry> {
    val text = File(FIXTURES, "v2-manifest.json").readText()
    val blocks = Regex("""\{[^{}]*}""").findAll(text).map { it.value }.toList()

    fun field(
      block: String,
      name: String,
    ) = Regex(""""$name":\s*"?([^",\n}]*)"?""").find(block)!!.groupValues[1]
    return blocks.map {
      Entry(
        file = field(it, "file"),
        size = field(it, "size").toLong(),
        sha256 = field(it, "sha256"),
        key = Base64.getDecoder().decode(field(it, "key")),
        headerLength = field(it, "headerLength").toInt(),
      )
    }
  }

  @Test
  fun everyFrozenFileOpensAndHoldsWhatWasSealed() {
    val all = entries()
    assertTrue("the manifest lists files", all.size >= 4)
    for (entry in all) {
      val out = File(tmp.root, "out-${entry.file}")
      core.openFile(entry.key, File(FIXTURES, entry.file), out, entry.headerLength)

      assertEquals(entry.file, entry.size, out.length())
      val digest = MessageDigest.getInstance("SHA-256").digest(out.readBytes())
      assertEquals(entry.file, entry.sha256, digest.joinToString("") { "%02x".format(it) })
    }
  }

  private companion object {
    val FIXTURES = File("../../../__tests__/fixtures/backup")
  }
}
