// app.js - Main Express application (API Only)
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

// Config
import env, { logConfig } from './config/env.js';
import { SESSION_MAX_AGE } from './config/constants.js';
import { specs } from './config/swagger.js';

// Services
import { zaloAccounts, initLoginFromCookies } from './services/zaloService.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import accountRoutes from './routes/account.routes.js';
import zaloRoutes from './routes/zalo.routes.js';

// Log configuration
logConfig();

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration (for Swagger UI login)
app.use(session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'zalo-api.sid',
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: SESSION_MAX_AGE,
        path: '/',
        sameSite: 'lax'
    }
}));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check endpoint (public)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        accounts: {
            total: zaloAccounts.length,
            online: zaloAccounts.filter(acc => acc.api && acc.api.listener).length
        }
    });
});

// Login page for Swagger access
app.get('/login', (req, res) => {
    if (req.session && req.session.authenticated) {
        return res.redirect('/api-docs');
    }
    
    res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - MultiZlogin API</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            width: 100%;
            max-width: 400px;
        }
        h1 { text-align: center; color: #333; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; color: #555; font-weight: 500; }
        input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e1e1;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input:focus { outline: none; border-color: #667eea; }
        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        button:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(102,126,234,0.4); }
        .error { color: #e74c3c; text-align: center; margin-bottom: 20px; padding: 10px; background: #ffeaea; border-radius: 8px; }
        .info { color: #666; text-align: center; margin-top: 20px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 MultiZlogin API</h1>
        <div id="error" class="error" style="display: none;"></div>
        <form id="loginForm">
            <div class="form-group">
                <label>API Key</label>
                <input type="password" id="apiKey" placeholder="Nhập API Key từ env" required>
            </div>
            <button type="submit">Đăng nhập</button>
        </form>
        <p class="info">Đăng nhập để truy cập Swagger API Documentation</p>
    </div>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const apiKey = document.getElementById('apiKey').value;
            const errorDiv = document.getElementById('error');
            
            try {
                const res = await fetch('/api/swagger-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey })
                });
                const data = await res.json();
                
                if (data.success) {
                    window.location.href = '/api-docs';
                } else {
                    errorDiv.textContent = data.message || 'API Key không hợp lệ';
                    errorDiv.style.display = 'block';
                }
            } catch (err) {
                errorDiv.textContent = 'Lỗi kết nối server';
                errorDiv.style.display = 'block';
            }
        });
    </script>
</body>
</html>
    `);
});

// Swagger login API
app.post('/api/swagger-login', (req, res) => {
    const { apiKey } = req.body;
    
    if (apiKey === env.API_KEY) {
        req.session.authenticated = true;
        req.session.apiKey = apiKey;
        return res.json({ success: true, message: 'Đăng nhập thành công' });
    }
    
    return res.status(401).json({ success: false, message: 'API Key không hợp lệ' });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Swagger UI - Protected with session
app.use('/api-docs', (req, res, next) => {
    if (req.session && req.session.authenticated) {
        return next();
    }
    return res.redirect('/login');
}, swaggerUi.serve, swaggerUi.setup(specs, {
    swaggerOptions: {
        persistAuthorization: true,
    },
    customSiteTitle: 'MultiZlogin API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    customJs: `/api-docs-init.js`
}));

// Serve custom JS for auto-filling API key
app.get('/api-docs-init.js', (req, res) => {
    const apiKey = req.session?.apiKey || '';
    res.type('application/javascript').send(`
        // Auto-fill API Key when page loads
        window.addEventListener('load', function() {
            setTimeout(function() {
                const apiKey = '${apiKey}';
                if (apiKey && window.ui) {
                    window.ui.preauthorizeApiKey('ApiKeyAuth', apiKey);
                    console.log('API Key auto-filled from session');
                }
            }, 1000);
        });
    `);
});

// Root redirect to api-docs
app.get('/', (req, res) => {
    res.redirect('/api-docs');
});

// API Routes
app.use('/api', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api', zaloRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// Initialize login from saved cookies
initLoginFromCookies().catch(err => {
    console.error('Lỗi khi xử lý đăng nhập từ cookie:', err);
});

export default app;
