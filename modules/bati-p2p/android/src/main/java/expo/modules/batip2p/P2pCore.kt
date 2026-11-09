package expo.modules.batip2p

import java.net.Inet6Address
import java.net.InetAddress
import java.net.Socket
import java.security.MessageDigest
import java.security.Principal
import java.security.PrivateKey
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import javax.net.ssl.X509ExtendedKeyManager
import javax.net.ssl.X509TrustManager

/** Everything of the P2P module that needs no Android class, so the JVM tests can run it. */
object P2pCore {
  private val suitePattern =
    Regex(
      "^(TLS_ECDHE_(ECDSA|RSA)_WITH_(AES_(128|256)_GCM_SHA(256|384)|CHACHA20_POLY1305_SHA256)" +
        "|TLS_AES_128_GCM_SHA256|TLS_AES_256_GCM_SHA384|TLS_CHACHA20_POLY1305_SHA256)$",
    )

  /** C2: ECDHE with AES-GCM or ChaCha20, plus the TLS 1.3 suites (ephemeral by construction). */
  fun filterSuites(supported: Array<String>): Array<String> =
    supported.filter { suitePattern.matches(it) }.toTypedArray()

  /** C2: TLS 1.3 and 1.2, whichever the platform has. */
  fun filterProtocols(supported: Array<String>): Array<String> =
    supported.filter { it == "TLSv1.3" || it == "TLSv1.2" }.toTypedArray()

  fun idOf(cert: X509Certificate): String = hex(MessageDigest.getInstance("SHA-256").digest(cert.encoded))

  fun hex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }

  /** At most [max] bytes of UTF-8, cut on a code point boundary. */
  fun truncateUtf8(
    s: String,
    max: Int,
  ): String {
    var bytes = 0
    var end = 0
    while (end < s.length) {
      val cp = s.codePointAt(end)
      val n = String(Character.toChars(cp)).toByteArray(Charsets.UTF_8).size
      if (bytes + n > max) break
      bytes += n
      end += Character.charCount(cp)
    }
    return s.substring(0, end)
  }

  /** RFC 5952: lowercase, no leading zeros, the longest run (2+) of zero groups as `::`. */
  fun shortIpv6(addr: ByteArray): String {
    val g = IntArray(8) { ((addr[2 * it].toInt() and 0xff) shl 8) or (addr[2 * it + 1].toInt() and 0xff) }
    var bestStart = -1
    var bestLen = 0
    var i = 0
    while (i < 8) {
      if (g[i] == 0) {
        var j = i
        while (j < 8 && g[j] == 0) j++
        if (j - i > bestLen) {
          bestStart = i
          bestLen = j - i
        }
        i = j
      } else {
        i++
      }
    }
    if (bestLen < 2) return g.joinToString(":") { Integer.toHexString(it) }
    val head = g.take(bestStart).joinToString(":") { Integer.toHexString(it) }
    val tail = g.drop(bestStart + bestLen).joinToString(":") { Integer.toHexString(it) }
    return "$head::$tail"
  }

  fun isUla(a: Inet6Address): Boolean = (a.address[0].toInt() and 0xfe) == 0xfc

  fun isGlobalV6(a: Inet6Address): Boolean {
    val local = a.isAnyLocalAddress || a.isLoopbackAddress || a.isLinkLocalAddress
    val other = a.isSiteLocalAddress || a.isMulticastAddress || isUla(a)
    return !(local || other)
  }

  fun isLiteral(host: String): Boolean = host.contains(':') || Regex("^\\d{1,3}(\\.\\d{1,3}){3}$").matches(host)

  /** Only ever called with a literal (see [isLiteral]), so nothing is looked up. */
  fun parseLiteral(host: String): InetAddress = InetAddress.getByName(host)
}

/**
 * C2: no CA, no date, no host name. A peer is accepted when SHA-256 of its leaf certificate is in
 * the pin set, or anything when [acceptAny]. A refusal says `PIN` so that dial can tell it apart.
 */
class PinTrustManager(
  private val pins: () -> Set<String>,
  private val acceptAny: () -> Boolean = { false },
) : X509TrustManager {
  override fun checkClientTrusted(
    chain: Array<out X509Certificate>?,
    authType: String?,
  ) = check(chain)

  override fun checkServerTrusted(
    chain: Array<out X509Certificate>?,
    authType: String?,
  ) = check(chain)

  private fun check(chain: Array<out X509Certificate>?) {
    val leaf = chain?.firstOrNull() ?: throw CertificateException("PIN empty chain")
    if (acceptAny()) return
    if (P2pCore.idOf(leaf) !in pins()) throw CertificateException("PIN unknown device")
  }

  override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
}

/** The one Keystore entry as a key manager, so the TLS stack never sees any other alias. */
class FixedKeyManager(
  private val chain: Array<X509Certificate>,
  private val key: PrivateKey,
) : X509ExtendedKeyManager() {
  override fun chooseClientAlias(
    keyType: Array<out String>?,
    issuers: Array<out Principal>?,
    socket: Socket?,
  ) = ALIAS

  override fun chooseServerAlias(
    keyType: String?,
    issuers: Array<out Principal>?,
    socket: Socket?,
  ) = ALIAS

  override fun getClientAliases(
    keyType: String?,
    issuers: Array<out Principal>?,
  ) = arrayOf(ALIAS)

  override fun getServerAliases(
    keyType: String?,
    issuers: Array<out Principal>?,
  ) = arrayOf(ALIAS)

  override fun getCertificateChain(alias: String?) = if (alias == ALIAS) chain else null

  override fun getPrivateKey(alias: String?) = if (alias == ALIAS) key else null

  private companion object {
    const val ALIAS = "device"
  }
}
