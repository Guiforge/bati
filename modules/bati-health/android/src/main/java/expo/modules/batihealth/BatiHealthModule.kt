package expo.modules.batihealth

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseRoute
import androidx.health.connect.client.records.ExerciseSegment
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.metadata.Device
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.units.Length
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneOffset

private val WRITE_EXERCISE = HealthPermission.getWritePermission(ExerciseSessionRecord::class)
private val WRITE_DISTANCE = HealthPermission.getWritePermission(DistanceRecord::class)
private const val WRITE_ROUTE = HealthPermission.PERMISSION_WRITE_EXERCISE_ROUTE

/** What the main switch asks for, together. The route is asked alone, by its own option. */
private val MAIN_PERMISSIONS = setOf(WRITE_EXERCISE, WRITE_DISTANCE)
private const val PERMISSION_REQUEST_CODE = 0x4843

/** Health Connect refused the record itself: JS marks it failed instead of retrying (`HealthRefused`). */
private const val REFUSED = "ERR_HEALTH_REFUSED"

/**
 * The native half of the Health Connect export (W-04): write one exercise session (with an outing's
 * distance and, when asked, its route), delete some, and the permissions. Every decision (which session, which version, which segment) is made in JS,
 * `src/healthExport/`; this file only builds the record it is handed.
 */
class BatiHealthModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("no context")

  private fun client() = HealthConnectClient.getOrCreate(context)

  /** Runs `block` off the JS thread and settles the promise with it, whatever happens. */
  private fun settle(
    promise: Promise,
    block: suspend () -> Any?,
  ) {
    appContext.backgroundCoroutineScope.launch {
      try {
        promise.resolve(block())
      } catch (e: CodedException) {
        // Keeps its code: ERR_HEALTH_REFUSED is how JS tells a refusal from a bad moment.
        promise.reject(e)
      } catch (e: Exception) {
        promise.reject(CodedException(e.message ?: e.javaClass.simpleName, e))
      }
    }
  }

  override fun definition() =
    ModuleDefinition {
      Name("BatiHealth")

      // 1 unavailable (below Android 9, or no provider), 2 provider to install or update, 3 ready.
      // Never throws into JS: it runs before every quiet sync. 1 = SDK_UNAVAILABLE.
      Function("sdkStatus") { runCatching { HealthConnectClient.getSdkStatus(context) }.getOrDefault(1) }

      AsyncFunction("hasWritePermission") { promise: Promise ->
        settle(promise) { client().permissionController.getGrantedPermissions().containsAll(MAIN_PERMISSIONS) }
      }

      AsyncFunction("hasRoutePermission") { promise: Promise ->
        settle(promise) { client().permissionController.getGrantedPermissions().contains(WRITE_ROUTE) }
      }

      // Asks for the permission and returns: the answer is read with `hasWritePermission` once the
      // app is back (modules/bati-health/index.ts). From Android 14 a health permission is a runtime
      // permission like any other, asked with `requestPermissions`; the client's contract hands back
      // androidx's REQUEST_PERMISSIONS intent there, which only a ComponentActivity registry turns
      // into that call, and started as it is it crashes the app. Up to Android 13 the contract's
      // intent is Health Connect's own screen, started for result so it can see who asks.
      Function("launchPermissionRequest") { route: Boolean ->
        val activity = appContext.currentActivity ?: return@Function false
        val asked = if (route) setOf(WRITE_ROUTE) else MAIN_PERMISSIONS
        activity.runOnUiThread {
          try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
              activity.requestPermissions(asked.toTypedArray(), PERMISSION_REQUEST_CODE)
            } else {
              val intent =
                PermissionController.createRequestPermissionResultContract().createIntent(
                  activity,
                  asked,
                )
              activity.startActivityForResult(intent, PERMISSION_REQUEST_CODE)
            }
          } catch (e: ActivityNotFoundException) {
            // Nothing to show the screen: the switch stays off, and says so.
          }
        }
        true
      }

      // Inserts, or updates the records with the same client ids when `version` is higher: Health
      // Connect keeps the highest client record version and ignores an equal one. The session and
      // its distance go in one request; an outing whose distance went away takes it back.
      AsyncFunction("upsertSession") { json: String, promise: Promise ->
        settle(promise) {
          val record = JSONObject(json)
          val records = refusedOnBadData { recordsOf(record) }
          refusedOnBadData { client().insertRecords(records) }
          if (record.isNull("distance")) {
            client().deleteRecords(DistanceRecord::class, emptyList(), listOf("${record.getString("id")}-distance"))
          }
          null
        }
      }

      // Client ids of both kinds: a session's and its distance's. An id Health Connect lacks is fine.
      AsyncFunction("deleteSessions") { clientIds: List<String>, promise: Promise ->
        settle(promise) {
          client().deleteRecords(ExerciseSessionRecord::class, emptyList(), clientIds)
          client().deleteRecords(DistanceRecord::class, emptyList(), clientIds)
          null
        }
      }

      Function("openSettings") {
        val intent =
          Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        // Called from a tap: a missing settings activity must not reach JS as an uncaught error.
        runCatching { context.startActivity(intent) }.isSuccess
      }
    }
}

/**
 * A record's constructor `require()`s what Health Connect would refuse (segments overlapping or
 * outside the session, a route point outside it, a distance over 1,000 km), and the service throws
 * the same for what it checks itself: that is the record's fault, not the moment's.
 */
private inline fun <T> refusedOnBadData(block: () -> T): T =
  try {
    block()
  } catch (e: IllegalArgumentException) {
    throw CodedException(REFUSED, e.message ?: "refused", e)
  }

private fun recordsOf(json: JSONObject): List<Record> {
  val session = sessionRecord(json)
  if (json.isNull("distance")) return listOf(session)
  val distance = json.getJSONObject("distance")
  return listOf(
    session,
    DistanceRecord(
      startTime = session.startTime,
      startZoneOffset = session.startZoneOffset,
      endTime = session.endTime,
      endZoneOffset = session.endZoneOffset,
      distance = Length.meters(distance.getDouble("meters")),
      metadata = metadataOf(distance.getString("id"), json.getLong("version")),
    ),
  )
}

private fun metadataOf(
  clientRecordId: String,
  version: Long,
) = Metadata.activelyRecorded(
  device = Device(type = Device.TYPE_PHONE),
  clientRecordId = clientRecordId,
  clientRecordVersion = version,
)

/** Time and position only: no altitude, no accuracy, no speed. */
private fun routeOf(json: JSONObject): ExerciseRoute? {
  if (json.isNull("route")) return null
  val points = json.getJSONArray("route")
  return ExerciseRoute(
    (0 until points.length()).map { i ->
      val p = points.getJSONObject(i)
      ExerciseRoute.Location(
        time = Instant.ofEpochMilli(p.getLong("t")),
        latitude = p.getDouble("lat"),
        longitude = p.getDouble("lon"),
      )
    },
  )
}

private fun sessionRecord(json: JSONObject): ExerciseSessionRecord {
  val offset = ZoneOffset.ofTotalSeconds(json.getInt("offsetMinutes") * 60)
  val segments = json.getJSONArray("segments")
  return ExerciseSessionRecord(
    startTime = Instant.ofEpochMilli(json.getLong("start")),
    startZoneOffset = offset,
    endTime = Instant.ofEpochMilli(json.getLong("end")),
    endZoneOffset = offset,
    metadata = metadataOf(json.getString("id"), json.getLong("version")),
    exerciseType = json.getInt("exerciseType"),
    title = json.getString("title"),
    notes = if (json.isNull("notes")) null else json.getString("notes"),
    segments =
      (0 until segments.length()).map { i ->
        val s = segments.getJSONObject(i)
        ExerciseSegment(
          startTime = Instant.ofEpochMilli(s.getLong("start")),
          endTime = Instant.ofEpochMilli(s.getLong("end")),
          segmentType = s.getInt("type"),
          repetitions = s.getInt("reps"),
        )
      },
    laps = emptyList(),
    exerciseRoute = routeOf(json),
  )
}
