// webhookConfig.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đường dẫn đến file cấu hình webhook
const webhookConfigPath = path.join(process.cwd(), 'src/config/webhookConfig.json');

// Cấu trúc dữ liệu mặc định
const defaultConfig = {
    // Webhook mặc định từ .env
    default: {
        messageWebhookUrl: process.env.MESSAGE_WEBHOOK_URL || "",
        groupEventWebhookUrl: process.env.GROUP_EVENT_WEBHOOK_URL || "",
        reactionWebhookUrl: process.env.REACTION_WEBHOOK_URL || ""
    }
};

// Biến lưu trữ cấu hình webhook
let webhookConfig = defaultConfig;

// Hàm đọc cấu hình webhook từ file
export function loadWebhookConfig() {
    try {
        console.log(`Đang tải cấu hình webhook từ ${webhookConfigPath}`);
        
        const dir = path.dirname(webhookConfigPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Đã tạo thư mục ${dir}`);
        }
        
        if (fs.existsSync(webhookConfigPath)) {
            const configData = fs.readFileSync(webhookConfigPath, 'utf8');
            const savedConfig = JSON.parse(configData);
            // Chỉ nạp phần default
            webhookConfig.default = savedConfig.default || defaultConfig.default;
            console.log("Đã tải cấu hình webhook mặc định thành công");
        } else {
            console.log(`File cấu hình webhook không tồn tại, tạo mới với giá trị mặc định.`);
            saveWebhookConfig();
        }
    } catch (error) {
        console.error("Lỗi khi tải cấu hình webhook:", error);
        webhookConfig = defaultConfig;
    }
}

// Hàm lưu cấu hình webhook vào file
export function saveWebhookConfig() {
    try {
        const dir = path.dirname(webhookConfigPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const configToSave = { default: webhookConfig.default };
        fs.writeFileSync(webhookConfigPath, JSON.stringify(configToSave, null, 2), 'utf8');
        console.log(`Đã lưu cấu hình webhook mặc định vào ${webhookConfigPath}`);
        return true;
    } catch (error) {
        console.error("Lỗi khi lưu cấu hình webhook:", error);
        return false;
    }
}

// Hàm lấy webhook URL theo loại (chỉ dùng default)
export function getWebhookUrl(key) {
    try {
        const defaultUrl = webhookConfig.default[key];
        if (defaultUrl) {
            console.log(`[Webhook] Sử dụng URL mặc định cho key '${key}': ${defaultUrl}`);
            return defaultUrl;
        }
        console.warn(`[Webhook] Không tìm thấy URL mặc định cho key '${key}'.`);
        return "";
    } catch (error) {
        console.error("Lỗi khi lấy webhook URL:", error);
        return "";
    }
}

// Tải cấu hình khi module được import
loadWebhookConfig();

export default {
    getWebhookUrl,
    loadWebhookConfig,
    saveWebhookConfig,
}; 