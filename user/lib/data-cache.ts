interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class DataCacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    console.log(`  [DataCache] STORE: ${key} (TTL: ${Math.round((ttl || this.defaultTTL) / 1000)}s)`);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
    console.log(`  [DataCache] Cache size: ${this.cache.size} items`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      console.log(`  [DataCache] MISS: ${key}`);
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    if (age > entry.ttl) {
      console.log(`  [DataCache] EXPIRED: ${key} (age: ${Math.round(age / 1000)}s, TTL: ${Math.round(entry.ttl / 1000)}s)`);
      this.cache.delete(key);
      return null;
    }

    console.log(` [DataCache] HIT: ${key} (age: ${Math.round(age / 1000)}s)`);
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      console.log(`🧹 [DataCache] CLEANUP: Removing ${expiredKeys.length} expired entries`);
      expiredKeys.forEach(key => this.cache.delete(key));
      console.log(`  [DataCache] Cache size after cleanup: ${this.cache.size} items`);
    }
  }

  getSize(): number {
    return this.cache.size;
  }

  // Helper methods for common cache patterns
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }

  // Creator-specific cache methods
  getCreatorProfile(creatorId: string): any | null {
    return this.get(`creator_profile_${creatorId}`);
  }

  setCreatorProfile(creatorId: string, profile: any): void {
    this.set(`creator_profile_${creatorId}`, profile, 10 * 60 * 1000); // 10 minutes
  }

  // Purchase status cache methods
  getPurchaseStatus(userId: string, contentId: string): boolean | null {
    return this.get(`purchase_${userId}_${contentId}`);
  }

  setPurchaseStatus(userId: string, contentId: string, status: boolean): void {
    this.set(`purchase_${userId}_${contentId}`, status, 2 * 60 * 1000); // 2 minutes
  }

  // Follower count cache methods
  getFollowerCount(creatorName: string): number | null {
    return this.get(`followers_${creatorName}`);
  }

  setFollowerCount(creatorName: string, count: number): void {
    this.set(`followers_${creatorName}`, count, 5 * 60 * 1000); // 5 minutes
  }
}

export const dataCache = new DataCacheManager();

// Cleanup expired entries every 5 minutes and show cache stats
setInterval(() => {
  const sizeBefore = dataCache.getSize();
  dataCache.cleanup();
  const sizeAfter = dataCache.getSize();
  console.log(`  [DataCache] Periodic cleanup - Before: ${sizeBefore}, After: ${sizeAfter} items`);
}, 5 * 60 * 1000);

// Show cache statistics every 2 minutes in development
if (__DEV__) {
  setInterval(() => {
    console.log(`  [DataCache] Stats - Total items: ${dataCache.getSize()}`);
  }, 2 * 60 * 1000);
}