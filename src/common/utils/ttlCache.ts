type CacheEntry<V> = {
  value: V;
  expiresAt: number;
};

export class TtlCache<K, V> {
  private readonly store = new Map<K, CacheEntry<V>>();
  private lastPruneAt = 0;

  constructor(
    private readonly options: {
      ttlMs: number;
      maxEntries?: number;
      pruneIntervalMs?: number;
    }
  ) {}

  get(key: K): V | null {
    if (this.options.ttlMs <= 0) return null;
    const now = Date.now();
    this.pruneIfNeeded(now);

    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.options.ttlMs <= 0) return;
    const now = Date.now();
    this.pruneIfNeeded(now);
    this.store.set(key, { value, expiresAt: now + this.options.ttlMs });
    this.trim();
  }

  delete(key: K): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  async getOrSet(key: K, factory: () => Promise<V>): Promise<V> {
    const cached = this.get(key);
    if (cached !== null) return cached;

    const value = await factory();
    this.set(key, value);
    return value;
  }

  private pruneIfNeeded(now: number): void {
    const interval = this.options.pruneIntervalMs ?? Math.max(this.options.ttlMs, 30_000);
    if (now - this.lastPruneAt < interval) return;
    this.lastPruneAt = now;
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key);
    }
  }

  private trim(): void {
    const maxEntries = this.options.maxEntries;
    if (!maxEntries || this.store.size <= maxEntries) return;

    const overflow = this.store.size - maxEntries;
    let deleted = 0;
    for (const key of this.store.keys()) {
      this.store.delete(key);
      deleted += 1;
      if (deleted >= overflow) break;
    }
  }
}
