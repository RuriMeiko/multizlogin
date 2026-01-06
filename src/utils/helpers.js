// helpers.js
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getWebhookUrl as getConfigWebhookUrl } from '../services/webhookService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getWebhookUrl(key) {
    return getConfigWebhookUrl(key);
}

export async function triggerN8nWebhook(msg, webhookUrl) {
    if (!webhookUrl) {
        console.warn("Webhook URL is empty, skipping webhook trigger");
        return false;
    }
    
    try {
        await axios.post(webhookUrl, msg, { headers: { 'Content-Type': 'application/json' } });
        return true;
    } catch (error) {
        console.error("Error sending webhook request:", error.message);
        return false;
    }
}

export async function saveImage(url) {
    const imgPath = path.join(process.cwd(), 'data', `temp_${Date.now()}.png`);
    
    try {
        const { data } = await axios.get(url, { 
            responseType: "arraybuffer",
            timeout: 30000 // 30 seconds timeout
        });
        fs.writeFileSync(imgPath, Buffer.from(data, "utf-8"));
        return imgPath;
    } catch (error) {
        console.error('[SaveImage] Lỗi khi lưu ảnh:', error.message);
        // Xóa file nếu tạo lỗi một phần
        try {
            if (fs.existsSync(imgPath)) {
                fs.unlinkSync(imgPath);
            }
        } catch (cleanupError) {
            console.error('[SaveImage] Không thể xóa temp file:', cleanupError.message);
        }
        return null;
    }
}

export function removeImage(imgPath) {
    if (!imgPath) return;
    
    try {
        if (fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
            console.log(`[RemoveImage] Đã xóa file: ${imgPath}`);
        }
    } catch (error) {
        console.error(`[RemoveImage] Lỗi khi xóa file ${imgPath}:`, error.message);
    }
}