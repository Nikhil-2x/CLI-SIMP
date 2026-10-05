import type { Request } from "express";

/** Thrown from services/controllers; the error middleware turns it into a JSON response. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Single string query parameter, or undefined. Repeated params (?a=1&a=2) are rejected. */
export function queryString(req: Request, name: string): string | undefined {
  const value = (req.query as Record<string, unknown>)[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new HttpError(400, `Query parameter "${name}" must be a single value`);
  return value;
}

export function queryInt(req: Request, name: string, fallback: number, max: number): number {
  const raw = queryString(req, name);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new HttpError(400, `Query parameter "${name}" must be a non-negative integer`);
  return Math.min(n, max);
}

/** Validates that `value` is one of `allowed`; undefined passes through. */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new HttpError(400, `"${field}" must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

export function requiredString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, `"${field}" is required`);
  return value.trim();
}

export function optionalString(body: Record<string, unknown>, field: string): string | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new HttpError(400, `"${field}" must be a string`);
  return value.trim() || undefined;
}

export function bodyObject(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw new HttpError(400, "Expected a JSON object body");
  }
  return req.body as Record<string, unknown>;
}
