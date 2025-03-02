/**
 * Simple in-memory cache for expensive operations
 * For production use, consider using Redis or another distributed cache
 */

// Cache item with expiration
interface CacheItem<T> {
    value: T;
    expiry: number;
  }
  
  // Configuration for the cache
  interface CacheConfig {
    defaultTtl: number; // Default TTL in milliseconds
    maxItems: number;   // Maximum number of items in the cache
  }
  
  // Global cache storage
  const cache: Map<string, CacheItem<any>> = new Map();
  
  // Default configuration
  const defaultConfig: CacheConfig = {
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    maxItems: 1000
  };
  
  /**
   * Get an item from the cache
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  export function getCached<T>(key: string): T | undefined {
    const item = cache.get(key);
    const now = Date.now();
    
    // Return undefined if not found or expired
    if (!item || item.expiry <= now) {
      if (item) {
        // Clean up expired item
        cache.delete(key);
      }
      return undefined;
    }
    
    return item.value as T;
  }
  
  /**
   * Set an item in the cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds (optional)
   */
  export function setCached<T>(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiry = now + (ttl || defaultConfig.defaultTtl);
    
    // Check if we need to clean up the cache
    if (cache.size >= defaultConfig.maxItems) {
      // Find and delete the oldest entry
      let oldestKey: string | null = null;
      let oldestExpiry = Number.MAX_SAFE_INTEGER;
      
      for (const [entryKey, entryValue] of cache.entries()) {
        if (entryValue.expiry < oldestExpiry) {
          oldestKey = entryKey;
          oldestExpiry = entryValue.expiry;
        }
      }
      
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }
    
    // Store the new value
    cache.set(key, { value, expiry });
  }
  
  /**
   * Delete an item from the cache
   * @param key Cache key
   * @returns true if item was deleted, false if not found
   */
  export function deleteCached(key: string): boolean {
    return cache.delete(key);
  }
  
  /**
   * Clear all items from the cache
   */
  export function clearCache(): void {
    cache.clear();
  }
  
  /**
   * Get an item from the cache or compute and cache it if not found
   * @param key Cache key
   * @param computer Function to compute the value if not found
   * @param ttl Time to live in milliseconds (optional)
   * @returns Cached or computed value
   */
  export async function getCachedOrCompute<T>(
    key: string,
    computer: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cachedValue = getCached<T>(key);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    // Compute the value
    const computedValue = await computer();
    
    // Cache the computed value
    setCached(key, computedValue, ttl);
    
    return computedValue;
  }
  
  /**
   * Create a cache key from parts
   * @param parts Parts to combine into a key
   * @returns Combined cache key
   */
  export function createCacheKey(...parts: (string | number | boolean | undefined)[]): string {
    return parts.filter(part => part !== undefined).join(':');
  }