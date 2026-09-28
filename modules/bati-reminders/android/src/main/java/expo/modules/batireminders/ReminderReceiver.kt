package expo.modules.batireminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Every way the reminders are reached with the app closed: the alarm, the two notification actions,
 * and the four system events after which the alarm has to be armed again (a reboot clears every
 * alarm; an update, a new timezone or a clock change moves what "20:00" means).
 *
 * All of it is instant work, so no `goAsync`. Opening a screen from here would be a trampoline,
 * which Android 12 forbids; nothing here does, the tap goes straight to the activity.
 */
class ReminderReceiver : BroadcastReceiver() {
  override fun onReceive(
    context: Context,
    intent: Intent,
  ) {
    val date = intent.getStringExtra(ReminderScheduler.EXTRA_DATE).orEmpty()
    when (intent.action) {
      ReminderScheduler.ACTION_ALARM -> ReminderScheduler.onAlarm(context)

      ReminderScheduler.ACTION_SNOOZE -> ReminderScheduler.snooze(context, date)

      ReminderScheduler.ACTION_PAUSE -> ReminderScheduler.pause(context, date)

      // BOOT_COMPLETED, MY_PACKAGE_REPLACED, TIMEZONE_CHANGED, TIME_SET: entries more than an hour
      // past are dropped by the arming itself.
      else -> ReminderScheduler.arm(context)
    }
  }
}
