// services/dbService.js - PostgreSQL Database Service
import pg from 'pg';
import env from '../config/env.js';

const { Pool } = pg;

// Create connection pool
const pool = new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
    console.log('✓ PostgreSQL connected');
});

pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err);
});

// Test initial connection
(async () => {
    try {
        const client = await pool.connect();
        console.log('✓ PostgreSQL initial connection successful');
        client.release();
    } catch (err) {
        console.warn('⚠ PostgreSQL connection failed (will use file-based fallback):', err.message);
        console.warn('  → Run PostgreSQL or use docker-compose for full functionality');
    }
})();

// ==================== ZALO CREDENTIALS ====================

/**
 * Save Zalo credentials to database
 */
export async function saveZaloCredentials(ownId, credentials, phoneNumber, displayName, proxy) {
    const query = `
        INSERT INTO zalo_credentials (own_id, credentials, phone_number, display_name, proxy, last_login_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (own_id) 
        DO UPDATE SET 
            credentials = EXCLUDED.credentials,
            phone_number = EXCLUDED.phone_number,
            display_name = EXCLUDED.display_name,
            proxy = EXCLUDED.proxy,
            last_login_at = NOW(),
            updated_at = NOW()
        RETURNING *
    `;
    
    try {
        const result = await pool.query(query, [
            ownId,
            JSON.stringify(credentials),
            phoneNumber,
            displayName,
            proxy
        ]);
        console.log(`✓ Đã lưu credentials cho tài khoản ${ownId} vào database`);
        return result.rows[0];
    } catch (error) {
        console.error('Lỗi khi lưu credentials:', error);
        throw error;
    }
}

/**
 * Get Zalo credentials by ownId
 */
export async function getZaloCredentials(ownId) {
    const query = 'SELECT * FROM zalo_credentials WHERE own_id = $1';
    
    try {
        const result = await pool.query(query, [ownId]);
        if (result.rows.length > 0) {
            const row = result.rows[0];
            return {
                ownId: row.own_id,
                credentials: row.credentials,
                phoneNumber: row.phone_number,
                displayName: row.display_name,
                proxy: row.proxy,
                lastLoginAt: row.last_login_at
            };
        }
        return null;
    } catch (error) {
        console.error('Lỗi khi lấy credentials:', error);
        throw error;
    }
}

/**
 * Get all Zalo credentials
 */
export async function getAllZaloCredentials() {
    const query = 'SELECT * FROM zalo_credentials ORDER BY last_login_at DESC';
    
    try {
        const result = await pool.query(query);
        return result.rows.map(row => ({
            ownId: row.own_id,
            credentials: row.credentials,
            phoneNumber: row.phone_number,
            displayName: row.display_name,
            proxy: row.proxy,
            lastLoginAt: row.last_login_at
        }));
    } catch (error) {
        console.error('Lỗi khi lấy tất cả credentials:', error);
        throw error;
    }
}

/**
 * Delete Zalo credentials
 */
export async function deleteZaloCredentials(ownId) {
    const query = 'DELETE FROM zalo_credentials WHERE own_id = $1 RETURNING *';
    
    try {
        const result = await pool.query(query, [ownId]);
        if (result.rows.length > 0) {
            console.log(`✓ Đã xóa credentials cho tài khoản ${ownId}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Lỗi khi xóa credentials:', error);
        throw error;
    }
}

// ==================== PROXIES ====================

/**
 * Save or update proxy
 */
export async function saveProxy(url, maxAccounts = 3) {
    const query = `
        INSERT INTO proxies (url, max_accounts, current_accounts)
        VALUES ($1, $2, 0)
        ON CONFLICT (url) 
        DO UPDATE SET 
            max_accounts = EXCLUDED.max_accounts,
            is_active = TRUE
        RETURNING *
    `;
    
    try {
        const result = await pool.query(query, [url, maxAccounts]);
        return result.rows[0];
    } catch (error) {
        console.error('Lỗi khi lưu proxy:', error);
        throw error;
    }
}

/**
 * Get all active proxies
 */
export async function getActiveProxies() {
    const query = 'SELECT * FROM proxies WHERE is_active = TRUE ORDER BY current_accounts ASC';
    
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('Lỗi khi lấy proxies:', error);
        throw error;
    }
}

/**
 * Get available proxy (has capacity)
 */
export async function getAvailableProxy() {
    const query = `
        SELECT * FROM proxies 
        WHERE is_active = TRUE AND current_accounts < max_accounts 
        ORDER BY current_accounts ASC 
        LIMIT 1
    `;
    
    try {
        const result = await pool.query(query);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Lỗi khi lấy proxy khả dụng:', error);
        throw error;
    }
}

/**
 * Increment proxy account count
 */
export async function incrementProxyCount(proxyUrl) {
    const query = 'UPDATE proxies SET current_accounts = current_accounts + 1 WHERE url = $1';
    
    try {
        await pool.query(query, [proxyUrl]);
    } catch (error) {
        console.error('Lỗi khi tăng proxy count:', error);
    }
}

/**
 * Decrement proxy account count
 */
export async function decrementProxyCount(proxyUrl) {
    const query = 'UPDATE proxies SET current_accounts = GREATEST(current_accounts - 1, 0) WHERE url = $1';
    
    try {
        await pool.query(query, [proxyUrl]);
    } catch (error) {
        console.error('Lỗi khi giảm proxy count:', error);
    }
}

// Export pool for custom queries if needed
export { pool };

export default {
    saveZaloCredentials,
    getZaloCredentials,
    getAllZaloCredentials,
    deleteZaloCredentials,
    saveProxy,
    getActiveProxies,
    getAvailableProxy,
    incrementProxyCount,
    decrementProxyCount,
    pool
};
