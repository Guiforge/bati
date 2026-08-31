package expo.modules.batilocation

import android.Manifest
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * The tracking loop: `LocationManager` at 1 Hz, inside a foreground service, for as long as an
 * outdoor session lasts. No Google Play Services anywhere in the call graph — see
 * docs/designs/gps-without-google.md.
 *
 * Everything the JS side would have to call back into native for lives here instead: the
 * accuracy and speed rejection, and `distanceTo` against the last *accepted* fix. A filter in JS
 * would leave `distFromPrev` measuring from fixes JS had already thrown away.
 */
class BatiLocationService : Service(), LocationListener {
  /** The four things the notification can truthfully say. JS supplies the words, localized. */
  private enum class State {
    ACQUIRING,
    TRACKING,
    PAUSED,
    GPS_OFF,
  }

  private val handler = Handler(Looper.getMainLooper())
  private val noFixTimeout = Runnable { onNoFix() }

  /** A restarted service with nobody to talk to is a wake lock with no owner. Two minutes, then out. */
  private val orphanTimeout = Runnable { stopSelf() }

  private var wakeLock: PowerManager.WakeLock? = null
  private var previous: Location? = null
  private var tracking = false
  private var state = State.ACQUIRING

  private var title = ""
  private var acquiringText = ""
  private var trackingText = ""
  private var pausedText = ""
  private var gpsOffText = ""

  /**
   * The one line the hero reads without unlocking, pushed from JS.
   *
   * Native never computes it. The distance the notification shows has to be the distance the
   * panel and the recap show, and that is the reducer's, not a sum of every fix the service
   * accepted — those two numbers are different on purpose (see `src/gps/track.ts`), and a
   * notification quoting the second one would be the app disagreeing with itself in the one
   * place the hero cannot check.
   */
  private var progressText = ""

  private var maxAccuracy = 50f
  private var maxSpeed = 8f
  private var noFixTimeoutMs = 30_000L

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    // The label survives process death; the session's own localized strings do not, so the
    // orphan restart below still has something honest to put in a notification.
    title = applicationInfo.loadLabel(packageManager).toString()
    running = this
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // A null intent is the OS replaying START_STICKY after the process died. Nothing in JS asked
    // for it, and this build buffers nothing, so it must not spend GPS or a wake lock on it.
    if (intent == null) awaitConsumer() else startTracking(intent)
    return START_STICKY
  }

  private fun startTracking(intent: Intent) {
    handler.removeCallbacks(orphanTimeout)
    readOptions(intent)

    // Android 14+ throws SecurityException out of startForeground itself for a location-type
    // service without the grant, and a throw in onStartCommand is a crash rather than an error
    // path. The module checks too; the grant can be revoked between the two.
    if (!hasLocationPermission(this)) {
      fail(ERROR_PERMISSION, "ACCESS_FINE_LOCATION is not granted")
      return
    }

    val manager = getSystemService(Context.LOCATION_SERVICE) as? LocationManager
    if (manager == null || !manager.allProviders.contains(LocationManager.GPS_PROVIDER)) {
      fail(ERROR_NO_PROVIDER, "this device exposes no GPS provider")
      return
    }

    // A second start() replaces the first rather than stacking a listener.
    manager.removeUpdates(this)
    previous = null
    state = if (manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) State.ACQUIRING else State.GPS_OFF

    if (!enterForeground()) return
    acquireWakeLock()

    try {
      manager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 0f, this)
    } catch (error: SecurityException) {
      fail(ERROR_PERMISSION, error.message ?: "location updates refused")
      return
    }
    tracking = true
    emit(EVENT_PROVIDER, mapOf("enabled" to (state != State.GPS_OFF)))
  }

  /**
   * The START_STICKY restart path. The service wears a notification because the restart carries
   * the foreground obligation with it, and does nothing else: no GPS, no wake lock. If a session
   * claims it with start() the timeout is cancelled; otherwise it stops itself. JS picks the
   * session back up through the orphan-resume rule, not through this process.
   */
  private fun awaitConsumer() {
    if (tracking) return
    if (!hasLocationPermission(this) || !enterForeground()) {
      stopSelf()
      return
    }
    state = State.PAUSED
    handler.postDelayed(orphanTimeout, ORPHAN_TIMEOUT_MS)
  }

  private fun readOptions(intent: Intent) {
    title = intent.getStringExtra(EXTRA_TITLE)?.ifEmpty { null } ?: title
    acquiringText = intent.getStringExtra(EXTRA_ACQUIRING).orEmpty()
    trackingText = intent.getStringExtra(EXTRA_TRACKING).orEmpty()
    pausedText = intent.getStringExtra(EXTRA_PAUSED).orEmpty()
    gpsOffText = intent.getStringExtra(EXTRA_GPS_OFF).orEmpty()
    maxAccuracy = intent.getFloatExtra(EXTRA_MAX_ACCURACY, maxAccuracy)
    maxSpeed = intent.getFloatExtra(EXTRA_MAX_SPEED, maxSpeed)
    noFixTimeoutMs = intent.getLongExtra(EXTRA_NO_FIX_TIMEOUT, noFixTimeoutMs)
  }

  override fun onLocationChanged(location: Location) {
    // An unmeasured fix cannot be filtered, and this filter is the only thing between a bad
    // receiver and a distance nobody ran.
    if (!location.hasAccuracy() || location.accuracy > maxAccuracy) return
    if (location.hasSpeed() && location.speed > maxSpeed) return

    val distFromPrev = previous?.distanceTo(location) ?: 0f
    previous = location
    armNoFixTimeout()
    setState(State.TRACKING)

    emit(
      EVENT_LOCATION,
      mapOf(
        "t" to location.time.toDouble(),
        "lat" to location.latitude,
        "lon" to location.longitude,
        "ele" to if (location.hasAltitude()) location.altitude else null,
        "acc" to location.accuracy.toDouble(),
        "speed" to if (location.hasSpeed()) location.speed.toDouble() else null,
        "bearing" to if (location.hasBearing()) location.bearing.toDouble() else null,
        "distFromPrev" to distFromPrev.toDouble(),
      ),
    )
  }

  override fun onProviderDisabled(provider: String) {
    if (provider != LocationManager.GPS_PROVIDER) return
    // The silence is explained; a no-fix event on top of it would say the same thing twice.
    handler.removeCallbacks(noFixTimeout)
    setState(State.GPS_OFF)
    emit(EVENT_PROVIDER, mapOf("enabled" to false))
  }

  override fun onProviderEnabled(provider: String) {
    if (provider != LocationManager.GPS_PROVIDER) return
    setState(State.ACQUIRING)
    emit(EVENT_PROVIDER, mapOf("enabled" to true))
  }

  /**
   * Armed by the first accepted fix and never before it: cold time-to-first-fix on a ROM with no
   * SUPL or PSDS assistance runs into minutes, and a timeout during warm-up would paint "GPS off"
   * over a receiver that is merely starting.
   */
  private fun armNoFixTimeout() {
    handler.removeCallbacks(noFixTimeout)
    handler.postDelayed(noFixTimeout, noFixTimeoutMs)
  }

  private fun onNoFix() {
    setState(State.PAUSED)
    emit(EVENT_NO_FIX, mapOf("sinceLastFixMs" to noFixTimeoutMs.toDouble()))
  }

  private fun setState(next: State) {
    if (state == next) return
    state = next
    renotify()
  }

  private fun renotify() {
    // Dropped without POST_NOTIFICATIONS on API 33+, which costs the text and not the tracking.
    getSystemService(NotificationManager::class.java)?.notify(NOTIFICATION_ID, notification())
  }

  private fun enterForeground(): Boolean =
    try {
      ensureChannel()
      ServiceCompat.startForeground(
        this,
        NOTIFICATION_ID,
        notification(),
        ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
      )
      true
    } catch (error: RuntimeException) {
      // ForegroundServiceStartNotAllowedException (API 31+) and SecurityException (API 34+) both
      // land here, and both mean the same thing to the session: no tracking today.
      fail(ERROR_FOREGROUND, error.message ?: error.javaClass.simpleName)
      false
    }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    // Recreating with the same id renames rather than duplicates, so the channel follows the app
    // language instead of pinning whatever it was first created in.
    val channel = NotificationChannel(CHANNEL_ID, title, NotificationManager.IMPORTANCE_LOW)
    channel.setShowBadge(false)
    getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
  }

  private fun notification(): Notification {
    val text =
      when (state) {
        State.ACQUIRING -> acquiringText
        State.TRACKING -> trackingText
        State.PAUSED -> pausedText
        State.GPS_OFF -> gpsOffText
      }
    // "On the road" alone never changed once a walk had started, so the notification said the
    // same four words for an hour. The ground covered is the only thing about it that moves.
    val line = if (progressText.isEmpty()) text else "$text \u00b7 $progressText"
    return NotificationCompat.Builder(this, CHANNEL_ID)
      // ponytail: a platform drawable, so the module ships no res/. Swap in a monochrome pin the
      // day the notification is worth designing.
      .setSmallIcon(android.R.drawable.ic_menu_mylocation)
      .setContentTitle(title)
      .setContentText(line)
      .setContentIntent(launchIntent())
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()
  }

  /** Tapping the one notification that says the phone is tracking should return to the session. */
  private fun launchIntent(): PendingIntent? {
    val intent = packageManager.getLaunchIntentForPackage(packageName) ?: return null
    return PendingIntent.getActivity(
      this,
      0,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }

  // Held with no timeout on purpose: the session decides when it ends, and Doze during a long
  // climb is exactly what puts a hole in the trace. onDestroy is the release, and the orphan
  // timeout above is what keeps a forgotten service from holding it overnight.
  @SuppressLint("WakelockTimeout")
  private fun acquireWakeLock() {
    if (wakeLock != null) return
    val power = getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
    wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKE_LOCK_TAG).apply { acquire() }
  }

  private fun fail(code: String, message: String) {
    emit(EVENT_ERROR, mapOf("code" to code, "message" to message))
    stopSelf()
  }

  private fun emit(event: String, body: Map<String, Any?>) {
    emitter?.invoke(event, body)
  }

  override fun onDestroy() {
    running = null
    progressText = ""
    handler.removeCallbacksAndMessages(null)
    (getSystemService(Context.LOCATION_SERVICE) as? LocationManager)?.removeUpdates(this)
    tracking = false
    wakeLock?.takeIf { it.isHeld }?.release()
    wakeLock = null
    super.onDestroy()
  }

  companion object {
    /**
     * The JS consumer, set by the module for as long as a JS runtime exists and cleared when it
     * goes. Null is how the service knows an OS restart brought it back with nobody listening.
     */
    @Volatile
    @JvmStatic
    var emitter: ((String, Map<String, Any?>) -> Unit)? = null

    /** The live service, so JS can move the one line the notification shows. Null when stopped. */
    @Volatile
    @JvmStatic
    var running: BatiLocationService? = null

    const val EVENT_LOCATION = "onLocation"
    const val EVENT_PROVIDER = "onProviderEnabled"
    const val EVENT_NO_FIX = "onNoFixTimeout"
    const val EVENT_ERROR = "onError"

    const val ERROR_PERMISSION = "permission"
    const val ERROR_NO_PROVIDER = "provider-missing"
    const val ERROR_FOREGROUND = "foreground-denied"

    const val EXTRA_TITLE = "title"
    const val EXTRA_ACQUIRING = "acquiring"
    const val EXTRA_TRACKING = "tracking"
    const val EXTRA_PAUSED = "paused"
    const val EXTRA_GPS_OFF = "gpsOff"
    const val EXTRA_MAX_ACCURACY = "maxAccuracyM"
    const val EXTRA_MAX_SPEED = "maxSpeedMs"
    const val EXTRA_NO_FIX_TIMEOUT = "noFixTimeoutMs"

    private const val CHANNEL_ID = "bati-location"
    private const val NOTIFICATION_ID = 4711
    private const val WAKE_LOCK_TAG = "bati:location"
    private const val ORPHAN_TIMEOUT_MS = 2 * 60 * 1000L

    /**
     * One implementation for both callers: the module refuses to start without it, the service
     * refuses to go foreground without it, and Android 14+ crashes a location-type service that
     * skips the question.
     */
    /**
     * Move the notification's second half. A no-op when nothing is running, which is what makes
     * it safe to call from a JS flush that raced the hero tapping Done.
     */
    @JvmStatic
    fun setProgress(text: String) {
      val service = running ?: return
      if (service.progressText == text) return
      service.progressText = text
      service.renotify()
    }

    @JvmStatic
    fun hasLocationPermission(context: Context): Boolean =
      ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED
  }
}
