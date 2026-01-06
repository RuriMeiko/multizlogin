// middlewares/authMiddleware.js - Authentication middlewares
import { PUBLIC_ROUTES } from '../config/constants.js';
import { getUserByApiKey } from '../services/authService.js';
import env from '../config/env.js';

// Middleware xác thực cho các route (redirect to login page)
export const authMiddleware = (req, res, next) => {
    if (req.session && req.session.authenticated) {
        return next();
    }
    res.redirect('/login');
};

// Middleware xác thực session (return 401)
export const sessionAuthMiddleware = (req, res, next) => {
    if (req.session && req.session.isAuthenticated) {
        return next();
    }
    return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập'
    });
};

// Middleware kiểm tra quyền admin
export const adminMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    // Check ENV API Key first
    if (apiKey && apiKey === env.API_KEY) {
        req.user = { username: 'api', role: 'admin' };
        req.apiKeyValid = true;
        return next();
    }
    
    // Check user API Key
    if (apiKey) {
        const user = getUserByApiKey(apiKey);
        if (user && user.role === 'admin') {
            req.user = user;
            req.apiKeyValid = true;
            return next();
        }
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Fallback to Session
    if (req.session && req.session.authenticated && req.session.role === 'admin') {
        return next();
    }

    res.status(403).json({ success: false, message: 'Không có quyền truy cập. Chỉ admin mới có thể thực hiện chức năng này.' });
};

// Middleware xác thực API key hoặc Session
export const apiAccessMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    // 1. Check ENV API Key first
    if (apiKey && apiKey === env.API_KEY) {
        req.user = { username: 'api', role: 'admin' };
        req.apiKeyValid = true;
        return next();
    }

    // 2. Check user API Key from database
    if (apiKey) {
        const user = getUserByApiKey(apiKey);
        if (user) {
            req.user = user;
            req.apiKeyValid = true;
            return next();
        }
        return res.status(401).json({ success: false, message: 'Invalid API Key' });
    }

    // 3. Fallback to Session-based authentication
    if (req.session && req.session.authenticated) {
        return next();
    }

    // 3. If neither is valid, deny access
    return res.status(401).json({ success: false, message: 'Authentication required. Provide an API Key or log in.' });
};

// Kiểm tra xem route có phải là public hay không
export const isPublicRoute = (path) => {
    console.log('Checking if route is public:', path);

    // Kiểm tra /api-docs và tất cả sub-paths (swagger assets)
    if (path.startsWith('/api-docs')) {
        console.log('Is api-docs or swagger asset:', true);
        return true;
    }

    // Kiểm tra các route API công khai
    if (path.startsWith('/api/')) {
        if (path.startsWith('/api/account-webhook/')) {
            console.log('Is account webhook API with parameters:', true);
            return true;
        }

        for (const route of PUBLIC_ROUTES) {
            if (route.startsWith('/api/') && (
                path === route ||
                (route.endsWith('/') && path.startsWith(route))
            )) {
                console.log('Is public API route:', true);
                return true;
            }
        }

        console.log('Is public API route:', false);
        return false;
    }

    // Kiểm tra các route UI công khai
    for (const route of PUBLIC_ROUTES) {
        if (route.startsWith('/api/')) continue;

        if (path === route) {
            console.log('Is public UI route (exact match):', true);
            return true;
        }

        if (route.endsWith('*') && path.startsWith(route.slice(0, -1))) {
            console.log('Is public UI route (prefix match):', true);
            return true;
        }
    }

    console.log('Is public route:', false);
    return false;
};
