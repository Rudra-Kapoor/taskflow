import mongoose from 'mongoose';

/**
 * Global Mongoose settings. Imported by models/index.js so they apply wherever the models are
 * used (HTTP server, seed script, tests driving `createApp()`), not only once the connection
 * module has been loaded.
 */

/**
 * Internal fields that must never leave the API. They are all `select: false`, but they are
 * still present on freshly created documents and on documents that selected them explicitly.
 */
const PRIVATE_FIELDS = ['password', 'tokenVersion', 'taskSeq', 'dueReminderSentAt'];

// Strip internal fields from every JSON payload the API returns.
mongoose.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    for (const field of PRIVATE_FIELDS) delete ret[field];
    return ret;
  },
});
mongoose.set('strictQuery', true);

export default mongoose;
