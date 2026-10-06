import { addDays, differenceInCalendarDays, parse } from "date-fns";

import { dayKey } from "@/db/dates";
import { deletePreference, getPreference, setPreference } from "@/db/preferences";
import { encryptionStatus, vaultFormat } from "@/src/backupCipher";

/**
 * "Is your password still in your head?": the one nudge a sealed backup needs. Sealed backups are
 * only as good as the password the hero can still produce, and the day to learn they cannot is
 * while this phone still holds the key and can make them a new one.
 *
 * Offered once, when the hero sets a password up, and only ever on their yes. Then a question
 * three days later, two weeks, a month, three months, and every three months after. A right answer
 * moves to the next step; a wrong one goes back one (the hero is practising, not failing); ignoring
 * it twice moves on too, since a nudge that keeps coming back at the same pace is one people
 * learn to dismiss. A new vault or a new password starts again at three days: it is the one to
 * practise.
 *
 * State is in the preferences table and is device-local (`DEVICE_LOCAL_PREFERENCES`): a phone
 * restored from another's backup must not inherit its schedule.
 */
const ON = "passwordRemindersOn";
const STEP = "passwordCheckStep";
const DUE = "passwordCheckDue";
const IGNORED = "passwordCheckIgnored";

/** Days until the next question, by step. The last repeats. */
const DAYS = [3, 14, 30, 90] as const;

export async function passwordRemindersOn(): Promise<boolean> {
  return (await getPreference(ON)) === "1";
}

async function step(): Promise<number> {
  return Math.min(Math.max(Number(await getPreference(STEP)) || 0, 0), DAYS.length - 1);
}

async function schedule(next: number, now: Date): Promise<void> {
  const clamped = Math.min(Math.max(next, 0), DAYS.length - 1);
  await setPreference(STEP, String(clamped));
  await setPreference(DUE, dayKey(addDays(now, DAYS[clamped] ?? 3)));
}

/**
 * The hero's answer to "ask me again from time to time". Turning it on while it is already on
 * leaves the clock where it was.
 */
export async function setPasswordReminders(on: boolean, now: Date = new Date()): Promise<void> {
  if (!on) {
    for (const key of [ON, STEP, DUE, IGNORED]) await deletePreference(key);
    return;
  }
  if (await passwordRemindersOn()) return;
  await setPreference(ON, "1");
  await deletePreference(IGNORED);
  await schedule(0, now);
}

/**
 * Whether the question is due today: asked for, on a vault this build made, with this phone
 * holding its key. A vault from an older build has no password worth asking about (it is updated
 * first), and a phone without the key has nothing to check against.
 */
export async function passwordCheckDue(now: Date = new Date()): Promise<boolean> {
  if (!(await passwordRemindersOn())) return false;
  if ((await encryptionStatus()) !== "on" || (await vaultFormat()) !== 3) return false;
  const due = await getPreference(DUE);
  return due !== null && differenceInCalendarDays(now, parse(due, "yyyy-MM-dd", new Date(0))) >= 0;
}

/** What the hero did with the question. Ignored while the reminders are off. */
export async function answerPasswordCheck(
  answer: "right" | "wrong" | "ignored",
  now: Date = new Date(),
): Promise<void> {
  if (!(await passwordRemindersOn())) return;
  const current = await step();
  if (answer === "right") {
    await deletePreference(IGNORED);
    await schedule(current + 1, now);
  } else if (answer === "wrong") {
    await schedule(current - 1, now);
  } else {
    const ignored = (Number(await getPreference(IGNORED)) || 0) + 1;
    // The second time in a row moves on; the first comes back at the same pace.
    await setPreference(IGNORED, String(ignored >= 2 ? 0 : ignored));
    await schedule(ignored >= 2 ? current + 1 : current, now);
  }
}

/** A new vault or a new password: the one to practise, so the clock starts again at three days. */
export async function restartPasswordChecks(now: Date = new Date()): Promise<void> {
  if (!(await passwordRemindersOn())) return;
  await deletePreference(IGNORED);
  await schedule(0, now);
}
