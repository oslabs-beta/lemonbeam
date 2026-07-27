import express, { Request, Response, NextFunction } from "express";

// This file builds and configures the Express app — middleware, routes,
// the 404 handler, the error handler. Nothing here ever starts a real
// server or opens a network port. Importing this file has zero side
// effects; it just hands back a fully-configured app object. That's what
// makes it safe for a test file to import.
const app = express();

app.use(express.json());

// ---- ROUTES GO HERE, before the 404 and error handler ----
// app.use("/api/scan", scanRouter);

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// ---- 404 CATCH-ALL (must come after every real route) ----
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
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