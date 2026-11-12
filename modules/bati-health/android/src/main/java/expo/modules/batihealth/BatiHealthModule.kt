package expo.modules.batihealth

import android.content.Context
import android.content.Intent
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
      Function("sdkStatus") { HealthConnectClient.getSdkStatus(context) }

      AsyncFunction("hasWritePermission") { promise: Promise ->
        settle(promise) { client().permissionController.getGrantedPermissions().contains(WRITE_EXERCISE) }
      }

      // Starts Health Connect's own permission screen and returns: the answer is read with
      // `hasWritePermission` once the app is back (modules/bati-health/index.ts). Expo's
      // activity-result registry never delivered this result on API 35, and a screen that waits
      // for an answer that never comes leaves the switch stuck.
      Function("launchPermissionRequest") {
        val activity = appContext.currentActivity ?: return@Function false
        val intent =
          PermissionController.createRequestPermissionResultContract().createIntent(activity, setOf(WRITE_EXERCISE))
        // For result, though the result is not read: Health Connect identifies the asking app by
        // its calling package, which a plain startActivity does not carry.
        activity.runOnUiThread { activity.startActivityForResult(intent, PERMISSION_REQUEST_CODE) }
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
        context.startActivity(intent)
        true
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
