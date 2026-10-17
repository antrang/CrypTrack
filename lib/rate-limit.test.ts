import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const result = rateLimit("user-1", { windowMs: 60_000, maxRequests: 2 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("blocks requests over the limit", () => {
    rateLimit("user-2", { windowMs: 60_000, maxRequests: 1 });
    const result = rateLimit("user-2", { windowMs: 60_000, maxRequests: 1 });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("refills tokens over time", () => {
    rateLimit("user-3", { windowMs: 10, maxRequests: 1 });
    // Wait for the tiny window to pass
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = rateLimit("user-3", { windowMs: 10, maxRequests: 1 });
        expect(result.success).toBe(true);
        resolve();
      }, 20);
    });
  });
});
