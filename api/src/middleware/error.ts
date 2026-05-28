import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error("[error]", err);
  const status = err?.status ?? 500;
  const message = err?.message ?? "Internal server error";
  res.status(status).json({ error: message });
};
