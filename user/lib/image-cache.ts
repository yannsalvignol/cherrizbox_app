import * as FileSystem from 'expo-file-system';

interface CacheItem {
  uri: string;
  timestamp: number;
  size: number;
}

class ImageCacheManager {
  private cacheDir: string;
  private maxCacheSize: number = 100 * 1024 * 1024; // 100MB
  private maxAge: number = 7 * 24 * 60 * 60 * 1000; // 7 days
  private cache: Map<string, CacheItem> = new Map();

  constructor() {
    this.cacheDir = `${FileSystem.cacheDirectory}images/`;
    this.initializeCache();
  }

  private async initializeCache() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }
      await this.loadCacheIndex();
      await this.cleanupExpiredFiles();
    } catch (error) {
      console.error('Failed to initialize image cache:', error);
    }
  }

  private getCacheKey(uri: string): string {
    return uri.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private async loadCacheIndex() {
    try {
      const indexPath = `${this.cacheDir}index.json`;
      const indexInfo = await FileSystem.getInfoAsync(indexPath);
      if (indexInfo.exists) {
        const indexContent = await FileSystem.readAsStringAsync(indexPath);
        const cacheData = JSON.parse(indexContent);
        this.cache = new Map(cacheData);
      }
    } catch (error) {
      console.error('Failed to load cache index:', error);
    }
  }

  private async saveCacheIndex() {
    try {
      const indexPath = `${this.cacheDir}index.json`;
      const cacheData = Array.from(this.cache.entries());
      await FileSystem.writeAsStringAsync(indexPath, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to save cache index:', error);
    }
  }

  private async cleanupExpiredFiles() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache) {
      if (now - item.timestamp > this.maxAge) {
        expiredKeys.push(key);
        try {
          await FileSystem.deleteAsync(`${this.cacheDir}${key}`, { idempotent: true });
        } catch (error) {
          console.error(`Failed to delete expired cache file ${key}:`, error);
        }
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    if (expiredKeys.length > 0) {
      await this.saveCacheIndex();
    }
  }

  public async getCachedImageUri(originalUri: string): Promise<string> {
    const cacheKey = this.getCacheKey(originalUri);
    const cachedItem = this.cache.get(cacheKey);
    const cachedPath = `${this.cacheDir}${cacheKey}`;

    console.log(`🖼️ [ImageCache] Requesting image: ${originalUri.substring(0, 80)}...`);

    // Check if cached file exists and is not expired
    if (cachedItem) {
      const fileInfo = await FileSystem.getInfoAsync(cachedPath);
      if (fileInfo.exists && Date.now() - cachedItem.timestamp < this.maxAge) {
        console.log(` [ImageCache] Cache HIT - returning cached image (${Math.round(fileInfo.size! / 1024)}KB)`);
        return cachedPath;
      } else {
        console.log(`  [ImageCache] Cache EXPIRED - file age: ${Math.round((Date.now() - cachedItem.timestamp) / 1000)}s`);
      }
    } else {
      console.log(`  [ImageCache] Cache MISS - downloading and caching...`);
    }

    // Check if it's a local file (can't download local files)
    if (originalUri.startsWith('file://') || originalUri.includes('/ImagePicker/')) {
      console.log(`  [ImageCache] Local file detected, skipping cache: ${originalUri}`);
      return originalUri;
    }

    // Download and cache the image
    try {
      console.log(`⬇️ [ImageCache] Downloading: ${originalUri}`);
      const downloadResult = await FileSystem.downloadAsync(originalUri, cachedPath);
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      
      if (fileInfo.exists) {
        this.cache.set(cacheKey, {
          uri: downloadResult.uri,
          timestamp: Date.now(),
          size: fileInfo.size || 0
        });
        await this.saveCacheIndex();
        console.log(` [ImageCache] Successfully cached (${Math.round(fileInfo.size! / 1024)}KB). Cache size: ${this.cache.size} items`);
        return downloadResult.uri;
      }
    } catch (error) {
      console.error('  [ImageCache] Failed to cache image:', error);
      console.log(`🔄 [ImageCache] Falling back to original URI`);
    }

    // Fallback to original URI
    return originalUri;
  }

  public async preloadImages(uris: string[]): Promise<void> {
    const promises = uris.map(uri => this.getCachedImageUri(uri));
    await Promise.allSettled(promises);
  }

  public async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      this.cache.clear();
      await this.initializeCache();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  public getCacheSize(): number {
    let totalSize = 0;
    for (const item of this.cache.values()) {
      totalSize += item.size;
    }
    return totalSize;
  }
}

export const imageCache = new ImageCacheManager();