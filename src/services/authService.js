// authService.js - User authentication service
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import env from '../config/env.js';
import { HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_DIGEST, PUBLIC_ROUTES } from '../config/constants.js';

// Đường dẫn đến file lưu thông tin đăng nhập (từ config)
const getUserFilePath = () => env.USERS_FILE;
console.log("Path to users.json:", getUserFilePath());

// Hàm tạo hash password
const hashPassword = (password, salt) => {
    return crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_DIGEST).toString('hex');
};

// Tạo file users.json nếu chưa tồn tại
const initUserFile = () => {
  try {
    const userFilePath = getUserFilePath();
    console.log("Khởi tạo file người dùng...");

    // Kiểm tra và tạo thư mục cookies nếu chưa tồn tại
    const cookiesDir = path.dirname(userFilePath);
    if (!fs.existsSync(cookiesDir)) {
      console.log("Thư mục cookies không tồn tại, đang tạo...");
      fs.mkdirSync(cookiesDir, { recursive: true });
      console.log("Đã tạo thư mục cookies thành công");
    } else {
      console.log("Thư mục cookies đã tồn tại");
    }

    // Đường dẫn đầy đủ đến file users.json
    console.log("Đường dẫn file users.json:", userFilePath);

    // Kiểm tra file users.json
    if (!fs.existsSync(userFilePath)) {
      console.log("File users.json không tồn tại, đang tạo...");

      // Tạo mật khẩu mặc định từ env
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

      // Tạo file users.json
      const jsonData = JSON.stringify(users, null, 2);
      console.log("Dữ liệu JSON sẽ được ghi:", jsonData);

      fs.writeFileSync(userFilePath, jsonData);
      console.log(`Đã tạo file users.json với tài khoản mặc định: admin/${defaultPassword}`);
    } else {
      console.log("File users.json đã tồn tại");
      // Kiểm tra nội dung file
      try {
        const content = fs.readFileSync(userFilePath, 'utf8');
        console.log("Nội dung file users.json:", content.slice(0, 100) + "...");
        JSON.parse(content); // Kiểm tra xem có phải JSON hợp lệ
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
        
        // Nếu file không đúng định dạng JSON, tạo lại
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

// Biến để track xem đã init chưa
let isInitialized = false;

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

  // Kiểm tra nếu username đã tồn tại
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

// Xác thực người dùng và trả về thông tin user
export const validateUser = (username, password) => {
  console.log(`Validating user: ${username}`);

  // Đảm bảo file được init trước
  ensureInit();

  // Đọc dữ liệu trực tiếp từ file để đảm bảo dữ liệu mới nhất
  let users = [];
  try {
    const userFilePath = getUserFilePath();
    const data = fs.readFileSync(userFilePath, { encoding: 'utf8', flag: 'r' });
    users = JSON.parse(data);
    console.log(`Read ${users.length} users directly from file`);
  } catch (error) {
    console.error('Error reading users file directly:', error);
    return null;
  }

  const user = users.find(user => user.username === username);

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

  // Đảm bảo file được init trước
  ensureInit();

  const users = getUsers();
  const userIndex = users.findIndex(user => user.username === username);

  if (userIndex === -1) {
    console.log(`User ${username} not found in database`);
    return false;
  }

  const user = users[userIndex];
  const hash = hashPassword(oldPassword, user.salt);

  if (user.hash !== hash) {
    console.log('Old password verification failed');
    return false;
  }

  // Cập nhật mật khẩu mới
  const salt = crypto.randomBytes(16).toString('hex');
  const newHash = hashPassword(newPassword, salt);

  users[userIndex].salt = salt;
  users[userIndex].hash = newHash;

  if (saveUsers(users)) {
    console.log('Password change successful');
    return true;
  }

  console.error('Error saving password change');
  return false;
};

// Lấy toàn bộ danh sách người dùng (chỉ admin mới có quyền)
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

    if (saveUsers(users)) {
        return newApiKey;
    }
    return null;
};

// Lấy thông tin người dùng bằng API key
export const getUserByApiKey = (apiKey) => {
    if (!apiKey) {
        return null;
    }
    const users = getUsers();
    return users.find(u => u.apiKey === apiKey);
};