import { redisClient } from "../config/redis.config.js";
import { logger } from "../logger/winston.logger.js";
import { ApiResponse } from "../utils/apiResponse.js";

export class CacheManager {
  /**
   * Safely retrieve and parse data from Redis.
   * Returns an ApiResponse on cache hit, or null on cache miss or Redis failure.
   */
  public static async get<T>(key: string): Promise<ApiResponse<T> | null> {
    try {
      const data = await redisClient.get(key);
      if (!data) return null;

      const parsedData = JSON.parse(data) as T;
      
      // Utilize your existing ApiResponse static success factory
      return ApiResponse.success<T>(parsedData, "Data fetched from cache successfully");
    } catch (error) {
      logger.error(`Redis Fault [Get Key: ${key}]:`, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Safely store data in Redis with a TTL.
   * Returns true on success, false on failure (ensuring app execution continues).
   */
  public static async set<T>(
    key: string,
    value: T,
    ttlInSeconds: number = 3600
  ): Promise<boolean> {
    try {
      const serializedData = JSON.stringify(value);
      await redisClient.setex(key, ttlInSeconds, serializedData);
      return true;
    } catch (error) {
      logger.error(`Redis Fault [Set Key: ${key}]:`, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  /**
   * Safely delete a key from Redis.
   * Returns true on success, false on failure.
   */
  public static async delete(key: string): Promise<boolean> {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis Fault [Delete Key: ${key}]:`, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }
}