// services/redisService.js - Redis cache service for bot messages
import Redis from 'ioredis';
import env from '../config/env.js';

let redisClient = null;

// Khởi tạo Redis connection
export function initRedis() {
    if (redisClient) {
        return redisClient;
    }

    try {
        const redisUrl = env.REDIS_URL || 'redis://localhost:6379';
        redisClient = new Redis(redisUrl, {
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });

        redisClient.on('error', (err) => {
            console.error('[Redis] Connection error:', err.message);
        });

        redisClient.on('connect', () => {
            console.log('[Redis] Connected successfully');
        });

        redisClient.on('ready', () => {
            console.log('[Redis] Ready to use');
        });

        redisClient.connect().catch(err => {
            console.error('[Redis] Failed to connect:', err.message);
        });

        return redisClient;
    } catch (error) {
        console.error('[Redis] Initialization error:', error.message);
        return null;
    }
}

// Lưu thông tin tin nhắn bot vào cache
// TTL mặc định 5 phút (300 giây)
export async function cacheBotMessage(messageId, data, ttl = 300) {
    if (!redisClient || !messageId) {
        console.warn('[Redis] Client not initialized or messageId missing');
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
        console.error('[Redis] Error caching message:', error.message);
        return false;
    }
}

// Kiểm tra xem tin nhắn có phải là bot message không
export async function checkBotMessage(messageId) {
    if (!redisClient || !messageId) {
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
        console.error('[Redis] Error checking message:', error.message);
        return null;
    }
}

// Xóa tin nhắn khỏi cache
export async function removeBotMessage(messageId) {
    if (!redisClient || !messageId) {
        return false;
    }

    try {
        const key = `bot_message:${messageId}`;
        await redisClient.del(key);
        console.log(`[Redis] Removed bot message from cache: ${messageId}`);
        return true;
    } catch (error) {
        console.error('[Redis] Error removing message:', error.message);
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
