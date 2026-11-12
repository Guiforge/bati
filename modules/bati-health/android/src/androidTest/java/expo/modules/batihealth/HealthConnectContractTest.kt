package expo.modules.batihealth

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseRouteResult
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import expo.modules.kotlin.exception.CodedException
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.reflect.KClass

/**
 * Proves the fake Health Connect of the jest suites (`__tests__/helpers/fakeHealthConnect.ts`)
 * tells the truth, by running the module's own write and delete code against the real one:
 * write, write again (update, not duplicate, an equal version included), an older version ignored, delete by client id,
 * a record in the past, a distance, a route, a distance taken back, a refused record.
 *
 * Android 14+ only (Health Connect in the system). Run: `scripts/health-connect-contract.sh`.
 */
@RunWith(AndroidJUnit4::class)
class HealthConnectContractTest {
  private val context = InstrumentationRegistry.getInstrumentation().targetContext
  private val client = HealthConnectClient.getOrCreate(context)
  private val id = "bati-contract-${System.nanoTime()}"

  @Before
  fun grant() {
    val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
    for (permission in listOf(
      "WRITE_EXERCISE",
      "WRITE_DISTANCE",
      "WRITE_EXERCISE_ROUTE",
      "READ_EXERCISE",
      "READ_DISTANCE",
      "READ_EXERCISE_ROUTES",
    )) {
      automation.grantRuntimePermission(context.packageName, "android.permission.health.$permission")
    }
  }

  @After
  fun clean() = runBlocking { deleteIds(client, listOf(id, "$id-distance")) }

  private fun record(
    version: Long,
    title: String = "Le Réveil de l'Écuyer",
    start: Instant = Instant.now().minus(2, ChronoUnit.HOURS).truncatedTo(ChronoUnit.SECONDS),
    outing: Boolean = false,
    meters: Double? = null,
    route: Int = 0,
    badSegment: Boolean = false,
  ): JSONObject {
    val end = start.plusSeconds(600)
    val segments = JSONArray()
    if (!outing) {
      val segStart = if (badSegment) end.toEpochMilli() else start.toEpochMilli()
      segments.put(JSONObject(mapOf("start" to segStart, "end" to segStart + 60_000, "type" to 51, "reps" to 15)))
    }
    return JSONObject().apply {
      put("id", id)
      put("version", version)
      put("exerciseType", if (outing) 56 else 13)
      put("title", title)
      put("notes", JSONObject.NULL)
      put("start", start.toEpochMilli())
      put("end", end.toEpochMilli())
      put("offsetMinutes", 60)
      put("segments", segments)
      put(
        "distance",
        if (meters ==
          null
        ) {
          JSONObject.NULL
        } else {
          JSONObject(mapOf("id" to "$id-distance", "meters" to meters))
        },
      )
      put(
        "route",
        if (route == 0) {
          JSONObject.NULL
        } else {
          JSONArray(
            (0 until route).map { i ->
              JSONObject(
                mapOf(
                  "t" to start.toEpochMilli() + i * 10_000L,
                  "lat" to 45.75 + i * 1e-4,
                  "lon" to 4.85 + i * 1e-4,
                ),
              )
            },
          )
        },
      )
    }
  }

  private fun <T : Record> held(
    type: KClass<T>,
    clientId: String,
  ): List<T> =
    runBlocking {
      client
        .readRecords(ReadRecordsRequest(type, TimeRangeFilter.after(Instant.EPOCH)))
        .records
        .filter { it.metadata.clientRecordId == clientId }
    }

  @Test
  fun writeAgainUpdatesInPlace_andAnOlderVersionIsIgnored() =
    runBlocking {
      upsertJson(client, record(version = 0, title = "first"))
      upsertJson(client, record(version = 1000, title = "corrected"))
      upsertJson(client, record(version = 500, title = "older"))
      var sessions = held(ExerciseSessionRecord::class, id)
      assertEquals(1, sessions.size)
      assertEquals("corrected", sessions[0].title)
      // An equal version replaces too (the docs say "higher"; this is what the device does).
      // Still one record: a retry after a kill rewrites the same content in place.
      upsertJson(client, record(version = 1000, title = "same version"))
      sessions = held(ExerciseSessionRecord::class, id)
      assertEquals(1, sessions.size)
      assertEquals("same version", sessions[0].title)
      assertEquals(1000L, sessions[0].metadata.clientRecordVersion)
      assertEquals(15, sessions[0].segments[0].repetitions)
    }

  @Test
  fun deleteByClientId_andAnUnknownIdIsFine() =
    runBlocking {
      upsertJson(client, record(version = 0, outing = true, meters = 5120.0))
      deleteIds(client, listOf(id, "$id-distance", "bati-never-written"))
      assertTrue(held(ExerciseSessionRecord::class, id).isEmpty())
      assertTrue(held(DistanceRecord::class, "$id-distance").isEmpty())
    }

  @Test
  fun writesInThePast() =
    runBlocking {
      val past = Instant.now().minus(200, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS)
      upsertJson(client, record(version = 0, start = past))
      assertEquals(past, held(ExerciseSessionRecord::class, id).single().startTime)
    }

  @Test
  fun anOutingIsItsTypePlusADistance_takenBackWhenTheDistanceGoes() =
    runBlocking {
      upsertJson(client, record(version = 0, outing = true, meters = 5120.0))
      assertEquals(56, held(ExerciseSessionRecord::class, id).single().exerciseType)
      assertEquals(5120.0, held(DistanceRecord::class, "$id-distance").single().distance.inMeters, 0.01)

      upsertJson(client, record(version = 1, outing = true, meters = 5300.0))
      assertEquals(5300.0, held(DistanceRecord::class, "$id-distance").single().distance.inMeters, 0.01)

      upsertJson(client, record(version = 2, outing = true, meters = null))
      assertEquals(1, held(ExerciseSessionRecord::class, id).size)
      assertTrue(held(DistanceRecord::class, "$id-distance").isEmpty())
    }

  @Test
  fun aRouteIsWrittenWithTheSession() =
    runBlocking {
      upsertJson(client, record(version = 0, outing = true, meters = 300.0, route = 12))
      val result = held(ExerciseSessionRecord::class, id).single().exerciseRouteResult
      assertTrue("route result: $result", result is ExerciseRouteResult.Data)
      val points = (result as ExerciseRouteResult.Data).exerciseRoute.route
      assertEquals(12, points.size)
      assertNull(points[0].altitude)
    }

  @Test
  fun aRecordWithASegmentOutsideTheSessionIsRefused() =
    runBlocking {
      try {
        upsertJson(client, record(version = 0, badSegment = true))
        fail("Health Connect took a segment outside its session")
      } catch (e: CodedException) {
        assertEquals(REFUSED, e.code)
      }
      assertTrue(held(ExerciseSessionRecord::class, id).isEmpty())
    }
}
