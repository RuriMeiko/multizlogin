// services/redisService.js - Redis cache service for bot messages
import Redis from 'ioredis';
import env from '../config/env.js';

let redisClient = null;
let isRedisAvailable = false;

// Khởi tạo Redis connection
export function initRedis() {
    if (redisClient) {
        return redisClient;
    }

    try {
        const redisUrl = env.REDIS_URL || 'redis://localhost:6379';
        console.log(`[Redis] Attempting to connect to: ${redisUrl}`);
        
        redisClient = new Redis(redisUrl, {
            retryStrategy(times) {
                // Tăng số lần retry lên 10 và thời gian chờ lâu hơn cho startup
                if (times > 10) {
                    console.warn('[Redis] Max retry attempts reached. Bot caching will be disabled.');
                    isRedisAvailable = false;
                    return null; // Dừng retry
                }
                // Tăng delay để chờ Redis container ready
                const delay = Math.min(times * 2000, 10000); // Tối đa 10 giây
                console.log(`[Redis] Retry attempt ${times}, waiting ${delay}ms...`);
                return delay;
            },
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            enableOfflineQueue: false, // Không queue commands khi offline
            connectTimeout: 10000, // 10 giây timeout
        });

        redisClient.on('error', (err) => {
            isRedisAvailable = false;
            // Chỉ log error một lần, không spam
            if (!redisClient._errorLogged) {
                console.error('[Redis] Connection error:', err.message);
                console.warn('[Redis] Bot message caching is disabled. App will continue without Redis.');
                redisClient._errorLogged = true;
            }
        });

        redisClient.on('connect', () => {
            console.log('[Redis] Connected successfully');
            isRedisAvailable = true;
            redisClient._errorLogged = false;
        });

        redisClient.on('ready', () => {
            console.log('[Redis] Ready to use');
            isRedisAvailable = true;
        });

        redisClient.on('close', () => {
            console.warn('[Redis] Connection closed');
            isRedisAvailable = false;
        });

        redisClient.connect().catch(err => {
            console.error('[Redis] Failed to connect:', err.message);
            console.warn('[Redis] Bot message caching is disabled. App will continue without Redis.');
            isRedisAvailable = false;
        });

        return redisClient;
    } catch (error) {
        console.error('[Redis] Initialization error:', error.message);
        console.warn('[Redis] Bot message caching is disabled. App will continue without Redis.');
        isRedisAvailable = false;
        return null;
    }
}

// Lưu thông tin tin nhắn bot vào cache
// TTL mặc định 5 phút (300 giây)
export async function cacheBotMessage(messageId, data, ttl = 300) {
    console.log(`[Redis-Cache] Attempting to cache message: ${messageId}`);
    console.log(`[Redis-Cache] isRedisAvailable: ${isRedisAvailable}, redisClient exists: ${!!redisClient}`);
    
    if (!redisClient || !isRedisAvailable || !messageId) {
        console.warn(`[Redis-Cache] ⚠️ Cannot cache - redisClient: ${!!redisClient}, available: ${isRedisAvailable}, messageId: ${!!messageId}`);
        return false;
    }

    try {
        const key = `bot_message:${messageId}`;
        const value = JSON.stringify({
            ...data,
            cachedAt: Date.now()
        });
        
        await redisClient.setex(key, ttl, value);
        console.log(`[Redis-Cache] ✅ Successfully cached bot message: ${messageId} (TTL: ${ttl}s)`);
        console.log(`[Redis-Cache] Cached data:`, data);
        return true;
    } catch (error) {
        console.error(`[Redis-Cache] ❌ Error caching message ${messageId}:`, error.message);
        return false;
    }
}

// Kiểm tra xem tin nhắn có phải là bot message không
export async function checkBotMessage(messageId) {
    console.log(`[Redis-Check] Checking message: ${messageId}`);
    console.log(`[Redis-Check] isRedisAvailable: ${isRedisAvailable}, redisClient exists: ${!!redisClient}`);
    
    if (!redisClient || !isRedisAvailable || !messageId) {
        console.warn(`[Redis-Check] ⚠️ Cannot check - redisClient: ${!!redisClient}, available: ${isRedisAvailable}, messageId: ${!!messageId}`);
        return null;
    }

    try {
        const key = `bot_message:${messageId}`;
        console.log(`[Redis-Check] Looking for key: ${key}`);
        const value = await redisClient.get(key);
        
        if (value) {
            const parsed = JSON.parse(value);
            console.log(`[Redis-Check] ✅ Found bot message in cache: ${messageId}`);
            console.log(`[Redis-Check] Cached data:`, parsed);
            return parsed;
        } else {
            console.log(`[Redis-Check] ❌ Message ${messageId} not found in cache`);
        }
        
        return null;
    } catch (error) {
        console.error(`[Redis-Check] ❌ Error checking message ${messageId}:`, error.message);
        return null;
    }
}

// Xóa tin nhắn khỏi cache
export async function removeBotMessage(messageId) {
    if (!redisClient || !isRedisAvailable || !messageId) {
        return false;
    }

    try {
        const key = `bot_message:${messageId}`;
        await redisClient.del(key);
        console.log(`[Redis] Removed bot message from cache: ${messageId}`);
        return true;
    } catch (error) {
        // Silent fail
        return false;
    }
}

// Đóng Redis connection (dùng khi shutdown server)
export async function closeRedis() {
    if (redisClient) {
        try {
            await redisClient.quit();
            console.log('[Redis] Connection closed');
            redisClient = null;
        } catch (error) {
            console.error('[Redis] Error closing connection:', error.message);
        }
    }
}

export default {
    initRedis,
    cacheBotMessage,
    checkBotMessage,
    removeBotMessage,
    closeRedis
};
