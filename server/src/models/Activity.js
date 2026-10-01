import mongoose from 'mongoose';
import { ACTIVITY } from '../utils/constants.js';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Append-only audit log. `meta` stores a snapshot (task title, key, from/to
 * values...) so entries stay readable even after the referenced task is deleted.
 */
const activitySchema = new mongoose.Schema(
  {
    actor: { type: ObjectId, ref: 'User', required: true },
    action: { type: String, enum: Object.values(ACTIVITY), required: true },
    team: { type: ObjectId, ref: 'Team', default: null },
    project: { type: ObjectId, ref: 'Project', default: null },
    task: { type: ObjectId, ref: 'Task', default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Feeds are read newest first with a (createdAt, _id) cursor (see activity.service.js). Ending
// every index with both keys makes a page a plain index walk instead of an in-memory sort.
activitySchema.index({ project: 1, createdAt: -1, _id: -1 });
activitySchema.index({ task: 1, createdAt: -1, _id: -1 });
activitySchema.index({ team: 1, createdAt: -1, _id: -1 });

export const Activity = mongoose.model('Activity', activitySchema);
