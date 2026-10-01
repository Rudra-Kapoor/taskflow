import mongoose from 'mongoose';
import { TASK_PRIORITIES, TASK_STATUSES } from '../utils/constants.js';

const { ObjectId } = mongoose.Schema.Types;

const taskSchema = new mongoose.Schema(
  {
    project: { type: ObjectId, ref: 'Project', required: true },
    number: { type: Number, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000, default: '' },
    status: { type: String, enum: TASK_STATUSES, default: 'todo' },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'medium' },
    assignee: { type: ObjectId, ref: 'User', default: null },
    createdBy: { type: ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, default: null },
    labels: {
      type: [{ type: String, trim: true, maxlength: 30 }],
      default: [],
    },
    // Fractional ordering inside a status column (see services/position.service.js).
    position: { type: Number, required: true },
    // Denormalised counter so board cards don't need an extra aggregation.
    commentCount: { type: Number, default: 0, min: 0 },
    completedAt: { type: Date, default: null },
    dueReminderSentAt: { type: Date, default: null, select: false },
  },
  {
    timestamps: true,
    // `labels` is only ever replaced as a whole (never updated by index), so array versioning
    // would just turn concurrent edits into VersionErrors instead of last-write-wins.
    skipVersioning: { labels: true },
  },
);

taskSchema.index({ project: 1, number: 1 }, { unique: true });
taskSchema.index({ project: 1, status: 1, position: 1 }); // board columns
taskSchema.index({ assignee: 1, status: 1, dueDate: 1 }); // "my tasks" + reminders
taskSchema.index({ project: 1, updatedAt: -1 });

export const Task = mongoose.model('Task', taskSchema);
