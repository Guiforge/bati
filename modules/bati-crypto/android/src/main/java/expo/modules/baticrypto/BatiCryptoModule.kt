package expo.modules.baticrypto

import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/**
 * The primitives an encrypted backup needs, from the platform's own `javax.crypto` and nothing
 * else. The work is in [BatiCryptoCore]; this file only crosses the bridge.
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
 * Every heavy function is a `Coroutine` on `Dispatchers.Default`. An `AsyncFunction` runs on the
 * module's one queue, and 600,000 PBKDF2 iterations (most of a second on a mid-range phone) or a
 * 100 MB seal on it holds up every other module call that is waiting its turn.
 */
class BatiCryptoModule : Module() {
  private val core = BatiCryptoCore()
  private val v3 = BatiCryptoV3()

  override fun definition() =
    ModuleDefinition {
      Name("BatiCrypto")

      AsyncFunction("randomBytes") { length: Int -> encode(core.randomBytes(length)) }

      AsyncFunction("pbkdf2") Coroutine { password: String, salt: String, iterations: Int ->
        withContext(Dispatchers.Default) { encode(core.pbkdf2(decode(password), decode(salt), iterations)) }
      }

      AsyncFunction("readPrefix") { inPath: String, length: Int ->
        encode(core.readPrefix(path(inPath), length))
      }

      AsyncFunction("seal") { key: String, plaintext: String, aad: String ->
        encode(core.seal(decode(key), decode(plaintext), decode(aad)))
      }

      AsyncFunction("open") { key: String, sealed: String, aad: String ->
        encode(core.open(decode(key), decode(sealed), decode(aad)))
      }

      AsyncFunction("sealFile") Coroutine { key: String, inPath: String, outPath: String, header: String ->
        withContext(Dispatchers.Default) {
          core.sealFile(decode(key), path(inPath), path(outPath), decode(header))
        }
      }

      AsyncFunction("openFile") Coroutine { key: String, inPath: String, outPath: String, headerLength: Int ->
        withContext(Dispatchers.Default) {
          core.openFile(decode(key), path(inPath), path(outPath), headerLength)
        }
      }

      // --- format 3. Argon2 and the file work are heavy, so all of it is off the module queue.

      /**
       * A v3 header, read and shape-checked here: JS never parses one. `{ kind: "ok", header }`,
       * `{ kind: "newerVersion" }` for a BATB file of a version after 3, or `{ kind: "notThis" }`.
       */
      AsyncFunction("readHeader") Coroutine { path: String ->
        withContext(Dispatchers.Default) {
          when (val parsed = v3.parse(core.readPrefix(path(path), BatiCryptoV3.MAX_HEADER_BYTES))) {
            is BatiCryptoV3.Parsed.Ok -> mapOf("kind" to "ok", "header" to headerMap(parsed.header))
            is BatiCryptoV3.Parsed.NewerVersion -> mapOf("kind" to "newerVersion")
            else -> mapOf("kind" to "notThis")
          }
        }
      }

      /** Constant time, from the header alone: a wrong key costs one HMAC and no body is read. */
      AsyncFunction("checkKey") Coroutine { key: String, path: String ->
        withContext(Dispatchers.Default) {
          val parsed = v3.parse(core.readPrefix(path(path), BatiCryptoV3.MAX_HEADER_BYTES))
          parsed is BatiCryptoV3.Parsed.Ok && v3.checkKey(decode(key), parsed.header)
        }
      }

      /** The master key a slot holds, or null if `secret` is not what it was made with. */
      AsyncFunction("unwrapSlot") Coroutine { secret: String, slot: String ->
        withContext(Dispatchers.Default) {
          lowMemoryAsCode { v3.unwrap(v3.decodeSlot(decode(slot)), decode(secret))?.let(::encode) }
        }
      }

      AsyncFunction("wrapSlot") Coroutine {
        key: String,
        secret: String,
        kind: Int,
        gen: Int,
        memoryKib: Int,
        passes: Int,
        lanes: Int,
        ->
        withContext(Dispatchers.Default) {
          lowMemoryAsCode {
            slotMap(v3.wrap(decode(key), decode(secret), kind, gen.toLong(), memoryKib.toLong(), passes, lanes))
          }
        }
      }

      AsyncFunction("sealFileV3") Coroutine {
        key: String,
        inPath: String,
        outPath: String,
        slots: List<String>,
        installId: String,
        counter: String,
        ->
        withContext(Dispatchers.Default) {
          v3.sealFile(
            decode(key),
            path(inPath),
            path(outPath),
            slots.map { v3.decodeSlot(decode(it)) },
            hexBytes(installId),
            java.lang.Long.parseLong(counter),
          )
          // Nothing back: a Header is not a type the bridge can convert, and it said so only in a
          // release build (R8 renames it), after the file was already sealed.
          Unit
        }
      }

      AsyncFunction("openFileV3") Coroutine { key: String, inPath: String, outPath: String ->
        withContext(Dispatchers.Default) { v3.openFile(decode(key), path(inPath), path(outPath)) }
      }

      AsyncFunction("keyId") { key: String -> encode(v3.keyId(decode(key))) }
    }

  private fun slotMap(slot: BatiCryptoV3.Slot): Map<String, Any> =
    mapOf(
      "kind" to slot.kind,
      "gen" to slot.gen.toInt(),
      "memoryKib" to slot.memoryKib.toInt(),
      "passes" to slot.passes,
      "lanes" to slot.lanes,
      "raw" to encode(slot.encode()),
    )

  private fun headerMap(header: BatiCryptoV3.Header): Map<String, Any> =
    mapOf(
      "headerLength" to header.length,
      "installId" to header.installId.joinToString("") { "%02x".format(it) },
      "counter" to header.counter,
      "sealedAt" to header.sealedAt.toDouble(),
      "slots" to header.slots.map(::slotMap),
    )

  /** The pure Kotlin core throws its own exception; the bridge can only carry a coded one. */
  private fun <T> lowMemoryAsCode(block: () -> T): T =
    try {
      block()
    } catch (error: BatiCryptoV3.LowMemoryException) {
      throw LowMemoryCodedException()
    }

  /** SQLite speaks paths and expo-file-system speaks `file://` URIs; accept both. */
  private fun path(value: String) = File(value.removePrefix("file://"))

  private fun encode(bytes: ByteArray) = Base64.encodeToString(bytes, Base64.NO_WRAP)

  private fun decode(value: String) = Base64.decode(value, Base64.NO_WRAP)
}

private class LowMemoryCodedException : CodedException("LOW_MEMORY", "Not enough memory for the key derivation", null)
