import { addDays, startOfDay } from "date-fns";
import { getGoalById } from "./goals";
import { listQuestTemplates } from "./quests";
import { createScheduledSession } from "./scheduling";

/**
 * Generate a workout plan for a goal
 * This creates scheduled sessions for the next 4 weeks
 */
export async function generatePlanForGoal(goalId: number): Promise<void> {
  const goal = await getGoalById(goalId);
  if (!goal) {
    throw new Error(`Goal not found: ${goalId}`);
  }

  const quests = await listQuestTemplates();
  if (quests.length === 0) {
    throw new Error("No quests available to generate plan");
  }

  // Determine workout days based on daysPerWeek
  // Simple algorithm: spread days evenly
  // 1 day: Mon
  // 2 days: Mon, Thu
  // 3 days: Mon, Wed, Fri
  // 4 days: Mon, Tue, Thu, Fri
  // 5 days: Mon, Tue, Wed, Thu, Fri
  // 6 days: Mon-Sat
  // 7 days: Mon-Sun
  const schedulePattern = getSchedulePattern(goal.daysPerWeek);

  // Generate for 4 weeks
  const startDate = startOfDay(new Date());
  const weeksToPlan = 4;

  for (let week = 0; week < weeksToPlan; week++) {
    for (const dayOffset of schedulePattern) {
      const scheduledDate = addDays(startDate, week * 7 + dayOffset);

      // Pick a quest
      // TODO: Smarter quest selection based on goal type and history
      const randomQuest = quests[Math.floor(Math.random() * quests.length)];

      await createScheduledSession({
        questId: randomQuest.id,
        scheduledDate,
        goalId: goal.id,
        note: `Week ${week + 1} - Day ${dayOffset + 1}`,
      });
    }
  }
}

function getSchedulePattern(daysPerWeek: number): number[] {
  // 0 = Monday, 1 = Tuesday, ... 6 = Sunday
  // Note: date-fns startOfWeek defaults to Sunday (0) or Monday (1) depending on locale/options
  // Here we assume 0 is the first day of the plan (e.g. today or next Monday)
  // But to map to specific weekdays (Mon, Wed, Fri), we need to be careful.
  // Let's assume we start planning from "Next Monday" or "Today".
  // For simplicity, let's return offsets from the start of the week (Monday=0).

  switch (daysPerWeek) {
    case 1:
      return [0]; // Mon
    case 2:
      return [0, 3]; // Mon, Thu
    case 3:
      return [0, 2, 4]; // Mon, Wed, Fri
    case 4:
      return [0, 1, 3, 4]; // Mon, Tue, Thu, Fri
    case 5:
      return [0, 1, 2, 3, 4]; // Mon-Fri
    case 6:
      return [0, 1, 2, 3, 4, 5]; // Mon-Sat
    case 7:
      return [0, 1, 2, 3, 4, 5, 6]; // All days
    default:
      return [0, 2, 4]; // Default to 3 days
  }
}
