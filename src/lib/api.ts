import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";

/** Small helpers so every route validates input and fails the same way. */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function parseJson<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(422, "Invalid request", result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  return result.data;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
  }
  console.error("[api] unexpected error:", error);
  return NextResponse.json({ error: "Something went wrong on our side. Please try again." }, { status: 500 });
}

export function route<T>(handler: (request: Request) => Promise<T>) {
  return async (request: Request) => {
    try {
      return NextResponse.json(await handler(request));
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/** Fixed-window in-memory limiter (per server instance) for expensive routes. */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(request: Request, bucket: string, limit: number, windowMs = 60_000) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry || entry.resetAt < now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count++;
  if (entry.count > limit) throw new ApiError(429, "You're going a little fast — please wait a moment and try again.");
}
