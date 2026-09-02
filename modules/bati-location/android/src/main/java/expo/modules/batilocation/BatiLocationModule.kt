package expo.modules.batilocation

import android.Manifest
import android.content.Context
import android.content.Intent
import android.location.LocationManager
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/**
 * Google-free location, from `LocationManager` and nothing else.
 *
 * `expo-location` links `play-services-location` and calls `getFusedLocationProviderClient()`
 * in its `OnCreate`: on a phone without Google Play Services that returns nothing, silently,
 * and `isGooglePlayServicesAvailable()` reports SUCCESS under microG anyway. Seven open-source
 * Android tracking apps all talk to `LocationManager.GPS_PROVIDER` directly. So does this.
 *
 * This half is a remote control: it starts and stops [BatiLocationService] and forwards what the
 * service emits. The tracking loop and every filter live there, because a filter in JS would
 * leave the service measuring `distFromPrev` from fixes JS had already discarded.
 */
class BatiLocationModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BatiLocation")

    Events(
      BatiLocationService.EVENT_LOCATION,
      BatiLocationService.EVENT_PROVIDER,
      BatiLocationService.EVENT_NO_FIX,
      BatiLocationService.EVENT_ERROR,
    )

    // The service's only route back to JS, opened and closed with the runtime it points at: a
    // reload leaves a service holding a callback into a dead Hermes otherwise, and its absence
    // is also how a restarted service knows nobody is listening.
    OnCreate {
      BatiLocationService.emitter = { event, body -> sendEvent(event, body) }
    }

    OnDestroy {
      BatiLocationService.emitter = null
    }

    /**
     * The ground covered, as the hero's own screen phrases it: unit preference, language, and the
     * reducer's distance rather than a native sum of every fix. Native owns no strings here for
     * the same reason it owns none in the notification's four states.
     */
    Function("setProgress") { text: String ->
      BatiLocationService.setProgress(text)
    }

    /** Marks the goal reached; see `BatiLocationService.setReached` for what that changes. */
    Function("setReached") {
      BatiLocationService.setReached()
    }

    Function("hasGpsProvider") {
      val context = appContext.reactContext ?: return@Function false
      val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
      manager?.allProviders?.contains(LocationManager.GPS_PROVIDER) == true
    }

    AsyncFunction("requestPermission") { promise: Promise ->
      // Both, together: from API 31 Android refuses a FINE-only request outright. A hero who
      // answers "approximate" grants COARSE alone, which the resolved status reports as
      // undetermined rather than granted — precise location is the feature.
      Permissions.askForPermissionsWithPermissionsManager(
        appContext.permissions,
        promise,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
      )
    }

    /**
     * The notification permission, asked for on its own and never bundled with the location pair.
     *
     * From API 33 the foreground-service notification is invisible without it, and the whole
     * pocket promise is that an expedition says the rest through that notification. But a hero who
     * refuses it has still granted the thing the feature needs, so a combined request would have
     * one refusal veto the other. Below API 33 there is nothing to ask and the manager resolves
     * granted.
     */
    AsyncFunction("requestNotificationPermission") { promise: Promise ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
        promise.resolve(
          bundleOf(
            "status" to "granted",
            "expires" to "never",
            "granted" to true,
            "canAskAgain" to true,
          ),
        )
        return@AsyncFunction
      }
      Permissions.askForPermissionsWithPermissionsManager(
        appContext.permissions,
        promise,
        Manifest.permission.POST_NOTIFICATIONS,
      )
    }

    /**
     * False plus an `onError` event rather than a throw: on Android 14+ a location-type
     * foreground service started without the grant raises SecurityException, and a session
     * screen has somewhere to put an error event and nowhere to put an exception.
     */
    Function("start") { options: StartOptions ->
      val context = appContext.reactContext
      if (context == null) {
        sendEvent(
          BatiLocationService.EVENT_ERROR,
          mapOf("code" to ERROR_NO_CONTEXT, "message" to "no React context to start the service from"),
        )
        return@Function false
      }
      if (!BatiLocationService.hasLocationPermission(context)) {
        sendEvent(
          BatiLocationService.EVENT_ERROR,
          mapOf(
            "code" to BatiLocationService.ERROR_PERMISSION,
            "message" to "ACCESS_FINE_LOCATION is not granted",
          ),
        )
        return@Function false
      }
      ContextCompat.startForegroundService(context, options.toIntent(context))
      true
    }

    Function("stop") {
      val context = appContext.reactContext
      // stopService rather than a stop action: it is allowed from the background whatever the
      // service's state, and onDestroy is the single place that releases the wake lock.
      context?.stopService(Intent(context, BatiLocationService::class.java))
    }
  }

  companion object {
    const val ERROR_NO_CONTEXT = "no-context"
  }
}

/** The words on the notification, localized by JS — this module owns no strings. */
class NotificationOptions : Record {
  @Field val title: String = ""

  @Field val acquiring: String = ""

  @Field val tracking: String = ""

  @Field val paused: String = ""

  @Field val gpsOff: String = ""

  @Field val reached: String = ""
}

class StartOptions : Record {
  @Field val notification: NotificationOptions = NotificationOptions()

  /** Metres. Above this a fix is dropped before it can become the anchor of the next distance. */
  @Field val maxAccuracyM: Double = 50.0

  /** Metres per second — a parameter because a bike downhill is not a run. */
  @Field val maxSpeedMs: Double = 8.0

  /** Milliseconds of silence after the first fix before the session is told the signal is gone. */
  @Field val noFixTimeoutMs: Double = 30_000.0

  fun toIntent(context: Context): Intent =
    Intent(context, BatiLocationService::class.java).apply {
      putExtra(BatiLocationService.EXTRA_TITLE, notification.title)
      putExtra(BatiLocationService.EXTRA_ACQUIRING, notification.acquiring)
      putExtra(BatiLocationService.EXTRA_TRACKING, notification.tracking)
      putExtra(BatiLocationService.EXTRA_PAUSED, notification.paused)
      putExtra(BatiLocationService.EXTRA_GPS_OFF, notification.gpsOff)
      putExtra(BatiLocationService.EXTRA_REACHED, notification.reached)
      putExtra(BatiLocationService.EXTRA_MAX_ACCURACY, maxAccuracyM.toFloat())
      putExtra(BatiLocationService.EXTRA_MAX_SPEED, maxSpeedMs.toFloat())
      putExtra(BatiLocationService.EXTRA_NO_FIX_TIMEOUT, noFixTimeoutMs.toLong())
    }
}
