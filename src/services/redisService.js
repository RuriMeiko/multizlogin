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
                // Sau 5 lần thử, dừng retry và đánh dấu Redis unavailable
                if (times > 5) {
                    console.warn('[Redis] Max retry attempts reached. Bot caching will be disabled.');
                    isRedisAvailable = false;
                    return null; // Dừng retry
                }
                const delay = Math.min(times * 1000, 5000);
                console.log(`[Redis] Retry attempt ${times}, waiting ${delay}ms...`);
                return delay;
            },
            maxRetriesPerRequest: 1, // Giảm xuống 1 để fail fast
            lazyConnect: true,
            enableOfflineQueue: false, // Không queue commands khi offline
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
    if (!redisClient || !isRedisAvailable || !messageId) {
        // Không log warning nữa để tránh spam log
        return false;
    }

    try {
        const key = `bot_message:${messageId}`;
        const value = JSON.stringify({
            ...data,
            cachedAt: Date.now()
        });
        
        await redisClient.setex(key, ttl, value);
        console.log(`[Redis] Cached bot message: ${messageId} (TTL: ${ttl}s)`);
        return true;
    } catch (error) {
        // Silent fail - không spam log
        return false;
    }
}

// Kiểm tra xem tin nhắn có phải là bot message không
export async function checkBotMessage(messageId) {
    if (!redisClient || !isRedisAvailable || !messageId) {
        return null;
    }

    try {
        const key = `bot_message:${messageId}`;
        const value = await redisClient.get(key);
        
        if (value) {
            console.log(`[Redis] Found bot message in cache: ${messageId}`);
            return JSON.parse(value);
        }
        
        return null;
    } catch (error) {
        // Silent fail
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
