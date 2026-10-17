import { describe, expect, it } from "vitest";
import { LruCache } from "./cache";

describe("LruCache", () => {
  it("stores and retrieves values", () => {
    const cache = new LruCache<number>(10, 1000);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
  });

  it("returns stale data", async () => {
    const cache = new LruCache<number>(10, 0);
    cache.set("a", 1, 0);
    await new Promise((r) => setTimeout(r, 2));
    expect(cache.get("a")).toBeUndefined();
    expect(cache.getStale("a")).toBe(1);
  });

  it("evicts least recently used entries", () => {
    const cache = new LruCache<string>(2, 1000);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBe("3");
  });

  it("updates recent access order on get", () => {
    const cache = new LruCache<string>(2, 1000);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.get("a");
    cache.set("c", "3");
    expect(cache.get("a")).toBe("1");
    expect(cache.get("b")).toBeUndefined();
  });
});
