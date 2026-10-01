import 'dotenv/config';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

/** `VAR=` (e.g. docker compose's `${VAR:-}`) means "not set". */
const blankAsUnset = (value) => (value === '' ? undefined : value);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    // MONGODB_URI is the name Vercel's MongoDB Atlas integration uses.
    MONGO_URI: z.string().trim().optional().default(process.env.MONGODB_URI || ''),
    JWT_SECRET: z.preprocess(
      blankAsUnset,
      z.string().min(16, 'JWT_SECRET must be at least 16 characters').optional(),
    ),
    JWT_EXPIRES_IN: z.string().default('7d'),
    // Render exposes the public service URL, which is the right default when the API serves the SPA.
    CLIENT_URL: z.string().default(process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173'),
    SEED_ON_EMPTY_DB: booleanString,
    // Socket.IO endpoint; on Vercel it lives under /api so the API function receives it.
    SOCKET_PATH: z.string().startsWith('/').default('/socket.io'),
    // Number of reverse proxies in front of the server (e.g. 1 on Render). X-Forwarded-For is
    // only trusted that many hops deep; trusting it without a proxy would let any client spoof
    // its IP and dodge the per-IP rate limits.
    TRUST_PROXY: z.preprocess(
      blankAsUnset,
      z.coerce
        .number({ invalid_type_error: 'must be the number of proxies in front of the server' })
        .int('must be a whole number of proxies')
        .min(0, 'must be 0 (no proxy) or more')
        .default(0),
    ),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (!env.MONGO_URI) {
        ctx.addIssue({ code: 'custom', path: ['MONGO_URI'], message: 'is required in production' });
      }
      if (!env.JWT_SECRET) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_SECRET'],
          message: 'is required in production (e.g. JWT_SECRET=$(openssl rand -hex 32))',
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

const raw = parsed.data;

export const env = Object.freeze({
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  port: raw.PORT,
  mongoUri: raw.MONGO_URI,
  jwtSecret: raw.JWT_SECRET ?? 'dev-only-insecure-jwt-secret-change-me',
  jwtExpiresIn: raw.JWT_EXPIRES_IN,
  clientOrigins: raw.CLIENT_URL.split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
  seedOnEmptyDb: raw.SEED_ON_EMPTY_DB,
  socketPath: raw.SOCKET_PATH,
  trustProxy: raw.TRUST_PROXY,
});
