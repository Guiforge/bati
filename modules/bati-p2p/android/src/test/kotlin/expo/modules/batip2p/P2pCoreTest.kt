package expo.modules.batip2p

import org.bouncycastle.asn1.x500.X500Name
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.math.BigInteger
import java.security.KeyPairGenerator
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import java.util.Date

class P2pCoreTest {
  private fun cert(): X509Certificate {
    val kp = KeyPairGenerator.getInstance("EC").apply { initialize(256) }.generateKeyPair()
    val name = X500Name("CN=device")
    val now = System.currentTimeMillis()
    val b =
      JcaX509v3CertificateBuilder(name, BigInteger.valueOf(now), Date(now - 1000), Date(now + 100000), name, kp.public)
    return JcaX509CertificateConverter().getCertificate(
      b.build(JcaContentSignerBuilder("SHA256withECDSA").build(kp.private)),
    )
  }

  private fun refused(
    tm: PinTrustManager,
    chain: Array<X509Certificate>,
  ) {
    try {
      tm.checkServerTrusted(chain, "ECDHE_ECDSA")
      fail("accepted")
    } catch (e: CertificateException) {
      assertTrue(e.message!!.startsWith("PIN"))
    }
  }

  @Test fun pinnedCertIsAcceptedAndAnotherRefused() {
    val a = cert()
    val b = cert()
    val tm = PinTrustManager({ setOf(P2pCore.idOf(a)) })
    tm.checkServerTrusted(arrayOf(a), "x")
    tm.checkClientTrusted(arrayOf(a), "x")
    refused(tm, arrayOf(b))
  }

  @Test fun emptyChainIsRefusedEvenWhenAcceptAny() {
    val tm = PinTrustManager({ emptySet() }, { true })
    refused(tm, emptyArray())
    tm.checkClientTrusted(arrayOf(cert()), "x")
  }

  @Test fun idIsSha256HexOfDer() {
    assertEquals(64, P2pCore.idOf(cert()).length)
  }

  @Test fun ipv6ShortForm() {
    fun s(a: String) =
      P2pCore.shortIpv6(
        java.net.InetAddress
          .getByName(a)
          .address,
      )
    assertEquals("fe80::1", s("fe80:0:0:0:0:0:0:1"))
    assertEquals("::", s("0:0:0:0:0:0:0:0"))
    assertEquals("2001:db8::1:0:0:1", s("2001:db8:0:0:1:0:0:1"))
    assertEquals("2001:db8:0:1:1:1:1:1", s("2001:db8:0:1:1:1:1:1"))
    assertEquals("fd00:abcd::ff", s("fd00:abcd:0:0:0:0:0:ff"))
    assertEquals("1::", s("1:0:0:0:0:0:0:0"))
  }

  @Test fun nameIsCutOnACodePoint() {
    assertEquals("abc", P2pCore.truncateUtf8("abc", 32))
    val long = "a".repeat(31) + "é"
    assertEquals("a".repeat(31), P2pCore.truncateUtf8(long, 32))
    val emoji = "a".repeat(30) + "😀"
    assertEquals("a".repeat(30), P2pCore.truncateUtf8(emoji, 32))
    assertTrue(P2pCore.truncateUtf8("é".repeat(40), 32).toByteArray().size <= 32)
  }

  @Test fun suitesAndProtocolsAreFiltered() {
    val got =
      P2pCore.filterSuites(
        arrayOf(
          "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
          "TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256",
          "TLS_RSA_WITH_AES_128_GCM_SHA256",
          "TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA",
          "TLS_AES_256_GCM_SHA384",
        ),
      )
    assertArrayEquals(
      arrayOf(
        "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
        "TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256",
        "TLS_AES_256_GCM_SHA384",
      ),
      got,
    )
    assertArrayEquals(
      arrayOf("TLSv1.2", "TLSv1.3"),
      P2pCore.filterProtocols(arrayOf("SSLv3", "TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3")),
    )
  }
}
