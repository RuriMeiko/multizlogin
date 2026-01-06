// routes/auth.routes.js - Authentication routes
import express from 'express';
import { 
    validateUser, 
    changePassword,
    addUser,
    getAllUsers,
    generateApiKeyForUser,
    getApiKeyForUser
} from '../services/authService.js';
import { adminMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Đăng nhập
router.post('/login', (req, res) => {
    try {
        console.log('Login attempt:', req.body);
        const { username, password } = req.body;

        if (!username || !password) {
            console.log('Missing username or password');
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu' });
        }

        const user = validateUser(username, password);
        console.log('User validation result:', user);

        if (!user) {
            return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' });
        }

        if (!req.session) {
            console.error('Session object is not available!');
            return res.status(500).json({
                success: false,
                message: 'Lỗi server: session không khả dụng',
                debug: 'req.session is undefined'
            });
        }

        req.session.authenticated = true;
        req.session.username = user.username;
        req.session.role = user.role;

        console.log('Login successful, session set:', {
            authenticated: req.session.authenticated,
            username: req.session.username,
            role: req.session.role
        });

        res.json({ success: true, user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xử lý đăng nhập',
            error: error.message
        });
    }
});

// API đăng nhập đơn giản
router.post('/simple-login', (req, res) => {
    try {
        console.log('Simple login attempt:', req.body);

        if (!req.body || typeof req.body !== 'object') {
            console.error('Invalid request body:', req.body);
            res.setHeader('Content-Type', 'application/json');
            return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
        }

        const { username, password } = req.body;

        if (!username || !password) {
            console.log('Missing username or password');
            res.setHeader('Content-Type', 'application/json');
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu' });
        }

        console.log('Session before login:', req.session ? 'exists' : 'missing');
        console.log(`Login attempt: username=${username}, password=provided`);

        const user = validateUser(username, password);

        if (user) {
            if (!req.session) {
                console.error('Session object is not available');
                res.setHeader('Content-Type', 'application/json');
                return res.status(500).json({ success: false, message: 'Lỗi server: session không khả dụng' });
            }

            req.session.authenticated = true;
            req.session.username = user.username;
            req.session.role = user.role;

            console.log('Session set, returning response immediately');
            res.setHeader('Content-Type', 'application/json');
            return res.json({
                success: true,
                user: { username: user.username, role: user.role },
                sessionID: req.sessionID || 'unknown'
            });
        } else {
            res.setHeader('Content-Type', 'application/json');
            return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' });
        }
    } catch (error) {
        console.error('Simple login error:', error);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message || 'Unknown error'
        });
    }
});

// Đăng xuất
router.all('/logout', (req, res) => {
    console.log('Logout requested');
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).json({ success: false, message: 'Lỗi khi đăng xuất' });
            }
            console.log('Session destroyed successfully');
            res.json({ success: true, message: 'Đã đăng xuất thành công' });
        });
    } else {
        console.log('No session to destroy');
        res.json({ success: true, message: 'Đã đăng xuất thành công' });
    }
});

// Lấy thông tin người dùng hiện tại
router.get('/user', (req, res) => {
    if (!req.session.authenticated) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }

    res.json({
        success: true,
        user: {
            username: req.session.username,
            role: req.session.role
        }
    });
});

// Kiểm tra phiên đăng nhập
router.get('/check-auth', (req, res) => {
    if (req.session.authenticated) {
        return res.json({
            authenticated: true,
            username: req.session.username,
            role: req.session.role
        });
    }
    res.json({ authenticated: false });
});

// Đổi mật khẩu
router.post('/change-password', (req, res) => {
    console.log('Change password request received');
    console.log('Session info:', req.session ? 'exists' : 'missing');

    if (!req.session.authenticated) {
        console.log('Authentication check failed - user not logged in');
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        console.log('Missing required fields - oldPassword or newPassword');
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' });
    }

    console.log(`Calling changePassword for user: ${req.session.username}`);
    const success = changePassword(req.session.username, oldPassword, newPassword);
    console.log(`Change password result: ${success ? 'SUCCESS' : 'FAILED'}`);

    if (!success) {
        return res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác' });
    }

    console.log('Password change successful - sending response');
    res.json({ success: true, message: 'Đã đổi mật khẩu thành công' });
});

// API quản lý người dùng (chỉ admin)
router.get('/users', adminMiddleware, (req, res) => {
    const users = getAllUsers();
    res.json({ success: true, users });
});

router.post('/users', adminMiddleware, (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu' });
    }

    const success = addUser(username, password, role || 'user');
    if (!success) {
        return res.status(400).json({ success: false, message: 'Tài khoản đã tồn tại' });
    }

    res.json({ success: true, message: 'Đã thêm người dùng thành công' });
});

// API Key Management Routes
router.get('/user/api-key', (req, res) => {
    if (!req.session.authenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const apiKey = getApiKeyForUser(req.session.username);
    res.json({ success: true, apiKey: apiKey });
});

router.post('/user/generate-key', (req, res) => {
    if (!req.session.authenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const newApiKey = generateApiKeyForUser(req.session.username);
    if (!newApiKey) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, apiKey: newApiKey });
});

export default router;
