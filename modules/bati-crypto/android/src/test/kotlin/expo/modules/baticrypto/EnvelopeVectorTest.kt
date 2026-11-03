package expo.modules.baticrypto

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import java.io.File

/**
 * The frozen multiplayer envelope (docs/designs/multiplayer/envelope.md) opens through the real
 * javax.crypto, with its header as associated data: the jest suite runs against a Node double, and
 * this is what says the double and the phone agree on the format.
 */
class EnvelopeVectorTest {
  private val core = BatiCryptoCore()
  private val json = File("../../../__tests__/fixtures/multiplayer/envelope-v1.json").readText()
  private val key = ByteArray(32) { it.toByte() }

  private fun hex(name: String): ByteArray {
    val value = Regex("\"$name\": \"([0-9a-f]+)\"").find(json)!!.groupValues[1]
    return value.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
  }

  private val header = hex("headerHex")
  private val envelope = hex("envelopeHex")

  @Test
  fun theFrozenWeekOpensToItsGoalFlagsAndDays() {
    val sealed = envelope.copyOfRange(header.size, envelope.size)
    val plain = core.open(key, sealed, header)
    // After the four bytes of the stamp: goal 3, not paused, then Monday to Sunday.
    assertArrayEquals(byteArrayOf(3, 0, 1, 0, 1, 0, 0, 0, 0), plain.copyOfRange(4, 13))
  }

  @Test
  fun aHeaderChangedInTransitRefusesToOpen() {
    val sealed = envelope.copyOfRange(header.size, envelope.size)
    val altered = header.copyOf().also { it[28] = (it[28] + 1).toByte() }
    assertThrows(Exception::class.java) { core.open(key, sealed, altered) }
  }
}
