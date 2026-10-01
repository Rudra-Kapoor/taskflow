import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';
import apiRoutes from './routes/index.js';

const CLIENT_DIST = fileURLToPath(new URL('../../client/dist', import.meta.url));

const corsOptions = {
  // Requests without an Origin header (curl, server-to-server, same-origin GETs) are allowed.
  origin: (origin, callback) => callback(null, !origin || env.clientOrigins.includes(origin)),
  credentials: true,
};

/**
 * Serves the production build of the React app (if it exists) from the same origin as the API.
 * Hashed files under /assets are cached forever; everything else, including the SPA fallback
 * for client-side routes, must be revalidated so new deploys are picked up immediately.
 */
function serveClient(app) {
  const indexHtml = path.join(CLIENT_DIST, 'index.html');
  if (!existsSync(indexHtml)) return;

  const noCache = (res) => res.setHeader('Cache-Control', 'no-cache');
  const hashedAssets = { immutable: true, maxAge: '1y', index: false };

  // A missing hashed asset is a real 404, never the SPA shell.
  app.use('/assets', express.static(path.join(CLIENT_DIST, 'assets'), hashedAssets), notFound);
  app.use(express.static(CLIENT_DIST, { index: false, setHeaders: noCache }));
  app.get(/^\/(?!api(?:\/|$)|socket\.io(?:\/|$))/, (_req, res) => {
    noCache(res);
    res.sendFile(indexHtml);
  });
}

/** Builds the Express app without starting a server (tests drive it with supertest). */
export function createApp() {
  const app = express();

  // `req.ip` (the rate-limit key) only honours X-Forwarded-For from the configured proxies.
  app.set('trust proxy', env.trustProxy);
  app.use(
    helmet({
      contentSecurityPolicy: {
        // The SPA is served same-origin without inline scripts, so helmet's default policy fits.
        // `upgrade-insecure-requests` is dropped so plain-HTTP local runs (e.g. Safari on
        // http://localhost) keep loading assets; TLS is enforced by the proxy + HSTS instead.
        directives: { upgradeInsecureRequests: null },
      },
    }),
  );
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  app.use('/api', apiLimiter, apiRoutes);
  app.use('/api', notFound);

  serveClient(app);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
