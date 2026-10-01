import { ZodError } from 'zod';

const SOURCES = ['params', 'query', 'body'];

/**
 * Validates and sanitises `req.params`, `req.query` and `req.body` against Zod
 * schemas. Parsed values replace the raw input, so handlers only ever see
 * typed, whitelisted data (unknown keys are stripped).
 *
 *   router.post('/', validate({ body: schema }), handler)
 */
export const validate = (schemas) => (req, _res, next) => {
  const issues = [];

  for (const source of SOURCES) {
    const schema = schemas[source];
    if (!schema) continue;

    const result = schema.safeParse(req[source] ?? {});
    if (result.success) {
      req[source] = result.data;
    } else {
      issues.push(
        ...result.error.issues.map((issue) => ({ ...issue, path: [source, ...issue.path] })),
      );
    }
  }

  if (issues.length) return next(new ZodError(issues));
  return next();
};
