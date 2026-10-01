import mongoose from 'mongoose';
import { PROJECT_STATUSES } from '../utils/constants.js';

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // Short uppercase identifier used to build task keys, e.g. "WEB" -> WEB-42.
    key: { type: String, required: true, uppercase: true, trim: true, minlength: 2, maxlength: 6 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    color: { type: String, default: '#6366f1' },
    status: { type: String, enum: PROJECT_STATUSES, default: 'active' },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Monotonic counter used to number tasks (incremented atomically).
    taskSeq: { type: Number, default: 0, select: false },
    // When something last happened in the project (activity log entry or board move). Unlike
    // `updatedAt` it also moves with work on tasks and comments; see activity.service.js.
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

projectSchema.index({ team: 1, key: 1 }, { unique: true });
// Project lists: a team's (active) projects, most recently active first.
projectSchema.index({ team: 1, status: 1, lastActivityAt: -1, _id: -1 });

export const Project = mongoose.model('Project', projectSchema);
