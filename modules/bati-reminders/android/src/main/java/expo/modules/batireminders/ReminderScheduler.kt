package expo.modules.batireminders

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject

/**
 * Arms the next reminder and posts it when it comes. Decides nothing the plan did not say: which
 * days ring, at what hour and with which words all come from `planReminders` in `db/reminders.ts`.
 *
 * What it does own is what has to happen with the app closed: the horizon counted from the end of a
 * pause tapped on the notification, a day already in the journal never ringing twice, a reminder
 * more than an hour late being dropped rather than caught up, and the two actions.
 *
 * `setAndAllowWhileIdle`, never an exact alarm: it rings in Doze, a few minutes late at worst, which
 * a reminder does not mind. `SCHEDULE_EXACT_ALARM` is denied by default since Android 14 and
 * `USE_EXACT_ALARM` is for alarm clocks. No battery-optimisation exemption either, Play restricts it.
 */
internal object ReminderScheduler {
  /** Days armed ahead, counted from the plan's day or the end of a pause, whichever is later. */
  const val HORIZON_DAYS = 14

  /** A reminder later than this after its hour is dropped (phone off, reboot), never caught up. */
  private const val LATE_MS = 60 * 60 * 1000L

  /** "In 1 hour". */
  private const val SNOOZE_MS = 60 * 60 * 1000L

  /** "In 1 hour" is not offered on a reminder posted from this hour on: it would cross midnight. */
  private const val LAST_SNOOZE_HOUR = 23

  const val PAUSE_DAYS = 7
  const val CHANNEL_ID = "bati-reminders"
  const val ACTION_ALARM = "expo.modules.batireminders.ALARM"
  const val ACTION_SNOOZE = "expo.modules.batireminders.SNOOZE"
  const val ACTION_PAUSE = "expo.modules.batireminders.PAUSE"

  /** The reminder's day, on the tap and on both actions: yesterday's button must not act on today. */
  const val EXTRA_DATE = "batiReminderDate"

  private class Due(
    val date: String,
    val at: Long,
    val entry: JSONObject?,
  ) {
    val snooze get() = entry == null
  }

  /** The entries this phone may still post: switched on, inside the horizon, not paused. */
  private fun postable(store: ReminderStore): List<JSONObject> {
    if (!store.enabled) return emptyList()
    val entries = store.plan?.optJSONArray("entries") ?: return emptyList()
    val today = LocalTime.today()
    val from = maxOf(store.plannedOn ?: today, store.resumeDate ?: "")
    val until = LocalTime.addDays(from, HORIZON_DAYS)
    return (0 until entries.length())
      .mapNotNull { entries.optJSONObject(it) }
      .filter {
        val date = it.optString("date")
        date >= from && date < until
      }
  }

  /**
   * The next thing to ring, or null. A snooze waits while a session holds today. Nothing at or before
   * `handled` is offered again: the alarm that just went off is done with it, posted or refused.
   */
  private fun next(
    context: Context,
    now: Long,
    handled: Long = Long.MIN_VALUE,
  ): Due? {
    val store = ReminderStore(context)
    val today = LocalTime.today()
    val candidates = mutableListOf<Due>()

    val snooze = store.snooze
    val paused = (store.resumeDate ?: "") > today
    if (snooze != null && store.enabled && !paused && snooze.first == today && dueToday(store) == "yes") {
      candidates.add(Due(today, LocalTime.instant(snooze.first, snooze.second), null))
    }
    for (entry in postable(store)) {
      val date = entry.optString("date")
      if (store.logged(date)) continue
      val at = LocalTime.instant(date, entry.optString("time"))
      if (at + LATE_MS < now) continue
      candidates.add(Due(date, at, entry))
    }
    return candidates.filter { it.at > handled }.minByOrNull { it.at }
  }

  /** What the plan said about today, and only if it was made today. */
  private fun dueToday(store: ReminderStore): String =
    if (store.plannedOn == LocalTime.today()) store.plan?.optString("dueToday", "yes") ?: "yes" else "yes"

  private fun alarmIntent(context: Context): PendingIntent =
    PendingIntent.getBroadcast(
      context,
      0,
      Intent(context, ReminderReceiver::class.java).setAction(ACTION_ALARM),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  /** One alarm, for the next thing to ring, replacing whatever was armed. */
  fun arm(
    context: Context,
    handled: Long = Long.MIN_VALUE,
  ) {
    val manager = context.getSystemService(AlarmManager::class.java) ?: return
    val now = System.currentTimeMillis()
    val due = next(context, now, handled)
    if (due == null) {
      manager.cancel(alarmIntent(context))
      return
    }
    manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, maxOf(due.at, now), alarmIntent(context))
  }

  /**
   * The alarm went off: post what is due, if anything still is, then arm the next one. Whatever was
   * due is handled either way: a reminder Android refused, or a snooze with nothing left to say, is
   * not armed again a second later, which would loop for the hour it stays in its window.
   */
  fun onAlarm(context: Context) {
    val now = System.currentTimeMillis()
    val due = next(context, now)
    if (due == null || due.at > now) {
      arm(context)
      return
    }
    if (due.snooze) ReminderStore(context).snooze = null
    post(context, due)
    arm(context, due.at)
  }

  private fun post(
    context: Context,
    due: Due,
  ) {
    val store = ReminderStore(context)
    val plan = store.plan ?: return
    // A reminder the phone refused to show never rang: it stays out of the journal, which is how
    // Settings can say the phone may have blocked it.
    if (!areEnabled(context)) return
    ensureChannel(context, plan.optString("channelName", "Reminders"))

    val title: String
    val body: String
    if (due.snooze) {
      // The words the day's reminder said, kept in the journal: the plan no longer carries a day
      // that has rung.
      val posted = store.log().firstOrNull { it.optString("date") == due.date }
      title = posted?.optString("title").orEmpty()
      body = posted?.optString("body").orEmpty()
      if (title.isEmpty()) return
    } else {
      val entry = due.entry ?: return
      title = entry.optString("title")
      val quiet = if (isLast(store, due.date)) plan.optString("quietText") else ""
      body = listOf(entry.optString("body"), quiet).filter { it.isNotEmpty() }.joinToString("\n")
      store.updateLog(due.date) {
        it
          .put("variant", entry.optString("variant"))
          .put("title", title)
          .put("body", body)
      }
    }

    val labels = plan.optJSONObject("actionLabels")
    val hour = LocalTime.timeOf(System.currentTimeMillis()).substringBefore(":").toInt()
    val builder =
      NotificationCompat
        .Builder(context, CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_popup_reminder)
        .setContentTitle(title)
        .setStyle(NotificationCompat.BigTextStyle().bigText(body.ifEmpty { title }))
        .setContentIntent(tapIntent(context, due.date))
        .setAutoCancel(true)
        .setCategory(NotificationCompat.CATEGORY_REMINDER)
        .setTimeoutAfter(maxOf(0, LocalTime.endOf(due.date) - System.currentTimeMillis()))
    if (body.isNotEmpty()) builder.setContentText(body)
    // One snooze a day: the second reminder offers only the pause.
    if (!due.snooze && hour < LAST_SNOOZE_HOUR) {
      builder.addAction(0, labels?.optString("snooze").orEmpty(), actionIntent(context, ACTION_SNOOZE, due.date))
    }
    builder.addAction(0, labels?.optString("pause").orEmpty(), actionIntent(context, ACTION_PAUSE, due.date))

    try {
      NotificationManagerCompat.from(context).notify(notificationId(due.date), builder.build())
    } catch (_: SecurityException) {
      // The grant was withdrawn between the check above and here. Nothing rang; Settings says why
      // at the next launch, from `areEnabled`.
    }
  }

  /** Whether `date` is the last day this phone will post before going quiet. */
  private fun isLast(
    store: ReminderStore,
    date: String,
  ): Boolean = postable(store).maxOfOrNull { it.optString("date") } == date

  /** "In 1 hour" tapped: once, today only, and never across midnight. */
  fun snooze(
    context: Context,
    date: String,
  ) {
    cancelNotification(context, date)
    val today = LocalTime.today()
    val later = System.currentTimeMillis() + SNOOZE_MS
    if (date == today && LocalTime.endOf(today) > later) {
      val store = ReminderStore(context)
      store.snooze = today to LocalTime.timeOf(later)
      store.updateLog(today) { it.put("snoozed", true) }
    }
    arm(context)
  }

  /** "Pause 7 days" tapped: nothing until today + 7, which rings again on its own. */
  fun pause(
    context: Context,
    date: String,
  ) {
    cancelNotification(context, date)
    val store = ReminderStore(context)
    store.resumeDate = LocalTime.addDays(LocalTime.today(), PAUSE_DAYS)
    store.snooze = null
    store.updateLog(date) { it.put("paused", true) }
    arm(context)
  }

  /** Permission granted, and the hero has not switched the channel off. */
  fun areEnabled(context: Context): Boolean {
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return false
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true
    val channel = manager.getNotificationChannel(CHANNEL_ID) ?: return true
    return channel.importance != NotificationManager.IMPORTANCE_NONE
  }

  /**
   * Normal importance, sound and vibration: the hero asked for this one. The name is pushed from JS
   * in the app's language; creating a channel again only renames it, the hero's settings stay.
   */
  fun ensureChannel(
    context: Context,
    name: String,
  ) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_DEFAULT)
    context.getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
  }

  private fun cancelNotification(
    context: Context,
    date: String,
  ) = NotificationManagerCompat.from(context).cancel(notificationId(date))

  /** One id per day: a snooze or a rearm replaces the day's notification, never doubles it. */
  private fun notificationId(date: String): Int = date.replace("-", "").toIntOrNull() ?: 0

  /**
   * Straight to the app, never through a receiver: Android 12 forbids a notification trampoline.
   * The day rides along so the app can mark it opened.
   */
  private fun tapIntent(
    context: Context,
    date: String,
  ): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    launch.putExtra(EXTRA_DATE, date)
    return PendingIntent.getActivity(
      context,
      notificationId(date),
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun actionIntent(
    context: Context,
    action: String,
    date: String,
  ): PendingIntent {
    val intent =
      Intent(context, ReminderReceiver::class.java)
        .setAction(action)
        .putExtra(EXTRA_DATE, date)
    // Distinct request codes, or the two actions would share one PendingIntent.
    val code = notificationId(date) % 100_000 * 10 + if (action == ACTION_SNOOZE) 1 else 2
    return PendingIntent.getBroadcast(
      context,
      code,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
