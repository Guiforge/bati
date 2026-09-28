package expo.modules.batireminders

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * What this phone keeps about its reminders, in its own SharedPreferences.
 *
 * Nothing here is decided: the plan arrives whole from JS (`db/reminders.ts`), and the rest is what
 * the hero did with the notifications while the app was closed. None of it travels: neither Bati's
 * backup nor Android's (`plugins/withAndroidBackupRules.js` names the database files only), so a new
 * phone never comes back with a switch on and no permission behind it.
 */
internal class ReminderStore(
  context: Context,
) {
  private val prefs: SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  var enabled: Boolean
    get() = prefs.getBoolean(KEY_ENABLED, false)
    set(value) = prefs.edit { putBoolean(KEY_ENABLED, value) }

  /** The plan as JS sent it: entries, dueToday, quietText, channelName, actionLabels. */
  var plan: JSONObject?
    get() = prefs.getString(KEY_PLAN, null)?.let { runCatching { JSONObject(it) }.getOrNull() }
    set(value) = prefs.edit { putString(KEY_PLAN, value?.toString()) }

  /** The day the plan was made: its `dueToday` speaks for that day and no other. */
  var plannedOn: String?
    get() = prefs.getString(KEY_PLANNED_ON, null)
    set(value) = prefs.edit { putString(KEY_PLANNED_ON, value) }

  /** Local `yyyy-MM-dd` the reminders ring again from, or null when not paused. */
  var resumeDate: String?
    get() = prefs.getString(KEY_RESUME, null)
    set(value) = prefs.edit { putString(KEY_RESUME, value) }

  /** "In 1 hour": the day and the hour it rings again, or null. */
  var snooze: Pair<String, String>?
    get() {
      val date = prefs.getString(KEY_SNOOZE_DATE, null) ?: return null
      val time = prefs.getString(KEY_SNOOZE_TIME, null) ?: return null
      return date to time
    }
    set(value) =
      prefs.edit {
        putString(KEY_SNOOZE_DATE, value?.first)
        putString(KEY_SNOOZE_TIME, value?.second)
      }

  /** The last days that rang, oldest first: `{ date, variant, snoozed, opened, paused }`. */
  fun log(): MutableList<JSONObject> {
    val raw = prefs.getString(KEY_LOG, null) ?: return mutableListOf()
    val array = runCatching { JSONArray(raw) }.getOrNull() ?: return mutableListOf()
    return (0 until array.length()).mapNotNull { array.optJSONObject(it) }.toMutableList()
  }

  fun logged(date: String): Boolean = log().any { it.optString("date") == date }

  /** Adds or updates the day's line, and keeps the last [LOG_SIZE] days. */
  fun updateLog(
    date: String,
    change: (JSONObject) -> Unit,
  ) = synchronized(LOCK) {
    val log = log()
    val entry =
      log.firstOrNull { it.optString("date") == date }
        ?: JSONObject()
          .put("date", date)
          .put("variant", JSONObject.NULL)
          .put("snoozed", false)
          .put("opened", false)
          .put("paused", false)
          .also { log.add(it) }
    change(entry)
    log.sortBy { it.optString("date") }
    val kept = log.takeLast(LOG_SIZE)
    prefs.edit { putString(KEY_LOG, JSONArray(kept).toString()) }
  }

  companion object {
    private const val PREFS = "bati_reminders"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_PLAN = "plan"
    private const val KEY_PLANNED_ON = "plannedOn"
    private const val KEY_RESUME = "resumeDate"
    private const val KEY_SNOOZE_DATE = "snoozeDate"
    private const val KEY_SNOOZE_TIME = "snoozeTime"
    private const val KEY_LOG = "log"
    const val LOG_SIZE = 10

    /** The receiver (main thread) and the module (JS thread) both rewrite the journal. */
    private val LOCK = Any()
  }
}

/** Local calendar arithmetic on `yyyy-MM-dd` and `HH:mm`, in the zone the phone is in now. */
internal object LocalDay {
  private fun dayFormat() = SimpleDateFormat("yyyy-MM-dd", Locale.US)

  fun today(): String = dayFormat().format(Calendar.getInstance().time)

  fun addDays(
    date: String,
    days: Int,
  ): String {
    val cal = Calendar.getInstance()
    cal.time = runCatching { dayFormat().parse(date) }.getOrNull() ?: return date
    cal.add(Calendar.DAY_OF_MONTH, days)
    return dayFormat().format(cal.time)
  }

  /**
   * The instant of `time` on `date` where the phone is now. Computed at every arming, never stored:
   * 20:00 stays 20:00 after a flight. Lenient, so an hour inside a spring-forward gap lands just
   * after it instead of failing.
   */
  fun instant(
    date: String,
    time: String,
  ): Long {
    // A malformed day or hour from JS must not crash a receiver at boot: it lands at epoch 0,
    // which is more than an hour late and so is dropped.
    val (y, m, d) = date.split("-").mapNotNull { it.toIntOrNull() }.takeIf { it.size == 3 } ?: return 0
    val (h, min) = time.split(":").mapNotNull { it.toIntOrNull() }.takeIf { it.size == 2 } ?: return 0
    val cal = Calendar.getInstance()
    cal.isLenient = true
    cal.clear()
    cal.set(y, m - 1, d, h, min, 0)
    return cal.timeInMillis
  }

  /** Local midnight at the end of `date`, when a forgotten notification clears itself. */
  fun endOf(date: String): Long = instant(addDays(date, 1), "00:00")

  fun timeOf(millis: Long): String = SimpleDateFormat("HH:mm", Locale.US).format(millis)
}
