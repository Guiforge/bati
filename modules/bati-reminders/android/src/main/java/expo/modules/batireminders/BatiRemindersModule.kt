package expo.modules.batireminders

import android.app.TimePickerDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.text.format.DateFormat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/**
 * The JS door to local reminders (docs/designs/rappels.md). It stores what it is handed, arms it
 * and posts it; every rule is `planReminders` in `db/reminders.ts`, a unit test rather than a
 * device check.
 *
 * Strings cross as JSON: the plan is kept as JSON anyway, and a Record for a list of entries would
 * only be converted back to it.
 */
class BatiRemindersModule : Module() {
  private val context: Context?
    get() = appContext.reactContext?.applicationContext

  override fun definition() =
    ModuleDefinition {
      Name("BatiReminders")

      // The hero tapped a reminder: the activity was started with its day. Read at every way back
      // into the app, and on `getState`, which the plan calls first at a cold start.
      OnNewIntent { intent -> markOpened(intent) }
      OnActivityEntersForeground { appContext.currentActivity?.intent?.let(::markOpened) }

      /** The next days of reminders, whole. See `ReminderPlan` in `db/reminders.ts`. */
      Function("setPlan") { json: String ->
        val context = context ?: return@Function false
        val plan = JSONObject(json)
        val store = ReminderStore(context)
        store.plan = plan
        store.plannedOn = LocalDay.today()
        // "no": today is done or a rest day, so a snooze in waiting goes. "hold" keeps it waiting.
        if (plan.optString("dueToday") == "no") store.snooze = null
        ReminderScheduler.ensureChannel(context, plan.optString("channelName", "Reminders"))
        ReminderScheduler.arm(context)
        true
      }

      /** The switch, which lives on this phone only and is off until the hero turns it on. */
      Function("setEnabled") { enabled: Boolean ->
        val context = context ?: return@Function false
        val store = ReminderStore(context)
        store.enabled = enabled
        if (!enabled) store.snooze = null
        ReminderScheduler.arm(context)
        true
      }

      /** A pause from Settings: `resumeDate` is local `yyyy-MM-dd`, and it rings again that day. */
      Function("pause") { resumeDate: String ->
        val context = context ?: return@Function false
        val store = ReminderStore(context)
        store.resumeDate = resumeDate
        store.snooze = null
        ReminderScheduler.arm(context)
        true
      }

      Function("resume") {
        val context = context ?: return@Function false
        ReminderStore(context).resumeDate = null
        ReminderScheduler.arm(context)
        true
      }

      /** `{ enabled, resumeDate, log }`, as JSON. */
      Function("getState") {
        val context = context ?: return@Function null
        appContext.currentActivity?.intent?.let(::markOpened)
        val store = ReminderStore(context)
        JSONObject()
          .put("enabled", store.enabled)
          .put("resumeDate", store.resumeDate ?: JSONObject.NULL)
          .put("log", JSONArray(store.log()))
          .toString()
      }

      /** Android's own "24-hour time" setting, which the hour is written in everywhere. */
      Function("is24Hour") {
        val context = context ?: return@Function true
        DateFormat.is24HourFormat(context)
      }

      /**
       * Android's own time picker, in the phone's 12 or 24 hour format, resolving `"HH:mm"` or null
       * when dismissed. Here rather than a picker package: this module already exists, and the
       * dialog is the platform's.
       */
      AsyncFunction("pickTime") { initial: String, promise: Promise ->
        val activity = appContext.currentActivity
        if (activity == null) {
          promise.resolve(null)
          return@AsyncFunction
        }
        val (hour, minute) =
          initial.split(":").mapNotNull { it.toIntOrNull() }.takeIf { it.size == 2 } ?: listOf(18, 0)
        activity.runOnUiThread {
          var answered = false
          val dialog =
            TimePickerDialog(
              activity,
              android.R.style.Theme_Material_Dialog_Alert,
              { _, h, m ->
                answered = true
                promise.resolve(String.format(Locale.US, "%02d:%02d", h, m))
              },
              hour,
              minute,
              DateFormat.is24HourFormat(activity),
            )
          dialog.setOnDismissListener { if (!answered) promise.resolve(null) }
          dialog.show()
        }
      }.runOnQueue(Queues.MAIN)

      /**
       * The reminders' own channel in Android's settings, where the hero sets sound and vibration.
       * The app's notification page below API 26, which has no channels.
       */
      Function("openChannelSettings") {
        val activity = appContext.currentActivity ?: return@Function false
        val intent =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
              .putExtra(Settings.EXTRA_APP_PACKAGE, activity.packageName)
              .putExtra(Settings.EXTRA_CHANNEL_ID, ReminderScheduler.CHANNEL_ID)
          } else {
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${activity.packageName}"))
          }
        ReminderScheduler.ensureChannel(
          activity,
          ReminderStore(activity).plan?.optString("channelName", "Reminders") ?: "Reminders",
        )
        activity.startActivity(intent)
        true
      }

      /** The permission is granted and the channel is not switched off. */
      Function("areEnabled") {
        val context = context ?: return@Function false
        ReminderScheduler.areEnabled(context)
      }
    }

  private fun markOpened(intent: Intent) {
    val date = intent.getStringExtra(ReminderScheduler.EXTRA_DATE) ?: return
    val context = context ?: return
    // Relaunched from Recents after the process died, the task hands its first intent back, extra
    // and all: that is not a tap on today's reminder.
    if (intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY != 0) return
    val store = ReminderStore(context)
    // Only a day that rang: a tap on a day already trimmed from the journal adds nothing to it.
    if (store.logged(date)) store.updateLog(date) { it.put("opened", true) }
    // Once: the activity keeps its intent across a rotation or a return from the background.
    intent.removeExtra(ReminderScheduler.EXTRA_DATE)
  }
}
