package expo.modules.batip2p

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import android.provider.Settings
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import java.net.Inet4Address
import java.net.Inet6Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketTimeoutException
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.cert.X509Certificate
import java.security.spec.ECGenParameterSpec
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLHandshakeException
import javax.net.ssl.SSLServerSocket
import javax.net.ssl.SSLSocket
import javax.security.auth.x500.X500Principal

/**
 * The sockets of the device-to-device sync live here, out of reach of the JS lint
 * `noJsNetwork.grit`. This module only ever listens on the LAN and connects to addresses JS hands
 * it: no URL, no HttpURLConnection, no host name lookup beyond NSD resolution. Mutual TLS pins the
 * peer's certificate by SHA-256 (docs/designs/p2p-sync/SPEC.md C1, C2, L8, D2); the protocol on top
 * is TypeScript (src/p2p/). The rules that need no Android are in [P2pCore].
 *
 * Bytes cross the bridge as base64. Heavy work runs in a `Coroutine` on `Dispatchers.IO`.
 */
class BatiP2pModule : Module() {
  private val conns = ConcurrentHashMap<Int, P2pConn>()
  private val nextId = AtomicInteger(1)
  private val pins = ConcurrentHashMap.newKeySet<String>()

  @Volatile private var acceptAny = false

  @Volatile private var server: SSLServerSocket? = null
  private val busy = AtomicBoolean(false)

  @Volatile private var registration: NsdManager.RegistrationListener? = null

  @Volatile private var discovery: NsdManager.DiscoveryListener? = null
  private val resolveQueue = ArrayDeque<NsdServiceInfo>()
  private var resolving = false

  private val context get() = appContext.reactContext ?: throw CodedException("no context")
  private val nsd get() = context.getSystemService(Context.NSD_SERVICE) as NsdManager

  override fun definition() =
    ModuleDefinition {
      Name("BatiP2p")
      Events("onConnected", "onData", "onClosed", "onFound")

      // shortcut: a zero-argument Coroutine is ambiguous in this expo-modules-core, so these run on the
      // module queue; they are quick (the Keystore key is made once).
      AsyncFunction("deviceId") { P2pCore.idOf(identity().first[0]) }

      AsyncFunction("deviceName") {
        val name = Settings.Global.getString(context.contentResolver, "device_name")
        P2pCore.truncateUtf8(if (name.isNullOrBlank()) Build.MODEL else name, 32)
      }

      AsyncFunction("localAddresses") Coroutine { global: Boolean ->
        withContext(Dispatchers.IO) { localAddresses(global) }
      }

      AsyncFunction("listen") Coroutine { pinList: List<String>, any: Boolean, port: Int ->
        withContext(Dispatchers.IO) { listen(pinList, any, port) }
      }

      AsyncFunction("setPins") { pinList: List<String>, any: Boolean -> setPins(pinList, any) }

      AsyncFunction("stopListening") { stopListening() }

      AsyncFunction("dial") Coroutine { host: String, port: Int, pin: String ->
        withContext(Dispatchers.IO) { dial(host, port, pin) }
      }

      AsyncFunction("send") Coroutine { socket: Int, bytes: String ->
        withContext(Dispatchers.IO) {
          val c = conns[socket] ?: throw CodedException("socket $socket is closed")
          try {
            c.send(Base64.decode(bytes, Base64.NO_WRAP))
          } catch (e: IOException) {
            throw CodedException("socket $socket is closed: ${e.message}")
          }
        }
      }

      AsyncFunction("close") Coroutine { socket: Int ->
        withContext(Dispatchers.IO) { conns[socket]?.close("closed locally") }
      }

      AsyncFunction("announce") { name: String, port: Int -> announce(name, port) }
      AsyncFunction("browse") { browse() }
      AsyncFunction("stopDiscovery") { stopDiscovery() }

      OnDestroy {
        server?.close()
        conns.values.forEach { it.close("module destroyed") }
        stopDiscovery()
      }
    }

  // ---- identity (L8) ----

  private fun identity(): Pair<Array<X509Certificate>, PrivateKey> {
    val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    if (!ks.containsAlias(ALIAS)) {
      val now = System.currentTimeMillis()
      val spec =
        KeyGenParameterSpec
          .Builder(ALIAS, KeyProperties.PURPOSE_SIGN)
          .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
          .setDigests(KeyProperties.DIGEST_SHA256)
          .setCertificateSubject(X500Principal("CN=device"))
          .setCertificateNotBefore(java.util.Date(now - 24L * 3600 * 1000))
          .setCertificateNotAfter(java.util.Date(now + 100L * 365 * 24 * 3600 * 1000))
          .build()
      KeyPairGenerator
        .getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore")
        .apply {
          initialize(spec)
        }.generateKeyPair()
    }
    val chain = ks.getCertificateChain(ALIAS).map { it as X509Certificate }.toTypedArray()
    return Pair(chain, ks.getKey(ALIAS, null) as PrivateKey)
  }

  private fun sslContext(tm: PinTrustManager): SSLContext {
    val (chain, key) = identity()
    return SSLContext.getInstance("TLS").apply { init(arrayOf(FixedKeyManager(chain, key)), arrayOf(tm), null) }
  }

  private fun harden(s: SSLSocket) {
    s.enabledProtocols = P2pCore.filterProtocols(s.supportedProtocols)
    s.enabledCipherSuites = P2pCore.filterSuites(s.supportedCipherSuites)
  }

  private fun peerId(s: SSLSocket): String = P2pCore.idOf(s.session.peerCertificates[0] as X509Certificate)

  // ---- listener (C1) ----

  private fun setPins(
    list: List<String>,
    any: Boolean,
  ) {
    pins.clear()
    pins.addAll(list)
    acceptAny = any
  }

  private fun listen(
    list: List<String>,
    any: Boolean,
    port: Int,
  ): Int {
    stopListening()
    setPins(list, any)
    val ctx = sslContext(PinTrustManager({ pins }, { acceptAny }))
    val factory = ctx.serverSocketFactory
    // Preferred port first, then any: another process may hold it.
    val ss =
      (if (port in 1..65535) runCatching { factory.createServerSocket(port) }.getOrNull() else null)
        ?: factory.createServerSocket(0)
    val s = ss as SSLServerSocket
    s.needClientAuth = true
    s.enabledProtocols = P2pCore.filterProtocols(s.supportedProtocols)
    s.enabledCipherSuites = P2pCore.filterSuites(s.supportedCipherSuites)
    server = s
    busy.set(false)
    Thread({
      while (!s.isClosed) {
        val raw =
          try {
            s.accept() as SSLSocket
          } catch (_: IOException) {
            break
          }
        if (!busy.compareAndSet(false, true)) {
          runCatching { raw.close() }
          continue
        }
        Thread({ serve(raw) }, "bati-p2p-handshake").start()
      }
    }, "bati-p2p-accept").start()
    return s.localPort
  }

  private fun serve(raw: SSLSocket) {
    try {
      raw.soTimeout = 5000
      raw.startHandshake()
      raw.soTimeout = 0
      val id = newConn(raw, true)
      sendEvent(
        "onConnected",
        mapOf(
          "socket" to id,
          "peerId" to peerId(raw),
          "address" to (raw.inetAddress?.hostAddress ?: ""),
        ),
      )
      conns[id]?.start()
    } catch (e: IOException) {
      runCatching { raw.close() }
      busy.set(false)
    }
  }

  private fun stopListening() {
    server?.let { runCatching { it.close() } }
    server = null
  }

  private fun newConn(
    s: Socket,
    accepted: Boolean,
  ): Int {
    val id = nextId.getAndIncrement()
    conns[id] =
      P2pConn(
        id,
        s,
        { sendEvent("onData", mapOf("socket" to id, "bytes" to Base64.encodeToString(it, Base64.NO_WRAP))) },
        {
          conns.remove(id)
          if (accepted) busy.set(false)
          sendEvent("onClosed", mapOf("socket" to id, "reason" to it))
        },
      )
    return id
  }

  // ---- dial ----

  private fun linkLocalScoped(a: Inet6Address): InetAddress {
    val ifs =
      NetworkInterface
        .getNetworkInterfaces()
        ?.toList()
        .orEmpty()
        .filter { it.isUp && !it.isLoopback }
    val nic = ifs.firstOrNull { it.name.startsWith("wlan") } ?: ifs.firstOrNull { !isCellular(it.name) } ?: return a
    return Inet6Address.getByAddress(null, a.address, nic)
  }

  private fun dial(
    host: String,
    port: Int,
    pin: String,
  ): Int {
    if (!P2pCore.isLiteral(host)) throw CodedException("UNREACHABLE not an address: $host")
    val ctx = sslContext(PinTrustManager({ setOf(pin) }))
    val plain = Socket()
    val ssl: SSLSocket
    try {
      var addr = P2pCore.parseLiteral(host)
      if (addr is Inet6Address && addr.isLinkLocalAddress && addr.scopeId == 0 &&
        addr.scopedInterface == null
      ) {
        addr = linkLocalScoped(addr)
      }
      plain.connect(InetSocketAddress(addr, port), 5000)
      ssl = ctx.socketFactory.createSocket(plain, addr.hostAddress, port, true) as SSLSocket
    } catch (e: IOException) {
      runCatching { plain.close() }
      throw CodedException("UNREACHABLE ${e.message}")
    }
    try {
      harden(ssl)
      ssl.soTimeout = 5000
      ssl.startHandshake()
      if (peerId(ssl) != pin) throw SSLHandshakeException("PIN unexpected device")
      ssl.soTimeout = 0
    } catch (e: IOException) {
      runCatching { ssl.close() }
      var c: Throwable? = e
      while (c != null) {
        if (c.message?.startsWith("PIN") == true) throw CodedException("PIN ${c.message}")
        c = c.cause
      }
      if (e is SocketTimeoutException) throw CodedException("UNREACHABLE handshake timed out")
      throw CodedException("TLS ${e.message}")
    }
    val id = newConn(ssl, false)
    conns[id]?.start()
    return id
  }

  // ---- addresses ----

  private fun isCellular(name: String) = listOf("rmnet", "ccmni", "pdp", "radio").any { name.startsWith(it) }

  private fun localAddresses(global: Boolean): List<String> {
    val out = LinkedHashSet<String>()
    for (nic in NetworkInterface.getNetworkInterfaces()?.toList().orEmpty()) {
      if (!nic.isUp || nic.isLoopback || isCellular(nic.name)) continue
      for (a in nic.inetAddresses.toList()) {
        when {
          a is Inet4Address -> {
            if (a.isSiteLocalAddress) out.add(a.hostAddress!!)
          }

          a is Inet6Address -> {
            if (a.isLinkLocalAddress || P2pCore.isUla(a) ||
              (global && P2pCore.isGlobalV6(a))
            ) {
              out.add(P2pCore.shortIpv6(a.address))
            }
          }
        }
      }
    }
    return out.toList()
  }

  // ---- NSD (D2) ----

  private fun announce(
    name: String,
    port: Int,
  ) {
    stopRegistration()
    val info =
      NsdServiceInfo().apply {
        serviceName = name
        serviceType = SERVICE
        setPort(port)
      }
    val l =
      object : NsdManager.RegistrationListener {
        override fun onServiceRegistered(i: NsdServiceInfo) {}

        override fun onRegistrationFailed(
          i: NsdServiceInfo,
          code: Int,
        ) {}

        override fun onServiceUnregistered(i: NsdServiceInfo) {}

        override fun onUnregistrationFailed(
          i: NsdServiceInfo,
          code: Int,
        ) {}
      }
    registration = l
    nsd.registerService(info, NsdManager.PROTOCOL_DNS_SD, l)
  }

  private fun browse() {
    if (discovery != null) return
    // shortcut: no WifiManager.MulticastLock is taken, and it is untested whether discovery needs
    // one. SPEC §5: add it, with CHANGE_WIFI_MULTICAST_STATE and its justification in
    // __tests__/android-permissions.test.ts, only if a phone test shows discovery fails without it.
    val l =
      object : NsdManager.DiscoveryListener {
        override fun onDiscoveryStarted(t: String) {}

        override fun onServiceFound(i: NsdServiceInfo) {
          if (i.serviceType.trimEnd('.').startsWith("_bati._tcp")) enqueue(i)
        }

        override fun onServiceLost(i: NsdServiceInfo) {}

        override fun onDiscoveryStopped(t: String) {}

        override fun onStartDiscoveryFailed(
          t: String,
          code: Int,
        ) {
          discovery = null
        }

        override fun onStopDiscoveryFailed(
          t: String,
          code: Int,
        ) {}
      }
    discovery = l
    nsd.discoverServices(SERVICE, NsdManager.PROTOCOL_DNS_SD, l)
  }

  // API 24 allows one resolve at a time and fails the rest with FAILURE_ALREADY_ACTIVE.
  private fun enqueue(i: NsdServiceInfo) {
    synchronized(resolveQueue) {
      resolveQueue.addLast(i)
      pump()
    }
  }

  private fun pump() {
    if (resolving) return
    val next = resolveQueue.removeFirstOrNull() ?: return
    resolving = true
    val done = {
      synchronized(resolveQueue) {
        resolving = false
        pump()
      }
    }
    try {
      nsd.resolveService(
        next,
        object : NsdManager.ResolveListener {
          override fun onResolveFailed(
            i: NsdServiceInfo,
            code: Int,
          ) = done()

          override fun onServiceResolved(i: NsdServiceInfo) {
            val h = i.host?.hostAddress
            if (h != null) sendEvent("onFound", mapOf("name" to i.serviceName, "host" to h, "port" to i.port))
            done()
          }
        },
      )
    } catch (_: IllegalArgumentException) {
      done()
    }
  }

  private fun stopRegistration() {
    registration?.let { runCatching { nsd.unregisterService(it) } }
    registration = null
  }

  private fun stopDiscovery() {
    stopRegistration()
    discovery?.let { runCatching { nsd.stopServiceDiscovery(it) } }
    discovery = null
    synchronized(resolveQueue) { resolveQueue.clear() }
  }

  private companion object {
    const val ALIAS = "bati.p2p.device"
    const val SERVICE = "_bati._tcp"
  }
}
