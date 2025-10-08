/**
 * Port interface for cache provider
 * Defines the contract that all cache implementations must follow
 */

export class CacheProvider {
  /**
   * Get a value from cache
   * @param {string} key - The cache key
   * @returns {Promise<Object|null>} The cached value or null if not found
   */
  async get(key) {
    throw new Error('Not implemented');
  }

  /**
   * Set a value in cache with TTL
   * @param {string} key - The cache key
   * @param {Object} value - The value to cache
   * @param {number} ttlSeconds - Time to live in seconds
   * @returns {Promise<void>}
   */
  async set(key, value, ttlSeconds) {
    throw new Error('Not implemented');
  }

  /**
   * Delete a value from cache
   * @param {string} key - The cache key
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error('Not implemented');
  }
}
