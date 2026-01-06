// controllers/authController.js - Authentication Controller
import env from '../config/env.js';
import {
    validateUser,
    changePassword as authChangePassword,
    getAllUsers as authGetAllUsers,
    addUser,
    getApiKeyForUser,
    generateApiKeyForUser
} from '../services/authService.js';

/**
 * Login với username/password
 */
export const login = (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username và password là bắt buộc'
        });
    }

    const user = validateUser(username, password);
    
    if (user) {
        req.session.user = user;
        req.session.isAuthenticated = true;
        return res.json({
            success: true,
            message: 'Đăng nhập thành công',
            user: {
                username: user.username,
                role: user.role
            }
        });
    }

    return res.status(401).json({
        success: false,
        message: 'Sai tên đăng nhập hoặc mật khẩu'
    });
};

/**
 * Simple login với API Key
 */
export const simpleLogin = (req, res) => {
    const { apiKey } = req.body;
    
    if (!apiKey) {
        return res.status(400).json({
            success: false,
            message: 'API Key là bắt buộc'
        });
    }

    // Kiểm tra với ENV API KEY
    if (apiKey === env.API_KEY) {
        req.session.user = { username: 'api', role: 'admin' };
        req.session.isAuthenticated = true;
        return res.json({
            success: true,
            message: 'Đăng nhập thành công'
        });
    }

    return res.status(401).json({
        success: false,
        message: 'API Key không hợp lệ'
    });
};

/**
 * Logout
 */
export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi đăng xuất'
            });
        }
        res.json({
            success: true,
            message: 'Đăng xuất thành công'
        });
    });
};

/**
 * Lấy thông tin user hiện tại
 */
export const getUser = (req, res) => {
    if (req.session && req.session.user) {
        return res.json({
            success: true,
            user: req.session.user
        });
    }
    
    return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập'
    });
};

/**
 * Kiểm tra trạng thái auth
 */
export const checkAuth = (req, res) => {
    const isAuthenticated = req.session && req.session.isAuthenticated;
    
    return res.json({
        authenticated: isAuthenticated,
        user: isAuthenticated ? req.session.user : null
    });
};

/**
 * Đổi mật khẩu
 */
export const changePassword = (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const username = req.session?.user?.username;

    if (!username) {
        return res.status(401).json({
            success: false,
            message: 'Chưa đăng nhập'
        });
    }

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc'
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
        });
    }

    const success = authChangePassword(username, currentPassword, newPassword);
    
    if (success) {
        return res.json({
            success: true,
            message: 'Đổi mật khẩu thành công'
        });
    }

    return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
    });
};

/**
 * Lấy danh sách users (admin only)
 */
export const getAllUsers = (req, res) => {
    // Check if admin (via session or API key)
    const isAdmin = req.session?.user?.role === 'admin' || req.apiKeyValid;
    
    if (!isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Không có quyền truy cập'
        });
    }

    const users = authGetAllUsers();
    return res.json({
        success: true,
        users
    });
};

/**
 * Tạo user mới (admin only)
 */
export const createUser = (req, res) => {
    // Check if admin
    const isAdmin = req.session?.user?.role === 'admin' || req.apiKeyValid;
    
    if (!isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Không có quyền truy cập'
        });
    }

    const { username, password, role = 'user' } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username và password là bắt buộc'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Mật khẩu phải có ít nhất 6 ký tự'
        });
    }

    const success = addUser(username, password, role);
    
    if (success) {
        return res.status(201).json({
            success: true,
            message: 'Tạo user thành công',
            user: { username, role }
        });
    }

    return res.status(400).json({
        success: false,
        message: 'Username đã tồn tại'
    });
};

/**
 * Lấy API Key của user hiện tại
 */
export const getUserApiKey = (req, res) => {
    const username = req.session?.user?.username;

    if (!username) {
        return res.status(401).json({
            success: false,
            message: 'Chưa đăng nhập'
        });
    }

    const apiKey = getApiKeyForUser(username);
    
    return res.json({
        success: true,
        apiKey
    });
};

/**
 * Tạo API Key mới cho user
 */
export const generateApiKey = (req, res) => {
    const username = req.session?.user?.username;

    if (!username) {
        return res.status(401).json({
            success: false,
            message: 'Chưa đăng nhập'
        });
    }

    const newApiKey = generateApiKeyForUser(username);
    
    if (newApiKey) {
        return res.json({
            success: true,
            apiKey: newApiKey,
            message: 'API Key mới đã được tạo'
        });
    }

    return res.status(500).json({
        success: false,
        message: 'Không thể tạo API Key'
    });
};
