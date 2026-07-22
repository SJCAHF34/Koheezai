import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { randomBytes } from "node:crypto";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startOutreachScheduler } from "./lib/outreachScheduler";
import { startAdpScheduler } from "./lib/adpSync";
import { pool } from "./db";
import { storage, DbStorage } from "./storage";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

const isProduction = process.env.NODE_ENV === "production";

// Behind a TLS-terminating proxy (Aptible / Replit deploys) so that
// `secure` cookies are emitted based on the forwarded protocol.
app.set("trust proxy", 1);

// Allow Microsoft Teams host clients to embed the app in their iframe.
// Adding these frame-ancestors does NOT affect normal browser use — it only
// declares who is allowed to frame the app (the app itself plus Teams hosts).
const TEAMS_FRAME_ANCESTORS = [
  "'self'",
  "https://teams.microsoft.com",
  "https://*.teams.microsoft.com",
  "https://*.teams.microsoft.us",
  "https://*.skype.com",
  "https://*.office.com",
  "https://*.microsoftonline.com",
  "https://outlook.office.com",
  "https://outlook.office365.com",
  "https://*.microsoft365.com",
].join(" ");
// Only enforce frame-ancestors in production. In local/Replit dev the app is
// shown inside the Replit preview iframe, so leave framing unrestricted there.
if (isProduction) {
  app.use((_req, res, next) => {
    res.setHeader("Content-Security-Policy", `frame-ancestors ${TEAMS_FRAME_ANCESTORS};`);
    next();
  });
}

// Persist sessions in PostgreSQL so logins survive process restarts and
// redeploys (Aptible recycles the container filesystem). The table is created
// automatically on first boot if it does not already exist.
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool,
    tableName: "session",
    createTableIfMissing: true,
  }),
  secret: (() => {
    if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
    if (isProduction) {
      throw new Error("[security] SESSION_SECRET environment variable must be set in production.");
    }
    console.warn("[security] SESSION_SECRET not set — using random ephemeral secret for development. Sessions will not survive restarts.");
    return randomBytes(32).toString("hex");
  })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // In production the app may be embedded inside the Teams iframe, which is a
    // cross-site context — the cookie must be SameSite=None and Secure to be
    // sent. In local dev (http) keep the original Lax/insecure behavior so the
    // normal browser login keeps working.
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

app.use(express.json({
  limit: "20mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.text({ type: ["text/csv", "text/plain"], limit: "1mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // HIPAA: never log response bodies — assessment/patient endpoints return
      // PHI. Log only the method, path, status code, and timing.
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  // One-time backfill of legacy file/in-memory data into PostgreSQL, plus
  // first-boot seeding. Runs before routes serve traffic.
  await (storage as DbStorage).init?.();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  startOutreachScheduler();
  startAdpScheduler();

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
