import * as FileSystem from 'expo-file-system';

interface CachedImageItem {
  localPath: string;
  timestamp: number;
  fileSize: number;
  originalUrl: string;
}

interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitRate: number;
  requests: number;
  hits: number;
}

class ChatImageCache {
  private cacheDirectory: string;
  private imageIndex: Map<string, CachedImageItem> = new Map();
  private maxCacheSize: number = 100 * 1024 * 1024; // 100MB
  private maxFileAge: number = 7 * 24 * 60 * 60 * 1000; // 7 days
  private stats: CacheStats = { totalItems: 0, totalSize: 0, hitRate: 0, requests: 0, hits: 0 };

  constructor() {
    this.cacheDirectory = `${FileSystem.cacheDirectory}chat_images/`;
    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    try {
      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDirectory, { intermediates: true });
        console.log('🗂️ [ImageCache] Created cache directory');
      }

      // Load existing cache index
      await this.loadCacheIndex();
      
      // Clean up expired files
      await this.performCleanup();
      
      console.log(`🚀 [ImageCache] Initialized with ${this.imageIndex.size} cached images`);
    } catch (error) {
      console.error('❌ [ImageCache] Failed to initialize:', error);
    }
  }

  private generateCacheKey(imageUrl: string): string {
    // Create a safe filename from the URL
    return imageUrl
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 100) + '_' + 
      imageUrl.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0).toString(36);
  }

  private async loadCacheIndex(): Promise<void> {
    try {
      const indexFilePath = `${this.cacheDirectory}cache_index.json`;
      const indexFileInfo = await FileSystem.getInfoAsync(indexFilePath);
      
      if (indexFileInfo.exists) {
        const indexContent = await FileSystem.readAsStringAsync(indexFilePath);
        const indexData = JSON.parse(indexContent);
        this.imageIndex = new Map(Object.entries(indexData));
        
        // Update stats
        this.updateCacheStats();
        console.log(`📋 [ImageCache] Loaded ${this.imageIndex.size} items from index`);
      }
    } catch (error) {
      console.error('⚠️ [ImageCache] Failed to load cache index:', error);
      this.imageIndex.clear();
    }
  }

  private async saveCacheIndex(): Promise<void> {
    try {
      const indexFilePath = `${this.cacheDirectory}cache_index.json`;
      const indexData = Object.fromEntries(this.imageIndex);
      await FileSystem.writeAsStringAsync(indexFilePath, JSON.stringify(indexData));
    } catch (error) {
      console.error('⚠️ [ImageCache] Failed to save cache index:', error);
    }
  }

  private async performCleanup(): Promise<void> {
    const currentTime = Date.now();
    const expiredKeys: string[] = [];
    let cleanupSize = 0;

    // Find expired files
    for (const [key, item] of this.imageIndex) {
      if (currentTime - item.timestamp > this.maxFileAge) {
        expiredKeys.push(key);
        cleanupSize += item.fileSize;
      }
    }

    // Remove expired files
    for (const key of expiredKeys) {
      const item = this.imageIndex.get(key);
      if (item) {
        try {
          await FileSystem.deleteAsync(item.localPath, { idempotent: true });
          this.imageIndex.delete(key);
        } catch (error) {
          console.error(`⚠️ [ImageCache] Failed to delete expired file ${key}:`, error);
        }
      }
    }

    if (expiredKeys.length > 0) {
      await this.saveCacheIndex();
      this.updateCacheStats();
      console.log(`🧹 [ImageCache] Cleaned up ${expiredKeys.length} expired files (${Math.round(cleanupSize / 1024)}KB freed)`);
    }

    // Check if cache size is over limit and perform LRU cleanup
    await this.performSizeCleanup();
  }

  private async performSizeCleanup(): Promise<void> {
    if (this.stats.totalSize <= this.maxCacheSize) return;

    // Sort by timestamp (oldest first) for LRU cleanup
    const sortedItems = Array.from(this.imageIndex.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    let freedSize = 0;
    let removedCount = 0;

    for (const [key, item] of sortedItems) {
      if (this.stats.totalSize - freedSize <= this.maxCacheSize * 0.8) break; // Keep 20% buffer

      try {
        await FileSystem.deleteAsync(item.localPath, { idempotent: true });
        this.imageIndex.delete(key);
        freedSize += item.fileSize;
        removedCount++;
      } catch (error) {
        console.error(`⚠️ [ImageCache] Failed to delete file during size cleanup:`, error);
      }
    }

    if (removedCount > 0) {
      await this.saveCacheIndex();
      this.updateCacheStats();
      console.log(`📦 [ImageCache] Size cleanup: removed ${removedCount} files (${Math.round(freedSize / 1024)}KB freed)`);
    }
  }

  private updateCacheStats(): void {
    this.stats.totalItems = this.imageIndex.size;
    this.stats.totalSize = Array.from(this.imageIndex.values())
      .reduce((total, item) => total + item.fileSize, 0);
    this.stats.hitRate = this.stats.requests > 0 ? (this.stats.hits / this.stats.requests) * 100 : 0;
  }

  public async getCachedImagePath(imageUrl: string): Promise<string> {
    this.stats.requests++;
    
    const cacheKey = this.generateCacheKey(imageUrl);
    const cachedItem = this.imageIndex.get(cacheKey);
    const localPath = `${this.cacheDirectory}${cacheKey}`;

    console.log(`🖼️ [ImageCache] Request: ${imageUrl.substring(0, 60)}...`);

    // Check if cached file exists and is valid
    if (cachedItem) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(cachedItem.localPath);
        const isExpired = Date.now() - cachedItem.timestamp > this.maxFileAge;
        
        if (fileInfo.exists && !isExpired) {
          this.stats.hits++;
          this.updateCacheStats();
          console.log(`✅ [ImageCache] Cache HIT (${Math.round(fileInfo.size! / 1024)}KB) - Age: ${Math.round((Date.now() - cachedItem.timestamp) / 1000)}s`);
          return cachedItem.localPath;
        } else if (isExpired) {
          console.log(`⏰ [ImageCache] Cache EXPIRED - removing`);
          this.imageIndex.delete(cacheKey);
        }
      } catch (error) {
        console.error('⚠️ [ImageCache] Error checking cached file:', error);
        this.imageIndex.delete(cacheKey);
      }
    }

    console.log(`❌ [ImageCache] Cache MISS - downloading...`);

    // Handle local files (don't cache local images)
    if (imageUrl.startsWith('file://') || imageUrl.includes('ImagePicker') || imageUrl.includes('CameraPictures')) {
      console.log(`📱 [ImageCache] Local file detected, returning original path`);
      return imageUrl;
    }

    // Download and cache the image
    try {
      console.log(`⬇️ [ImageCache] Downloading: ${imageUrl}`);
      const downloadResult = await FileSystem.downloadAsync(imageUrl, localPath);
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      
      if (fileInfo.exists && fileInfo.size! > 0) {
        // Add to cache index
        this.imageIndex.set(cacheKey, {
          localPath: downloadResult.uri,
          timestamp: Date.now(),
          fileSize: fileInfo.size!,
          originalUrl: imageUrl
        });

        await this.saveCacheIndex();
        this.updateCacheStats();
        
        console.log(`✅ [ImageCache] Cached successfully (${Math.round(fileInfo.size! / 1024)}KB)`);
        console.log(`📊 [ImageCache] Stats: ${this.stats.totalItems} items, ${Math.round(this.stats.totalSize / 1024)}KB, ${this.stats.hitRate.toFixed(1)}% hit rate`);
        
        return downloadResult.uri;
      } else {
        console.log(`❌ [ImageCache] Downloaded file is empty or invalid`);
      }
    } catch (error) {
      console.error('❌ [ImageCache] Download failed:', error);
    }

    // Fallback to original URL
    console.log(`🔄 [ImageCache] Falling back to original URL`);
    return imageUrl;
  }

  public async preloadImages(imageUrls: string[]): Promise<void> {
    console.log(`🚀 [ImageCache] Preloading ${imageUrls.length} images...`);
    
    const preloadPromises = imageUrls.map(async (url) => {
      try {
        await this.getCachedImagePath(url);
      } catch (error) {
        console.error(`⚠️ [ImageCache] Preload failed for: ${url}`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    console.log(`✅ [ImageCache] Preloading completed`);
  }

  public async clearAllCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.cacheDirectory, { idempotent: true });
      this.imageIndex.clear();
      this.stats = { totalItems: 0, totalSize: 0, hitRate: 0, requests: 0, hits: 0 };
      await this.initializeCache();
      console.log(`🗑️ [ImageCache] Cache cleared completely`);
    } catch (error) {
      console.error('❌ [ImageCache] Failed to clear cache:', error);
    }
  }

  public getCacheStats(): CacheStats {
    this.updateCacheStats();
    return { ...this.stats };
  }

  public async getCacheSizeInMB(): Promise<number> {
    this.updateCacheStats();
    return this.stats.totalSize / (1024 * 1024);
  }
}

// Export singleton instance
export const chatImageCache = new ChatImageCache();

// Periodic cleanup every 30 minutes
setInterval(async () => {
  try {
    await (chatImageCache as any).performCleanup();
  } catch (error) {
    console.error('⚠️ [ImageCache] Periodic cleanup failed:', error);
  }
}, 30 * 60 * 1000);

// Development stats logging
if (__DEV__) {
  setInterval(() => {
    const stats = chatImageCache.getCacheStats();
    console.log(`📊 [ImageCache] Stats: ${stats.totalItems} items, ${Math.round(stats.totalSize / 1024)}KB, ${stats.hitRate.toFixed(1)}% hit rate`);
  }, 2 * 60 * 1000);
}