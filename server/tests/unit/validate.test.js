import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { ZodError, z } from 'zod';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { validate } from '../../src/middleware/validate.js';

const schemas = {
  params: z.object({ id: z.string().regex(/^\d+$/, 'Invalid id') }),
  query: z.object({ page: z.coerce.number().int().min(1, 'page must be at least 1').default(1) }),
  body: z.object({
    name: z.string().trim().min(2, 'Name is too short'),
    tags: z.array(z.string().min(1, 'Tags cannot be empty')).default([]),
  }),
};

/** Runs the middleware and returns what it passed to `next`. */
function runValidate(req, schemaSet = schemas) {
  const next = vi.fn();
  validate(schemaSet)(req, {}, next);
  expect(next).toHaveBeenCalledTimes(1);
  return next.mock.calls[0][0];
}

describe('validate middleware', () => {
  it('replaces params, query and body with the parsed data and strips unknown keys', () => {
    const req = {
      params: { id: '42' },
      query: { page: '3', debug: 'true' },
      body: { name: '  Ada ', role: 'admin' },
    };

    expect(runValidate(req)).toBeUndefined();
    expect(req).toEqual({
      params: { id: '42' },
      query: { page: 3 },
      body: { name: 'Ada', tags: [] },
    });
  });

  it('reports the issues of every source, prefixed with their location', () => {
    const req = { params: { id: 'abc' }, query: { page: '0' }, body: { name: 'A', tags: [''] } };

    const error = runValidate(req);

    expect(error).toBeInstanceOf(ZodError);
    expect(error.issues.map((issue) => issue.path)).toEqual([
      ['params', 'id'],
      ['query', 'page'],
      ['body', 'name'],
      ['body', 'tags', 0],
    ]);
  });

  it('leaves sources without a schema untouched and treats a missing source as empty', () => {
    const req = { params: { anything: 'goes' } };

    expect(runValidate(req, { body: z.object({ note: z.string().optional() }) })).toBeUndefined();
    expect(req).toEqual({ params: { anything: 'goes' }, body: {} });
  });

  it('is turned into a 400 response that lists each field and its location', async () => {
    const app = express();
    app.use(express.json());
    app.post('/items/:id', validate(schemas), (req, res) => res.json(req.body));
    app.use(errorHandler);

    const res = await request(app).post('/items/abc?page=0').send({ name: 'A', tags: [''] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Validation failed',
      errors: [
        { field: 'id', location: 'params', message: 'Invalid id' },
        { field: 'page', location: 'query', message: 'page must be at least 1' },
        { field: 'name', location: 'body', message: 'Name is too short' },
        { field: 'tags.0', location: 'body', message: 'Tags cannot be empty' },
      ],
    });
  });
});
