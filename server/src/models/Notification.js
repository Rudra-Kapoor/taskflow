import mongoose from 'mongoose';
import { NOTIFICATION } from '../utils/constants.js';

const { ObjectId } = mongoose.Schema.Types;
const NINETY_DAYS_IN_SECONDS = 60 * 60 * 24 * 90;

/** Matches every ObjectId but never `null` (comparisons in MongoDB are type-bracketed). */
const ANY_OBJECT_ID = { $gte: new mongoose.Types.ObjectId('000000000000000000000000') };

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: ObjectId, ref: 'User', required: true },
    actor: { type: ObjectId, ref: 'User', default: null },
    type: { type: String, enum: Object.values(NOTIFICATION), required: true },
    message: { type: String, required: true, maxlength: 300 },
    team: { type: ObjectId, ref: 'Team', default: null },
    project: { type: ObjectId, ref: 'Project', default: null },
    task: { type: ObjectId, ref: 'Task', default: null },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Lists are read newest first (optionally unread only); ending with `_id` lets the index return
// pages in their exact sort order instead of sorting in memory.
notificationSchema.index({ recipient: 1, createdAt: -1, _id: -1 });
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1, _id: -1 });
// Deleting a task, project or team deletes its notifications. Only notifications that reference
// one are indexed. (A `$type: 'objectId'` filter would read better, but the query planner cannot
// tell that an equality on an id satisfies it, so such an index would never be used.)
for (const field of ['task', 'project', 'team']) {
  notificationSchema.index({ [field]: 1 }, { partialFilterExpression: { [field]: ANY_OBJECT_ID } });
}
// Old notifications are cleaned up automatically by MongoDB.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NINETY_DAYS_IN_SECONDS });

export const Notification = mongoose.model('Notification', notificationSchema);
