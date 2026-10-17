// Simple LRU cache with TTL and optional stale-on-error fallback.
interface Entry<T> {
  data: T;
  expires: number;
  lastAccess: number;
}

export class LruCache<T = unknown> {
  private store = new Map<string, Entry<T>>();

  constructor(
    private maxSize: number,
    private defaultTtlMs: number,
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires <= Date.now()) return undefined;
    entry.lastAccess = Date.now();
    // Move to end to mark recently used
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T, ttlMs?: number): void {
    const expires = Date.now() + (ttlMs !== undefined ? ttlMs : this.defaultTtlMs);
    if (this.store.has(key)) this.store.delete(key);
    else if (this.store.size >= this.maxSize) this.evictLru();
    this.store.set(key, { data, expires, lastAccess: Date.now() });
  }

  /** Returns stale data if present, even if expired. Useful for fallback on upstream errors. */
  getStale(key: string): T | undefined {
    return this.store.get(key)?.data;
  }

  /** True only if a non-expired entry exists. */
  hasFresh(key: string): boolean {
    const entry = this.store.get(key);
    return entry !== undefined && entry.expires > Date.now();
  }

  private evictLru(): void {
    const first = this.store.keys().next().value;
    if (first !== undefined) this.store.delete(first);
  }
}
