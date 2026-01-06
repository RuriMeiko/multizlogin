// Migration script to ensure all users have apiKey field
// Run this before deploying to fix existing users.json

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(process.cwd(), 'data', 'cookies', 'users.json');

console.log('================================');
console.log('Users.json Migration Script');
console.log('================================');
console.log('');
console.log('File:', USERS_FILE);
console.log('');

// Check if file exists
if (!fs.existsSync(USERS_FILE)) {
    console.error('❌ File không tồn tại:', USERS_FILE);
    console.log('');
    console.log('File sẽ được tạo tự động khi server khởi động.');
    process.exit(0);
}

// Read file
let users;
try {
    const content = fs.readFileSync(USERS_FILE, 'utf8');
    users = JSON.parse(content);
    console.log('✓ File đọc thành công');
    console.log('✓ JSON hợp lệ');
    console.log(`✓ Số lượng users: ${users.length}`);
    console.log('');
} catch (error) {
    console.error('❌ Lỗi khi đọc file:', error.message);
    
    // Backup corrupted file
    const backupPath = USERS_FILE + '.corrupted-' + Date.now();
    try {
        fs.copyFileSync(USERS_FILE, backupPath);
        console.log('✓ Đã backup file lỗi vào:', backupPath);
    } catch (backupError) {
        console.error('❌ Không thể backup:', backupError.message);
    }
    
    process.exit(1);
}

// Check and fix each user
let modified = false;
let missingFields = 0;

users.forEach((user, index) => {
    console.log(`Checking user ${index + 1}: ${user.username}`);
    
    // Required fields
    const requiredFields = ['username', 'salt', 'hash', 'role', 'apiKey'];
    const missingInUser = [];
    
    requiredFields.forEach(field => {
        if (!(field in user)) {
            missingInUser.push(field);
            missingFields++;
        }
    });
    
    if (missingInUser.length > 0) {
        console.log(`  ⚠ Missing fields: ${missingInUser.join(', ')}`);
        
        // Fix missing fields
        missingInUser.forEach(field => {
            if (field === 'apiKey') {
                user.apiKey = null;
                console.log(`  ✓ Added apiKey: null`);
            } else if (field === 'role') {
                user.role = 'user';
                console.log(`  ✓ Added role: user`);
            } else {
                console.error(`  ❌ Cannot auto-fix field: ${field}`);
            }
        });
        
        modified = true;
    } else {
        console.log('  ✓ All fields present');
        
        // Show API key status
        if (user.apiKey) {
            console.log(`  ✓ API Key: ${user.apiKey.substring(0, 8)}...`);
        } else {
            console.log('  ⚠ API Key: not set');
        }
    }
    console.log('');
});

// Save if modified
if (modified) {
    console.log('================================');
    console.log('Saving changes...');
    console.log('');
    
    // Backup original
    const backupPath = USERS_FILE + '.backup-' + Date.now();
    try {
        fs.copyFileSync(USERS_FILE, backupPath);
        console.log('✓ Backup original:', backupPath);
    } catch (backupError) {
        console.error('❌ Backup failed:', backupError.message);
        process.exit(1);
    }
    
    // Write updated file
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        console.log('✓ Đã lưu file với các thay đổi');
        console.log('');
        console.log(`✓ Fixed ${missingFields} missing fields`);
    } catch (writeError) {
        console.error('❌ Lỗi khi ghi file:', writeError.message);
        process.exit(1);
    }
} else {
    console.log('================================');
    console.log('✓ No changes needed');
}

console.log('');
console.log('================================');
console.log('Migration completed successfully!');
console.log('================================');
console.log('');

// Final summary
console.log('Summary:');
users.forEach((user, index) => {
    const apiKeyStatus = user.apiKey ? 'SET' : 'NOT SET';
    console.log(`  ${index + 1}. ${user.username} (${user.role}) - API Key: ${apiKeyStatus}`);
});
console.log('');
