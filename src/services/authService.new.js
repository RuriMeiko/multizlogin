// services/authService.js - User authentication service (optimized)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import env from '../config/env.js';
import { HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_DIGEST, PUBLIC_ROUTES } from '../config/constants.js';

// Đường dẫn đến file lưu thông tin đăng nhập
const getUserFilePath = () => env.USERS_FILE;

// Biến để track xem đã init chưa
let isInitialized = false;

// Hàm tạo hash password
const hashPassword = (password, salt) => {
    return crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_DIGEST).toString('hex');
};

// Tạo file users.json nếu chưa tồn tại
const initUserFile = () => {
    try {
        const userFilePath = getUserFilePath();
        console.log("Khởi tạo file người dùng...");
        console.log("Đường dẫn file users.json:", userFilePath);

        // Kiểm tra và tạo thư mục cookies nếu chưa tồn tại
        const cookiesDir = path.dirname(userFilePath);
        if (!fs.existsSync(cookiesDir)) {
            console.log("Thư mục cookies không tồn tại, đang tạo...");
            fs.mkdirSync(cookiesDir, { recursive: true });
            console.log("Đã tạo thư mục cookies thành công");
        }

        // Kiểm tra file users.json
        if (!fs.existsSync(userFilePath)) {
            console.log("File users.json không tồn tại, đang tạo...");

            const defaultPassword = env.ADMIN_DEFAULT_PASSWORD;
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = hashPassword(defaultPassword, salt);

            const users = [{
                username: 'admin',
                salt,
                hash,
                role: 'admin',
                apiKey: null
            }];

            fs.writeFileSync(userFilePath, JSON.stringify(users, null, 2));
            console.log(`Đã tạo file users.json với tài khoản mặc định: admin/${defaultPassword}`);
        } else {
            console.log("File users.json đã tồn tại");
            // Validate JSON format
            try {
                const content = fs.readFileSync(userFilePath, 'utf8');
                JSON.parse(content);
                console.log("users.json là JSON hợp lệ");
            } catch (readError) {
                console.error("Lỗi khi đọc/phân tích file users.json:", readError);
                console.warn("[CRITICAL] File users.json bị lỗi, đang tạo lại - API keys sẽ bị mất!");
                
                // Tạo backup trước khi overwrite
                try {
                    const backupPath = userFilePath + '.backup-' + Date.now();
                    fs.copyFileSync(userFilePath, backupPath);
                    console.log(`Đã backup file lỗi vào: ${backupPath}`);
                } catch (backupError) {
                    console.error('Không thể backup file lỗi:', backupError);
                }
                
                const defaultPassword = env.ADMIN_DEFAULT_PASSWORD;
                const salt = crypto.randomBytes(16).toString('hex');
                const hash = hashPassword(defaultPassword, salt);

                const users = [{
                    username: 'admin',
                    salt,
                    hash,
                    role: 'admin',
                    apiKey: null
                }];

                fs.writeFileSync(userFilePath, JSON.stringify(users, null, 2));
                console.log(`Đã tạo lại file users.json với tài khoản mặc định: admin/${defaultPassword}`);
            }
        }
    } catch (error) {
        console.error("Lỗi trong quá trình khởi tạo file người dùng:", error);
    }
};

// Hàm đảm bảo init được gọi (lazy init)
const ensureInit = () => {
    if (!isInitialized) {
        console.log("[AuthService] Lazy initializing user file...");
        initUserFile();
        isInitialized = true;
    }
};

// Đọc dữ liệu người dùng từ file
const getUsers = () => {
    ensureInit();
    try {
        const userFilePath = getUserFilePath();
        const data = fs.readFileSync(userFilePath, { encoding: 'utf8', flag: 'r' });
        console.log(`Read users.json file, size: ${data.length} bytes`);

        try {
            const users = JSON.parse(data);
            console.log(`Parsed ${users.length} users from file`);
            return users;
        } catch (parseError) {
            console.error('Lỗi khi phân tích JSON từ file users.json:', parseError);
            return [];
        }
    } catch (error) {
        console.error('Lỗi khi đọc file users.json:', error);
        return [];
    }
};

// Lưu users vào file
const saveUsers = (users) => {
    try {
        const userFilePath = getUserFilePath();
        const tempFilePath = userFilePath + '.tmp';
        
        fs.writeFileSync(tempFilePath, JSON.stringify(users, null, 2), { encoding: 'utf8', flag: 'w' });
        fs.renameSync(tempFilePath, userFilePath);
        
        return true;
    } catch (error) {
        console.error('Error saving users file:', error);
        return false;
    }
};

// Thêm người dùng mới
export const addUser = (username, password, role = 'user') => {
    const users = getUsers();

    if (users.some(user => user.username === username)) {
        return false;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);

    users.push({
        username,
        salt,
        hash,
        role,
        apiKey: null
    });

    return saveUsers(users);
};

// Xác thực người dùng
export const validateUser = (username, password) => {
    console.log(`Validating user: ${username}`);
    ensureInit();

    let users = [];
    try {
        const userFilePath = getUserFilePath();
        const data = fs.readFileSync(userFilePath, { encoding: 'utf8', flag: 'r' });
        users = JSON.parse(data);
    } catch (error) {
        console.error('Error reading users file directly:', error);
        return null;
    }

    const user = users.find(u => u.username === username);
    if (!user) {
        console.log(`User ${username} not found in database`);
        return null;
    }

    const hash = hashPassword(password, user.salt);
    if (user.hash === hash) {
        console.log('Authentication successful');
        return {
            username: user.username,
            role: user.role || 'user'
        };
    }

    console.log('Authentication failed - password mismatch');
    return null;
};

// Thay đổi mật khẩu
export const changePassword = (username, oldPassword, newPassword) => {
    console.log(`Attempting to change password for user: ${username}`);
    ensureInit();

    let users = [];
    try {
        const userFilePath = getUserFilePath();
        const data = fs.readFileSync(userFilePath, { encoding: 'utf8', flag: 'r' });
        users = JSON.parse(data);
    } catch (error) {
        console.error('Error reading users file for password change:', error);
        return false;
    }

    const userIndex = users.findIndex(user => user.username === username);
    if (userIndex === -1) {
        console.log(`User ${username} not found`);
        return false;
    }

    const user = users[userIndex];
    const hash = hashPassword(oldPassword, user.salt);

    if (user.hash !== hash) {
        console.log('Old password verification failed');
        return false;
    }

    // Update password
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = hashPassword(newPassword, newSalt);

    users[userIndex].salt = newSalt;
    users[userIndex].hash = newHash;

    if (!saveUsers(users)) {
        return false;
    }

    // Verify the change
    const verifyUsers = getUsers();
    const verifyUser = verifyUsers.find(u => u.username === username);
    if (!verifyUser || verifyUser.salt !== newSalt || verifyUser.hash !== newHash) {
        console.error('Verification failed after password change');
        return false;
    }

    console.log('Password change successful and verified');
    return true;
};

// Middleware xác thực cho các route
export const authMiddleware = (req, res, next) => {
    if (req.session && req.session.authenticated) {
        return next();
    }
    res.redirect('/admin-login');
};

// Middleware kiểm tra quyền admin
export const adminMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        const user = getUserByApiKey(apiKey);
        if (user && user.role === 'admin') {
            req.user = user;
            return next();
        }
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    if (req.session && req.session.authenticated && req.session.role === 'admin') {
        return next();
    }

    res.status(403).json({ success: false, message: 'Không có quyền truy cập. Chỉ admin mới có thể thực hiện chức năng này.' });
};

// Middleware xác thực API key hoặc Session
export const apiAccessMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (apiKey) {
        const user = getUserByApiKey(apiKey);
        if (user) {
            req.user = user;
            return next();
        }
        return res.status(403).json({ success: false, message: 'Invalid API Key' });
    }

    if (req.session && req.session.authenticated) {
        return next();
    }

    return res.status(401).json({ success: false, message: 'Authentication required. Provide an API Key or log in.' });
};

// Lấy toàn bộ danh sách người dùng
export const getAllUsers = () => {
    const users = getUsers();
    return users.map(user => ({
        username: user.username,
        role: user.role || 'user'
    }));
};

// Lấy API key của người dùng
export const getApiKeyForUser = (username) => {
    const users = getUsers();
    const user = users.find(u => u.username === username);
    return user?.apiKey || null;
};

// Tạo API key mới cho người dùng
export const generateApiKeyForUser = (username) => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
        return null;
    }

    const newApiKey = crypto.randomBytes(32).toString('hex');
    users[userIndex].apiKey = newApiKey;

    if (!saveUsers(users)) {
        return null;
    }
    
    return newApiKey;
};

// Lấy thông tin người dùng bằng API key
export const getUserByApiKey = (apiKey) => {
    if (!apiKey) {
        return null;
    }
    const users = getUsers();
    return users.find(u => u.apiKey === apiKey);
};

// Danh sách các route công khai
export { PUBLIC_ROUTES as publicRoutes };

// Kiểm tra xem route có phải là public hay không
export const isPublicRoute = (path) => {
    console.log('Checking if route is public:', path);

    if (path.startsWith('/api-docs')) {
        return true;
    }

    if (path.startsWith('/api/')) {
        if (path.startsWith('/api/account-webhook/')) {
            return true;
        }

        for (const route of PUBLIC_ROUTES) {
            if (route.startsWith('/api/') && (
                path === route ||
                (route.endsWith('/') && path.startsWith(route))
            )) {
                return true;
            }
        }
        return false;
    }

    for (const route of PUBLIC_ROUTES) {
        if (route.startsWith('/api/')) continue;

        if (path === route) {
            return true;
        }

        if (route.endsWith('*') && path.startsWith(route.slice(0, -1))) {
            return true;
        }
    }

    return false;
};
