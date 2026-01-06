// app.js - Main Express application
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';

// Config
import env, { logConfig } from './config/env.js';
import { SESSION_MAX_AGE } from './config/constants.js';
import { specs } from './config/swagger.js';

// Services
import { authMiddleware, isPublicRoute } from './middlewares/authMiddleware.js';
import { zaloAccounts, initLoginFromCookies } from './services/zaloService.js';

// Routes
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log configuration
logConfig();

const app = express();

// View engine
app.set('view engine', 'ejs');
const viewsPath = path.join(__dirname, 'views');
console.log('Views path:', viewsPath);
app.set('views', viewsPath);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
console.log('Static files path:', path.join(__dirname, 'public'));

// Session configuration
console.log("Using session secret:", env.SESSION_SECRET ? "Configured properly" : "MISSING SESSION SECRET");

app.use(session({
    secret: env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    name: 'zalo-server.sid',
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: SESSION_MAX_AGE,
        path: '/',
        sameSite: 'lax'
    },
    rolling: true
}));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('Session exists:', !!req.session);
    next();
});

// Authentication middleware
app.use((req, res, next) => {
    if (isPublicRoute(req.path)) {
        console.log(`Skipping auth for public route: ${req.path}`);
        return next();
    }

    if (req.path.startsWith('/api/')) {
        console.log(`Skipping global auth for API route: ${req.path} (will be handled by route-specific middleware)`);
        return next();
    }

    console.log(`Applying auth middleware for protected UI route: ${req.path}`);
    authMiddleware(req, res, next);
});

// Health check endpoint
app.get('/health', (req, res) => {
    const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        accounts: {
            total: zaloAccounts.length,
            online: zaloAccounts.filter(acc => acc.api && acc.api.listener).length
        }
    };
    res.status(200).json(healthStatus);
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use('/', routes);

// Initialize login from saved cookies
initLoginFromCookies().catch(err => {
    console.error('Lỗi khi xử lý đăng nhập từ cookie:', err);
});

export default app;