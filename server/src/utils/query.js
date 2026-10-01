/** Escapes user input so it can be safely embedded in a RegExp. */
export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Case-insensitive "contains" matcher for free-text search. */
export const containsRegex = (value) => new RegExp(escapeRegex(value.trim()), 'i');

/** Builds pagination params + the meta block returned to clients. */
export const paginate = ({ page = 1, limit = 20 }) => ({
  page,
  limit,
  skip: (page - 1) * limit,
  meta: (total) => ({ page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }),
});

/** Normalises ObjectIds / populated docs / strings into a comparable string id. */
export const toId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

export const sameId = (a, b) => {
  const left = toId(a);
  return left !== null && left === toId(b);
};
