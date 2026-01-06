// config/constants.js - Application constants

// Relogin/Reconnection settings
export const RELOGIN_COOLDOWN = 3 * 60 * 1000; // 3 minutes
export const MAX_RETRY_ATTEMPTS = 5;
export const HEALTH_CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes
export const RETRY_RESET_TIME = 30 * 60 * 1000; // 30 minutes

// Session settings  
export const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Password hashing settings
export const HASH_ITERATIONS = 1000;
export const HASH_KEY_LENGTH = 64;
export const HASH_DIGEST = 'sha512';

// Public routes (no authentication required)
export const PUBLIC_ROUTES = [
    '/',
    '/admin-login',
    '/session-test',
    '/zalo-login',
    '/api-docs',
    '/api/login',
    '/api/simple-login',
    '/api/test-login',
    '/api/logout',
    '/api/check-auth',
    '/api/session-test',
    '/api/test-json',
    '/api/account-webhook/',
    '/api/debug-users-file',
    '/api/reset-admin-password',
    '/reset-password',
    '/favicon.ico',
    '/ws'
];
