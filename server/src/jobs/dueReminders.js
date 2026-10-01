import { env } from '../config/env.js';
import { Project, Task } from '../models/index.js';
import {
  createNotifications,
  notificationMessages,
  taskRef,
} from '../services/notification.service.js';
import { NOTIFICATION } from '../utils/constants.js';
import { DAY } from '../utils/dates.js';
import { logger } from '../utils/logger.js';

const INTERVAL_MS = 15 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 10 * 1000;
const BATCH_SIZE = 500;

/**
 * Sends a one-off `task_due_soon` notification to the assignee of every open task in an active
 * project that is due within the next 24 hours. Returns the number of reminders sent.
 */
export async function sendDueReminders(now = new Date()) {
  const activeProjectIds = await Project.find({ status: 'active' }).distinct('_id');
  if (!activeProjectIds.length) return 0;

  const tasks = await Task.find({
    project: { $in: activeProjectIds },
    status: { $ne: 'completed' },
    assignee: { $ne: null },
    dueDate: { $gt: now, $lte: new Date(now.getTime() + DAY) },
    dueReminderSentAt: null,
  })
    .select('number title project assignee')
    .populate({ path: 'project', select: 'key team' })
    .limit(BATCH_SIZE);

  let sent = 0;
  for (const task of tasks) {
    // Claim the reminder atomically so overlapping runs (or instances) never send it twice.
    const { modifiedCount } = await Task.updateOne(
      { _id: task._id, dueReminderSentAt: null },
      { $set: { dueReminderSentAt: now } },
      { timestamps: false },
    );
    if (!modifiedCount || !task.project) continue;

    await createNotifications({
      recipients: [task.assignee],
      type: NOTIFICATION.TASK_DUE_SOON,
      message: notificationMessages.taskDueSoon(taskRef(task, task.project)),
      team: task.project.team,
      project: task.project._id,
      task: task._id,
    });
    sent += 1;
  }
  return sent;
}

/**
 * Runs the reminder sweep every 15 minutes (first run shortly after boot). The timers are
 * unref'd so they never keep the process alive. Returns a function that stops the job.
 */
export function startDueReminderJob({
  intervalMs = INTERVAL_MS,
  firstRunDelayMs = FIRST_RUN_DELAY_MS,
} = {}) {
  if (env.isTest) return () => {};

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const sent = await sendDueReminders();
      if (sent) logger.info(`Due-date reminders sent: ${sent}`);
    } catch (error) {
      logger.error('Due-date reminder job failed', error);
    } finally {
      running = false;
    }
  };

  const firstRun = setTimeout(run, firstRunDelayMs);
  const interval = setInterval(run, intervalMs);
  firstRun.unref();
  interval.unref();

  return () => {
    clearTimeout(firstRun);
    clearInterval(interval);
  };
}
