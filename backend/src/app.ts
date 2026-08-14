import express, { Request, Response, NextFunction } from "express";
import { scanRouter } from "./routes/scans.js";

// This file builds and configures the Express app — middleware, routes,
// the 404 handler, the error handler. Nothing here ever starts a real
// server or opens a network port. Importing this file has zero side
// effects; it just hands back a fully-configured app object. That's what
// makes it safe for a test file to import.
const app = express();

app.use(express.json());

// ---- ROUTES GO HERE, before the 404 and error handler ----
// Controllers should set res.locals.status / res.locals.data
// and call next() instead of sending a response directly.
app.use("/api", scanRouter);

app.get("/api/health", (_req: Request, res: Response, next: NextFunction) => {
  res.locals.status = 200;
  res.locals.data = { status: "ok" };
  next();
});

// ---- 404 CATCH-ALL (must come after every real route) ----
// Only sets a 404 if no route above already set res.locals.status.
// Always calls next() — never sends a response itself.
app.use((_req: Request, res: Response, next: NextFunction) => {
  if (res.locals.status === undefined) {
    res.locals.status = 404;
    res.locals.data = { error: "Not found" };
  }
  return next();
});

// ---- FINAL RESPONSE SENDER (must come after the 404 catch-all) ----
// By now res.locals.status should always be set — by a real route,
// or by the 404 handler above. If it's still missing, that's a bug
// in some earlier middleware, so we pass it to the error handler
// instead of guessing.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (res.locals.status === undefined) {
    return next(new Error(`No res.locals.status set for ${req.method} ${req.path}`));
  }
  res.status(res.locals.status).json(res.locals.data);
});

// ---- GLOBAL ERROR HANDLER (must be LAST, 4 params) ----
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const defaultErr = {
    log: "Express error handler caught unknown middleware error",
    status: 500,
    message: { error: "An error occurred" },
  };
  const errorObj = { ...defaultErr, ...err };
  console.error(errorObj.log, err);
  return res.status(errorObj.status).json(errorObj.message);
});

export default app;