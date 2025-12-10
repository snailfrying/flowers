/**
 * LRU (Least Recently Used) Cache implementation
 * Used to cache LLM API responses to reduce redundant calls
 */

export interface CacheEntry<V> {
    value: V;
    timestamp: number;
    hitCount: number;
}

export interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
}

/**
 * Generic LRU Cache with TTL (Time To Live) support
 * 
 * @template K - Key type
 * @template V - Value type
 * 
 * @example
 * const cache = new LRUCache<string, string>({ maxSize: 50, ttl: 5 * 60 * 1000 });
 * cache.set('key', 'value');
 * const value = cache.get('key'); // Returns 'value' if not expired
 */
export class LRUCache<K, V> {
    private cache = new Map<K, CacheEntry<V>>();
    private maxSize: number;
    private ttl: number; // Time to live in milliseconds
    private stats = { hits: 0, misses: 0 };

    /**
     * @param maxSize - Maximum number of entries to store
     * @param ttl - Time to live in milliseconds (default: 5 minutes)
     */
    constructor(options: { maxSize?: number; ttl?: number } = {}) {
        this.maxSize = options.maxSize ?? 50;
        this.ttl = options.ttl ?? 5 * 60 * 1000; // Default 5 minutes
    }

    /**
     * Get value from cache
     * Returns undefined if key doesn't exist or entry has expired
     */
    get(key: K): V | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return undefined;
        }

        // Check if entry has expired
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            this.stats.misses++;
            return undefined;
        }

        // Update access order (move to end)
        this.cache.delete(key);
        entry.hitCount++;
        this.cache.set(key, entry);
        this.stats.hits++;

        return entry.value;
    }

    /**
     * Set value in cache
     * If cache is full, removes the least recently used entry
     */
    set(key: K, value: V): void {
        // If key exists, update it
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        // If cache is full, remove oldest entry (first in Map)
        else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value as K;
            this.cache.delete(firstKey);
        }

        // Add new entry
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            hitCount: 0
        });
    }

    /**
     * Check if key exists in cache and is not expired
     */
    has(key: K): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Delete a specific key from cache
     */
    delete(key: K): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all entries from cache
     */
    clear(): void {
        this.cache.clear();
        this.stats = { hits: 0, misses: 0 };
    }

    /**
     * Get current cache size
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const total = this.stats.hits + this.stats.misses;
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            size: this.cache.size,
            hitRate: total > 0 ? this.stats.hits / total : 0
        };
    }

    /**
     * Clean up expired entries
     * Useful for long-running processes
     */
    cleanup(): void {
        const now = Date.now();
        const keysToDelete: K[] = [];

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Get all cache entries (for debugging)
     */
    entries(): Array<[K, CacheEntry<V>]> {
        return Array.from(this.cache.entries());
    }
}

/**
 * Helper function to generate cache key from object
 * Useful for creating consistent cache keys
 */
export function generateCacheKey(obj: Record<string, any>): string {
    // Sort keys to ensure consistent ordering
    const sortedKeys = Object.keys(obj).sort();
    const parts = sortedKeys.map(key => {
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
            return `${key}:${JSON.stringify(value)}`;
        }
        return `${key}:${String(value)}`;
    });
    return parts.join('|');
}

/**
 * Helper function to hash string to shorter key
 * Useful for long text inputs
 */
export function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
}
