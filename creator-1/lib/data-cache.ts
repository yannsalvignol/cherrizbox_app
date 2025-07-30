interface DataCacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

interface CacheMetrics {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRatio: number;
  lastCleanup: number;
}

class ChatDataCache {
  private cacheStore: Map<string, DataCacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes
  private metrics: CacheMetrics = {
    totalEntries: 0,
    hitCount: 0,
    missCount: 0,
    hitRatio: 0,
    lastCleanup: Date.now()
  };

  constructor() {
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.performCleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private performCleanup(): void {
    const currentTime = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cacheStore) {
      if (currentTime - entry.timestamp > entry.ttlMs) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      expiredKeys.forEach(key => this.cacheStore.delete(key));
      this.updateMetrics();
      console.log(`🧹 [DataCache] Cleanup: removed ${expiredKeys.length} expired entries. Total: ${this.cacheStore.size} entries`);
    }

    this.metrics.lastCleanup = currentTime;
  }

  private updateMetrics(): void {
    this.metrics.totalEntries = this.cacheStore.size;
    const totalRequests = this.metrics.hitCount + this.metrics.missCount;
    this.metrics.hitRatio = totalRequests > 0 ? (this.metrics.hitCount / totalRequests) * 100 : 0;
  }

  // Core cache operations
  public set<T>(key: string, data: T, customTTL?: number): void {
    const ttl = customTTL || this.defaultTTL;
    console.log(`💾 [DataCache] SET: ${key} (TTL: ${Math.round(ttl / 1000)}s)`);
    
    this.cacheStore.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs: ttl
    });
    
    this.updateMetrics();
  }

  public get<T>(key: string): T | null {
    const entry = this.cacheStore.get(key);
    
    if (!entry) {
      this.metrics.missCount++;
      console.log(`❌ [DataCache] MISS: ${key}`);
      this.updateMetrics();
      return null;
    }

    const currentTime = Date.now();
    const age = currentTime - entry.timestamp;
    
    if (age > entry.ttlMs) {
      this.cacheStore.delete(key);
      this.metrics.missCount++;
      console.log(`⏰ [DataCache] EXPIRED: ${key} (age: ${Math.round(age / 1000)}s, TTL: ${Math.round(entry.ttlMs / 1000)}s)`);
      this.updateMetrics();
      return null;
    }

    this.metrics.hitCount++;
    console.log(`✅ [DataCache] HIT: ${key} (age: ${Math.round(age / 1000)}s)`);
    this.updateMetrics();
    return entry.data as T;
  }

  public has(key: string): boolean {
    const entry = this.cacheStore.get(key);
    if (!entry) return false;

    const currentTime = Date.now();
    if (currentTime - entry.timestamp > entry.ttlMs) {
      this.cacheStore.delete(key);
      return false;
    }

    return true;
  }

  public delete(key: string): boolean {
    const deleted = this.cacheStore.delete(key);
    if (deleted) {
      this.updateMetrics();
      console.log(`🗑️ [DataCache] DELETE: ${key}`);
    }
    return deleted;
  }

  public clear(): void {
    this.cacheStore.clear();
    this.metrics.hitCount = 0;
    this.metrics.missCount = 0;
    this.updateMetrics();
    console.log(`🗑️ [DataCache] CLEAR: All entries removed`);
  }

  // Get-or-fetch pattern for easy integration
  public async getOrFetch<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    customTTL?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    console.log(`🔄 [DataCache] Fetching data for: ${key}`);
    const data = await fetchFunction();
    this.set(key, data, customTTL);
    return data;
  }

  // Creator profile management
  public getCachedCreatorProfile(creatorId: string): any | null {
    return this.get(`creator_profile_${creatorId}`);
  }

  public setCachedCreatorProfile(creatorId: string, profile: any): void {
    this.set(`creator_profile_${creatorId}`, profile, 10 * 60 * 1000); // 10 minutes
  }

  public async getOrFetchCreatorProfile(
    creatorId: string,
    fetchFunction: () => Promise<any>
  ): Promise<any> {
    return this.getOrFetch(`creator_profile_${creatorId}`, fetchFunction, 10 * 60 * 1000);
  }

  // Purchase status management
  public getCachedPurchaseStatus(userId: string, contentId: string): boolean | null {
    return this.get(`purchase_${userId}_${contentId}`);
  }

  public setCachedPurchaseStatus(userId: string, contentId: string, purchased: boolean): void {
    this.set(`purchase_${userId}_${contentId}`, purchased, 2 * 60 * 1000); // 2 minutes
  }

  public async getOrFetchPurchaseStatus(
    userId: string,
    contentId: string,
    fetchFunction: () => Promise<boolean>
  ): Promise<boolean> {
    return this.getOrFetch(`purchase_${userId}_${contentId}`, fetchFunction, 2 * 60 * 1000);
  }

  // Follower count management  
  public getCachedFollowerCount(creatorName: string): number | null {
    return this.get(`followers_${creatorName}`);
  }

  public setCachedFollowerCount(creatorName: string, count: number): void {
    this.set(`followers_${creatorName}`, count, 5 * 60 * 1000); // 5 minutes
  }

  public async getOrFetchFollowerCount(
    creatorName: string,
    fetchFunction: () => Promise<number>
  ): Promise<number> {
    return this.getOrFetch(`followers_${creatorName}`, fetchFunction, 5 * 60 * 1000);
  }

  // Profile image management
  public getCachedProfileImage(userId: string): string | null {
    return this.get(`profile_image_${userId}`);
  }

  public setCachedProfileImage(userId: string, imageUrl: string): void {
    this.set(`profile_image_${userId}`, imageUrl, 30 * 60 * 1000); // 30 minutes
  }

  public async getOrFetchProfileImage(
    userId: string,
    fetchFunction: () => Promise<string>
  ): Promise<string> {
    return this.getOrFetch(`profile_image_${userId}`, fetchFunction, 30 * 60 * 1000);
  }

  // User session data
  public getCachedUserSession(userId: string): any | null {
    return this.get(`user_session_${userId}`);
  }

  public setCachedUserSession(userId: string, sessionData: any): void {
    this.set(`user_session_${userId}`, sessionData, 60 * 60 * 1000); // 1 hour
  }

  // Channel member data
  public getCachedChannelMembers(channelId: string): any[] | null {
    return this.get(`channel_members_${channelId}`);
  }

  public setCachedChannelMembers(channelId: string, members: any[]): void {
    this.set(`channel_members_${channelId}`, members, 15 * 60 * 1000); // 15 minutes
  }

  // Statistics and monitoring
  public getCacheMetrics(): CacheMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  public getCacheSize(): number {
    return this.cacheStore.size;
  }

  public getMemoryUsageEstimate(): number {
    // Rough estimate of memory usage in KB
    const jsonSize = JSON.stringify(Array.from(this.cacheStore.entries())).length;
    return Math.round(jsonSize / 1024);
  }

  // Bulk operations
  public prefetchData(keyFunctionPairs: Array<{ key: string; fetchFn: () => Promise<any>; ttl?: number }>): void {
    console.log(`🚀 [DataCache] Starting bulk prefetch of ${keyFunctionPairs.length} items`);
    
    keyFunctionPairs.forEach(async ({ key, fetchFn, ttl }) => {
      try {
        if (!this.has(key)) {
          const data = await fetchFn();
          this.set(key, data, ttl);
        }
      } catch (error) {
        console.error(`⚠️ [DataCache] Prefetch failed for ${key}:`, error);
      }
    });
  }

  public invalidatePattern(pattern: string): number {
    const keysToDelete: string[] = [];
    
    for (const key of this.cacheStore.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cacheStore.delete(key));
    this.updateMetrics();
    
    console.log(`🗑️ [DataCache] Invalidated ${keysToDelete.length} entries matching pattern: ${pattern}`);
    return keysToDelete.length;
  }
}

// Export singleton instance
export const chatDataCache = new ChatDataCache();

// Development monitoring
if (__DEV__) {
  setInterval(() => {
    const metrics = chatDataCache.getCacheMetrics();
    const memoryKB = chatDataCache.getMemoryUsageEstimate();
    console.log(`📊 [DataCache] Stats: ${metrics.totalEntries} entries, ${memoryKB}KB memory, ${metrics.hitRatio.toFixed(1)}% hit rate`);
  }, 3 * 60 * 1000); // Every 3 minutes
}