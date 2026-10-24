import { ProviderRequestError } from "./types";

/** Token bucket limiter so adapters never exceed a provider's published quota. */
export class RateLimiter {
  private tokens: number;
  private last = Date.now();

  constructor(private readonly perMinute: number) {
    this.tokens = Number.isFinite(perMinute) ? perMinute : Number.POSITIVE_INFINITY;
  }

  async acquire(): Promise<void> {
    if (!Number.isFinite(this.perMinute)) return;
    for (;;) {
      const now = Date.now();
      this.tokens = Math.min(this.perMinute, this.tokens + ((now - this.last) / 60_000) * this.perMinute);
      this.last = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      await new Promise((r) => setTimeout(r, Math.ceil(((1 - this.tokens) / this.perMinute) * 60_000)));
    }
  }
}

/** Retry retryable failures with exponential backoff and jitter. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 4, baseMs = 500): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = error instanceof ProviderRequestError ? error.retryable : true;
      if (!retryable || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, baseMs * 2 ** i * (0.75 + Math.random() * 0.5)));
    }
  }
  throw lastError;
}
