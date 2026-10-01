import { z } from 'zod';

export const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const HEX_COLOR_PATTERN = /^#[a-f\d]{6}$/i;

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const isoDateTime = z.string().datetime({ offset: true });
const isoCalendarDate = z.string().date();

/**
 * True for an ISO 8601 date-time with `Z` or a UTC offset, or a plain `YYYY-MM-DD` date.
 * Impossible calendar dates (`2030-02-30`) are rejected rather than rolled over.
 */
export const isIsoDate = (value) =>
  isoDateTime.safeParse(value).success || isoCalendarDate.safeParse(value).success;

/** `z.string()` with readable "<Label> is required" / "<Label> must be a string" messages. */
export const stringField = (label) =>
  z.string({
    required_error: `${label} is required`,
    invalid_type_error: `${label} must be a string`,
  });

/** `z.enum()` whose error message lists the allowed values. */
export const enumField = (values, label) =>
  z.enum(values, {
    errorMap: () => ({ message: `${label} must be one of: ${values.join(', ')}` }),
  });

/** 24-char hex ObjectId string, lower-cased so ids can be compared as plain strings. */
export const objectId = (label = 'id') =>
  z
    .string({
      required_error: `${capitalize(label)} is required`,
      invalid_type_error: `Invalid ${label}`,
    })
    .trim()
    .regex(OBJECT_ID_PATTERN, `Invalid ${label}`)
    .transform((value) => value.toLowerCase());

export const emailSchema = stringField('Email')
  .trim()
  .toLowerCase()
  .max(120, 'Email must be at most 120 characters')
  .email('Invalid email');

export const hexColor = z
  .string({ invalid_type_error: 'Colour must be a string' })
  .trim()
  .regex(HEX_COLOR_PATTERN, 'Colour must be a hex value like #6366f1')
  .transform((value) => value.toLowerCase());

/** Minutes, exactly as returned by the browser's `Date#getTimezoneOffset()` (IST = -330). */
export const tzOffset = z.coerce
  .number({ invalid_type_error: 'tzOffset must be a number' })
  .int('tzOffset must be a whole number of minutes')
  .min(-840, 'tzOffset must be between -840 and 840')
  .max(840, 'tzOffset must be between -840 and 840')
  .default(0);

/** Query-string booleans arrive as strings. */
export const booleanString = z
  .enum(['true', 'false'], { errorMap: () => ({ message: 'Must be "true" or "false"' }) })
  .transform((value) => value === 'true');

export const pageQuery = {
  page: z.coerce
    .number({ invalid_type_error: 'page must be a number' })
    .int('page must be an integer')
    .min(1, 'page must be at least 1')
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'limit must be a number' })
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .max(100, 'limit must be at most 100')
    .default(20),
};

const INVALID_CURSOR = 'before must be a nextCursor value or an ISO date';

/**
 * `before` of cursor pagination: the previous page's `nextCursor` (`<ISO createdAt>_<_id>`) or,
 * as older clients send it, a plain ISO date (everything strictly older than that instant).
 * Parsed into `{ createdAt: Date, id: string | null }`.
 */
const pageCursor = z
  .string({ invalid_type_error: INVALID_CURSOR })
  .trim()
  .transform((value, ctx) => {
    const [date, id = null, ...rest] = value.split('_');
    if (rest.length || !isIsoDate(date) || (id !== null && !OBJECT_ID_PATTERN.test(id))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: INVALID_CURSOR });
      return z.NEVER;
    }
    return { createdAt: new Date(date), id: id?.toLowerCase() ?? null };
  });

export const cursorQuery = {
  before: pageCursor.optional(),
  limit: z.coerce
    .number({ invalid_type_error: 'limit must be a number' })
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .max(50, 'limit must be at most 50')
    .default(20),
};

const omitBlankValues = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => !(typeof value === 'string' && !value.trim())),
  );
};

/** Object schema for `req.query`: blank values (`?status=`) are treated as "not provided". */
export const querySchema = (shape) => z.preprocess(omitBlankValues, z.object(shape));

/** Rejects PATCH bodies that contain no (known) field to update. */
export const atLeastOneField = (schema, message = 'Provide at least one field to update') =>
  schema.refine((data) => Object.values(data).some((value) => value !== undefined), { message });
