import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const commentSchema = new mongoose.Schema(
  {
    task: { type: ObjectId, ref: 'Task', required: true },
    project: { type: ObjectId, ref: 'Project', required: true },
    author: { type: ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

commentSchema.index({ task: 1, createdAt: 1 });
commentSchema.index({ project: 1 });

export const Comment = mongoose.model('Comment', commentSchema);
