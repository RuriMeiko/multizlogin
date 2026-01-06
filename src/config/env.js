// config/env.js - Centralized environment configuration
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root
dotenv.config();

// Also try loading from src/config/.env for backward compatibility
const configEnvPath = path.join(__dirname, '.env');
if (fs.existsSync(configEnvPath)) {
    dotenv.config({ path: configEnvPath });
}

// Validate and export environment variables
const env = {
    // Server
    PORT: parseInt(process.env.PORT, 10) || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // API Key (required - must be set in .env)
    API_KEY:  process.env.API_KEY || crypto.randomBytes(32).toString('hex'),
    
    // Database
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
    DB_NAME: process.env.DB_NAME || 'multizlogin',
    DB_USER: process.env.DB_USER || 'zalouser',
    DB_PASSWORD: process.env.DB_PASSWORD || 'zalopass123',
    
    // Session
    SESSION_SECRET: process.env.SESSION_SECRET || 'zalo-server-secret-key',
    
    // Admin
    ADMIN_DEFAULT_PASSWORD: process.env.ADMIN_DEFAULT_PASSWORD || 'admin',
    
    // Webhooks
    MESSAGE_WEBHOOK_URL: process.env.MESSAGE_WEBHOOK_URL || '',
    GROUP_EVENT_WEBHOOK_URL: process.env.GROUP_EVENT_WEBHOOK_URL || '',
    REACTION_WEBHOOK_URL: process.env.REACTION_WEBHOOK_URL || '',
    WEBHOOK_LOGIN_SUCCESS: process.env.WEBHOOK_LOGIN_SUCCESS || '',
    
    // Data paths
    DATA_PATH: process.env.DATA_PATH || './data',
    
    // Proxy
    MAX_ACCOUNTS_PER_PROXY: parseInt(process.env.MAX_ACCOUNTS_PER_PROXY, 10) || 3,
    
    // Computed paths
    get COOKIES_DIR() {
        return path.join(this.DATA_PATH, 'cookies');
    },
    get PROXIES_FILE() {
        return path.join(this.DATA_PATH, 'proxies.json');
    },
    get USERS_FILE() {
        return path.join(this.DATA_PATH, 'cookies', 'users.json');
    }
};

// Log loaded config (masked sensitive values)
export function logConfig() {
    console.log('--- ENVIRONMENT CONFIGURATION ---');
    console.log(`[ENV] PORT: ${env.PORT}`);
    console.log(`[ENV] NODE_ENV: ${env.NODE_ENV}`);
    console.log(`[ENV] API_KEY: ****${env.API_KEY.slice(-8)}`);
    console.log(`[ENV] SESSION_SECRET: ****${env.SESSION_SECRET.slice(-4)}`);
    console.log(`[ENV] DATABASE: ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
    console.log(`[ENV] DATA_PATH: ${env.DATA_PATH}`);
    console.log(`[ENV] MESSAGE_WEBHOOK_URL: ${env.MESSAGE_WEBHOOK_URL || 'NOT SET'}`);
    console.log(`[ENV] GROUP_EVENT_WEBHOOK_URL: ${env.GROUP_EVENT_WEBHOOK_URL || 'NOT SET'}`);
    console.log(`[ENV] REACTION_WEBHOOK_URL: ${env.REACTION_WEBHOOK_URL || 'NOT SET'}`);
    console.log(`[ENV] WEBHOOK_LOGIN_SUCCESS: ${env.WEBHOOK_LOGIN_SUCCESS || 'NOT SET'}`);
    console.log('--------------------------------');
}

export default env;
