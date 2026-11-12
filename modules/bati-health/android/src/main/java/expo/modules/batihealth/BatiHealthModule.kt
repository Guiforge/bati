package expo.modules.batihealth

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSegment
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.metadata.Device
import androidx.health.connect.client.records.metadata.Metadata
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneOffset

private val WRITE_EXERCISE = HealthPermission.getWritePermission(ExerciseSessionRecord::class)
private const val PERMISSION_REQUEST_CODE = 0x4843

/**
 * The native half of the Health Connect export (W-04): write one exercise session, delete some,
 * and the permission. Every decision (which session, which version, which segment) is made in JS,
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
        settle(promise) { client().permissionController.getGrantedPermissions().contains(WRITE_EXERCISE) }
      }

      // Asks for the permission and returns: the answer is read with `hasWritePermission` once the
      // app is back (modules/bati-health/index.ts). From Android 14 a health permission is a runtime
      // permission like any other, asked with `requestPermissions`; the client's contract hands back
      // androidx's REQUEST_PERMISSIONS intent there, which only a ComponentActivity registry turns
      // into that call, and started as it is it crashes the app. Up to Android 13 the contract's
      // intent is Health Connect's own screen, started for result so it can see who asks.
      Function("launchPermissionRequest") {
        val activity = appContext.currentActivity ?: return@Function false
        activity.runOnUiThread {
          try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
              activity.requestPermissions(arrayOf(WRITE_EXERCISE), PERMISSION_REQUEST_CODE)
            } else {
              val intent =
                PermissionController.createRequestPermissionResultContract().createIntent(
                  activity,
                  setOf(WRITE_EXERCISE),
                )
              activity.startActivityForResult(intent, PERMISSION_REQUEST_CODE)
            }
          } catch (e: ActivityNotFoundException) {
            // Nothing to show the screen: the switch stays off, and says so.
          }
        }
        true
      }

      // Inserts, or updates the record with the same client id when `version` is higher: Health
      // Connect keeps the highest client record version and ignores an equal one.
      AsyncFunction("upsertSession") { json: String, promise: Promise ->
        settle(promise) {
          client().insertRecords(listOf(sessionRecord(JSONObject(json))))
          null
        }
      }

      AsyncFunction("deleteSessions") { clientIds: List<String>, promise: Promise ->
        settle(promise) {
          client().deleteRecords(ExerciseSessionRecord::class, emptyList(), clientIds)
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

private fun sessionRecord(json: JSONObject): ExerciseSessionRecord {
  val offset = ZoneOffset.ofTotalSeconds(json.getInt("offsetMinutes") * 60)
  val segments = json.getJSONArray("segments")
  return ExerciseSessionRecord(
    startTime = Instant.ofEpochMilli(json.getLong("start")),
    startZoneOffset = offset,
    endTime = Instant.ofEpochMilli(json.getLong("end")),
    endZoneOffset = offset,
    metadata =
      Metadata.activelyRecorded(
        device = Device(type = Device.TYPE_PHONE),
        clientRecordId = json.getString("id"),
        clientRecordVersion = json.getLong("version"),
      ),
    exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_CALISTHENICS,
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
  )
}
