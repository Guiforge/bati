package expo.modules.batip2p

import java.io.IOException
import java.net.Socket
import java.util.concurrent.atomic.AtomicBoolean

/** One TLS socket: a reader thread, serialized writes, and an `onClosed` that fires exactly once. */
class P2pConn(
  val id: Int,
  private val socket: Socket,
  private val onData: (ByteArray) -> Unit,
  private val onClosed: (String) -> Unit,
) {
  private val closed = AtomicBoolean(false)
  private val out = socket.getOutputStream()

  fun start() {
    Thread({
      val buf = ByteArray(64 * 1024)
      try {
        val input = socket.getInputStream()
        while (true) {
          val n = input.read(buf)
          if (n < 0) break
          if (n > 0) onData(buf.copyOf(n))
        }
        close("eof")
      } catch (e: IOException) {
        close(e.message ?: "io")
      }
    }, "bati-p2p-$id").start()
  }

  fun send(bytes: ByteArray) {
    if (closed.get()) throw IOException("closed")
    try {
      synchronized(out) {
        out.write(bytes)
        out.flush()
      }
    } catch (e: IOException) {
      close(e.message ?: "write")
      throw e
    }
  }

  fun close(reason: String = "closed") {
    if (!closed.compareAndSet(false, true)) return
    try {
      socket.close()
    } catch (_: IOException) {
      // shortcut: a failing close leaves nothing to recover, the socket is gone either way
    }
    onClosed(reason)
  }
}
