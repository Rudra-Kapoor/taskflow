import mongoose from 'mongoose';
import { TEAM_MANAGER_ROLES, TEAM_ROLES } from '../utils/constants.js';
import { sameId } from '../utils/query.js';

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: TEAM_ROLES, default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true },
);

// "Which teams am I in?" is the root of every authorization query.
teamSchema.index({ 'members.user': 1 });

teamSchema.methods.getMember = function getMember(userId) {
  return this.members.find((member) => sameId(member.user, userId)) ?? null;
};

teamSchema.methods.getRole = function getRole(userId) {
  return this.getMember(userId)?.role ?? null;
};

teamSchema.methods.isMember = function isMember(userId) {
  return Boolean(this.getMember(userId));
};

teamSchema.methods.isManager = function isManager(userId) {
  return TEAM_MANAGER_ROLES.includes(this.getRole(userId));
};

export const Team = mongoose.model('Team', teamSchema);
