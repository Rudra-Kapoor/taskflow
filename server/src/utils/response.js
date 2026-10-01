/**
 * Every successful response uses the same envelope:
 *   { success: true, message?, data, meta? }
 * Errors are shaped by the error handler as:
 *   { success: false, message, errors? }
 */
export const sendSuccess = (res, data, { status = 200, meta, message } = {}) => {
  const body = { success: true };
  if (message) body.message = message;
  body.data = data;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

export const sendCreated = (res, data) => sendSuccess(res, data, { status: 201 });

export const sendMessage = (res, message, status = 200) =>
  res.status(status).json({ success: true, message });
