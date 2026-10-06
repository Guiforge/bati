package expo.modules.baticrypto

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.security.MessageDigest
import java.util.Base64

/**
 * The format 3 files captured from real emulators (`__tests__/fixtures/backup/emulator`), opened by
 * the Kotlin that runs on a phone: each key slot with the bytes the secret became in the app, then
 * the body, then a digest of the database that comes out.
 *
 * What it adds to the files the Node double wrote: these were sealed by this code, on a device, with
 * R8 on. They pin the bytes a phone really writes, and the F2b one has three segments.
 */
class EmulatorFixturesTest {
  @get:Rule val tmp = TemporaryFolder()

  private val v3 = BatiCryptoV3()

  @Test
  fun everyFormat3FileOpensThroughItsPasswordSlotAndItsWordsSlot() {
    val all = EmulatorFixtures.format3()
    assertTrue("the manifest lists the format 3 files", all.size >= 3)
    for (entry in all) {
      val header = EmulatorFixtures.header(v3, File(EmulatorFixtures.DIR, entry.file))
      val key = Base64.getDecoder().decode(entry.key)

      val byPassword = header.slots.first { it.kind == BatiCryptoV3.KIND_PASSWORD }
      val byWords = header.slots.first { it.kind == BatiCryptoV3.KIND_RECOVERY }
      assertArrayEquals(entry.file, key, v3.unwrap(byPassword, Base64.getDecoder().decode(entry.passwordSecret)))
      assertArrayEquals(entry.file, key, v3.unwrap(byWords, Base64.getDecoder().decode(entry.wordsSecret)))
      assertTrue(entry.file, v3.checkKey(key, header))
    }
  }

  @Test
  fun aWrongSecretOpensNoSlot() {
    val entry = EmulatorFixtures.format3().first()
    val header = EmulatorFixtures.header(v3, File(EmulatorFixtures.DIR, entry.file))

    for (slot in header.slots) {
      assertEquals(null, v3.unwrap(slot, "not the secret of this slot".toByteArray()))
    }
  }

  @Test
  fun theBodyOpensAndTheDatabaseIsWhatTheCaptureSaw() {
    for (entry in EmulatorFixtures.format3()) {
      val out = File(tmp.root, "out-${entry.file}")
      v3.openFile(Base64.getDecoder().decode(entry.key), File(EmulatorFixtures.DIR, entry.file), out)

      assertEquals(entry.file, entry.plainSize, out.length())
      assertEquals(entry.file, entry.plainSha256, EmulatorFixtures.sha256(out.readBytes()))
      assertTrue("no temporary file is left", !File("${out.path}.part").exists())
    }
  }

  @Test
  fun theThreeSegmentFileReallyHasThreeSegments() {
    val entry = EmulatorFixtures.format3().first { it.id == "F2b" }
    val header = EmulatorFixtures.header(v3, File(EmulatorFixtures.DIR, entry.file))
    val body = entry.size - header.length
    val segment = (BatiCryptoCore.SEGMENT_BYTES + BatiCryptoCore.TAG_BYTES).toLong()

    assertTrue("more than two segments of body: ${body / segment}", body > 2 * segment)
    assertNotNull(header)
  }
}

/** What the capture wrote for each file, and the plumbing the two fixture tests share. */
internal object EmulatorFixtures {
  val DIR = File("../../../__tests__/fixtures/backup/emulator")

  data class Entry(
    val id: String,
    val file: String,
    val size: Long,
    val key: String,
    val passwordSecret: String,
    val wordsSecret: String,
    val plainSize: Long,
    val plainSha256: String,
  )

  /** The manifest has a fixed shape (the capture writes it), so a few patterns read it: no JSON library. */
  fun format3(): List<Entry> {
    val text = File(DIR, "manifest.json").readText()
    val blocks =
      Regex("""\{[^{}]*}""")
        .findAll(text)
        .map { it.value }
        .filter { """"format": 3""" in it }
        .toList()

    fun field(
      block: String,
      name: String,
    ) = Regex(""""$name":\s*"?([^",\n}]*)"?""").find(block)!!.groupValues[1]
    return blocks.map {
      Entry(
        id = field(it, "id"),
        file = field(it, "file"),
        size = field(it, "size").toLong(),
        key = field(it, "key"),
        passwordSecret = field(it, "passwordSecret"),
        wordsSecret = field(it, "wordsSecret"),
        plainSize = field(it, "plainSize").toLong(),
        plainSha256 = field(it, "plainSha256"),
      )
    }
  }

  fun header(
    v3: BatiCryptoV3,
    file: File,
  ): BatiCryptoV3.Header =
    (
      v3.parse(
        file.readBytes().copyOf(BatiCryptoV3.MAX_HEADER_BYTES.coerceAtMost(file.length().toInt())),
      ) as BatiCryptoV3.Parsed.Ok
    ).header

  fun sha256(bytes: ByteArray): String =
    MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") {
      "%02x".format(it)
    }
}
