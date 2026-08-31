package expo.modules.batilocation

import android.content.Context
import android.location.LocationManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Google-free location, from `LocationManager` and nothing else.
 *
 * `expo-location` links `play-services-location` and calls `getFusedLocationProviderClient()`
 * in its `OnCreate`: on a phone without Google Play Services that returns nothing, silently,
 * and `isGooglePlayServicesAvailable()` reports SUCCESS under microG anyway. Seven open-source
 * Android tracking apps all talk to `LocationManager.GPS_PROVIDER` directly. So does this.
 *
 * Skeleton on purpose. `hasGpsProvider()` is the whole surface: enough to prove the module is
 * autolinked, compiled and callable from JS through an F-Droid-style build from source. The
 * foreground service, the 1 Hz listener and the event stream land next, once that is proven.
 */
class BatiLocationModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BatiLocation")

    Function("hasGpsProvider") {
      val context = appContext.reactContext ?: return@Function false
      val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
      manager?.allProviders?.contains(LocationManager.GPS_PROVIDER) == true
    }
  }
}
