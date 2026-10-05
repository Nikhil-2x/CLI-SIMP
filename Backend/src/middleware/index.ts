import { timingSafeEqual } from "node:crypto";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { HttpError } from "../lib/http.js";

/**
 * Bearer-token auth for /api. With API_KEY unset the server only listens on
 * 127.0.0.1 (see index.ts), so local development needs no key.
 */
export function requireApiKey(apiKey: string | undefined): RequestHandler {
  if (!apiKey) return (_req, _res, next) => next();
  const expected = Buffer.from(apiKey);
  return (req, _res, next) => {
    const header = req.get("authorization") ?? "";
    const given = Buffer.from(header.startsWith("Bearer ") ? header.slice(7) : "");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return next(new HttpError(401, "Missing or invalid API key"));
    }
    next();
  };
}

/** Lets the Next.js dashboard (a different origin) call the API. */
export function cors(allowedOrigins: string[]): RequestHandler {
  return (req, res, next) => {
    const origin = req.get("origin");
    if (origin && allowedOrigins.includes(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Vary", "Origin");
      res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    }
    if (req.method === "OPTIONS") return void res.sendStatus(204);
    next();
  };
}

export const notFound: RequestHandler = (_req, _res, next) => next(new HttpError(404, "Not found"));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
  // body-parser errors (bad JSON, too large) carry their own status.
  if (typeof err?.status === "number" && err.status < 500) {
    return void res.status(err.status).json({ error: err.message });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    return void res.status(404).json({ error: "Not found" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
