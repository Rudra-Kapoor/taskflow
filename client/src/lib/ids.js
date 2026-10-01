/** A MongoDB ObjectId as it appears in URLs and API payloads (24 hex characters). */
export const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export const isObjectId = (value) => typeof value === 'string' && OBJECT_ID_PATTERN.test(value);

/**
 * Normalises a reference that may be populated (`{ _id, ... }`), a raw id or empty into a
 * string id, or `null` when there is none.
 */
export function getId(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value._id ? String(value._id) : null;
  return String(value);
}
