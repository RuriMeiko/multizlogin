import { GroupEventType } from "zca-js";
import { getWebhookUrl, triggerN8nWebhook } from './utils/helpers.js';
import fs from 'fs';
import { loginZaloAccount, zaloAccounts } from './api/zalo/zalo.js';
import { broadcastMessage } from './server.js';

// Biến để theo dõi thời gian relogin cho từng tài khoản
export const reloginAttempts = new Map();
// Thời gian tối thiểu giữa các lần thử relogin (3 phút)
const RELOGIN_COOLDOWN = 3 * 60 * 1000;
// Số lần retry tối đa
const MAX_RETRY_ATTEMPTS = 5;
// Health check interval (mỗi 2 phút)
const HEALTH_CHECK_INTERVAL = 2 * 60 * 1000;

export function setupEventListeners(api, loginResolve) {
    const ownId = api.getOwnId();
    
    // Thiết lập health check để đảm bảo connection vẫn hoạt động
    const healthCheckTimer = setInterval(() => {
        try {
            // Kiểm tra xem listener còn hoạt động không
            if (!api.listener || !api.listener.isStarted) {
                console.warn(`[Health Check] Connection không hoạt động cho tài khoản ${ownId}, đang thử reconnect...`);
                handleRelogin(api);
            } else {
                console.log(`[Health Check] Connection OK cho tài khoản ${ownId}`);
            }
        } catch (error) {
            console.error(`[Health Check] Lỗi khi kiểm tra connection cho ${ownId}:`, error);
        }
    }, HEALTH_CHECK_INTERVAL);
    
    // Lưu timer để có thể clear sau này nếu cần
    if (!api._healthCheckTimer) {
        api._healthCheckTimer = healthCheckTimer;
    }
    
    // Lắng nghe sự kiện tin nhắn và gửi đến webhook được cấu hình cho tin nhắn
    api.listener.on("message", (msg) => {
        console.log(`[Webhook] Nhận được tin nhắn mới cho tài khoản ${ownId}. Đang xử lý webhook...`);
        const messageWebhookUrl = getWebhookUrl("messageWebhookUrl");
        
        if (messageWebhookUrl) {
            console.log(`[Webhook] Tìm thấy URL webhook tin nhắn: ${messageWebhookUrl}`);
            // Thêm ownId và messageType vào dữ liệu để webhook biết tin nhắn từ tài khoản nào và loại tin nhắn
            const msgWithOwnId = { 
                ...msg, 
                _accountId: ownId,
                _messageType: msg.isSelf ? 'self' : 'user' 
            };
            console.log(`[Webhook] Đang gửi dữ liệu đến webhook...`);
            triggerN8nWebhook(msgWithOwnId, messageWebhookUrl)
                .then(success => {
                    if (success) {
                        console.log(`[Webhook] Gửi webhook cho tin nhắn mới thành công.`);
                    } else {
                        console.error(`[Webhook] Gửi webhook cho tin nhắn mới thất bại.`);
                    }
                });
        } else {
            console.warn(`[Webhook] Không tìm thấy URL webhook cho tin nhắn mới của tài khoản ${ownId}. Bỏ qua.`);
        }
    });

    // Lắng nghe sự kiện nhóm và gửi đến webhook được cấu hình cho sự kiện nhóm
    api.listener.on("group_event", (data) => {
        const groupEventWebhookUrl = getWebhookUrl("groupEventWebhookUrl");
        if (groupEventWebhookUrl) {
            // Thêm ownId vào dữ liệu
            const dataWithOwnId = { ...data, _accountId: ownId };
            triggerN8nWebhook(dataWithOwnId, groupEventWebhookUrl);
        }
    });

    // Lắng nghe sự kiện reaction và gửi đến webhook được cấu hình cho reaction
    api.listener.on("reaction", (reaction) => {
        const reactionWebhookUrl = getWebhookUrl("reactionWebhookUrl");
        console.log("Nhận reaction:", reaction);
        if (reactionWebhookUrl) {
            // Thêm ownId vào dữ liệu
            const reactionWithOwnId = { ...reaction, _accountId: ownId };
            triggerN8nWebhook(reactionWithOwnId, reactionWebhookUrl);
        }
    });

    api.listener.onConnected(() => {
        console.log(`Connected account ${ownId}`);
        loginResolve('login_success');
        
        // Reset retry counter khi kết nối thành công
        if (reloginAttempts.has(ownId)) {
            const attempts = reloginAttempts.get(ownId);
            if (attempts && attempts.count) {
                console.log(`[Reconnect] Đã kết nối lại thành công sau ${attempts.count} lần thử`);
                attempts.count = 0;
                reloginAttempts.set(ownId, attempts);
            }
        }
        
        // Gửi thông báo đến tất cả client
        try {
            broadcastMessage('login_success');
        } catch (err) {
            console.error('Lỗi khi gửi thông báo WebSocket:', err);
        }
    });
    
    api.listener.onClosed(() => {
        console.log(`[Connection] Closed - API listener đã ngắt kết nối cho tài khoản ${ownId}`);
        
        // Dọn dẹp health check timer nếu có
        if (api._healthCheckTimer) {
            clearInterval(api._healthCheckTimer);
            api._healthCheckTimer = null;
        }
        
        // Xử lý đăng nhập lại khi API listener bị đóng
        handleRelogin(api);
    });
    
    api.listener.onError((error) => {
        console.error(`Error on account ${ownId}:`, error);
    });
}

// Hàm xử lý đăng nhập lại
async function handleRelogin(api) {
    try {
        console.log("[Relogin] Đang thử đăng nhập lại...");
        
        // Lấy ownId của tài khoản bị ngắt kết nối
        const ownId = api.getOwnId();
        
        if (!ownId) {
            console.error("[Relogin] Không thể xác định ownId, không thể đăng nhập lại");
            return;
        }
        
        // Lấy thông tin relogin attempts
        let attemptInfo = reloginAttempts.get(ownId);
        if (!attemptInfo) {
            attemptInfo = { lastTime: 0, count: 0 };
        }
        
        const now = Date.now();
        
        // Kiểm tra thời gian relogin gần nhất
        if (attemptInfo.lastTime && now - attemptInfo.lastTime < RELOGIN_COOLDOWN) {
            console.log(`[Relogin] Bỏ qua việc đăng nhập lại tài khoản ${ownId}, đã thử cách đây ${Math.floor((now - attemptInfo.lastTime) / 1000)} giây`);
            return;
        }
        
        // Kiểm tra số lần retry
        if (attemptInfo.count >= MAX_RETRY_ATTEMPTS) {
            console.error(`[Relogin] Đã vượt quá số lần retry tối đa (${MAX_RETRY_ATTEMPTS}) cho tài khoản ${ownId}. Vui lòng kiểm tra lại.`);
            // Reset counter sau 30 phút
            setTimeout(() => {
                const info = reloginAttempts.get(ownId);
                if (info) {
                    info.count = 0;
                    reloginAttempts.set(ownId, info);
                    console.log(`[Relogin] Đã reset retry counter cho tài khoản ${ownId}`);
                }
            }, 30 * 60 * 1000);
            return;
        }
        
        // Cập nhật thời gian và số lần relogin
        attemptInfo.lastTime = now;
        attemptInfo.count += 1;
        reloginAttempts.set(ownId, attemptInfo);
        
        // Tìm thông tin proxy từ mảng zaloAccounts
        const accountInfo = zaloAccounts.find(acc => acc.ownId === ownId);
        const customProxy = accountInfo?.proxy || null;
        
        // Tìm file cookie tương ứng
        const cookiesDir = './data/cookies';
        const cookieFile = `${cookiesDir}/cred_${ownId}.json`;
        
        if (!fs.existsSync(cookieFile)) {
            console.error(`Không tìm thấy file cookie cho tài khoản ${ownId}`);
            return;
        }
        
        // Đọc cookie từ file
        const cookie = JSON.parse(fs.readFileSync(cookieFile, "utf-8"));
        
        // Đăng nhập lại với cookie
        console.log(`[Relogin] Đang đăng nhập lại tài khoản ${ownId} (Lần thử ${attemptInfo.count}/${MAX_RETRY_ATTEMPTS}) với proxy ${customProxy || 'không có'}...`);
        
        // Thực hiện đăng nhập lại với retry logic
        await loginZaloAccount(customProxy, cookie);
        console.log(`[Relogin] Đã gửi yêu cầu đăng nhập lại cho tài khoản ${ownId}`);
        
    } catch (error) {
        console.error(`[Relogin] Lỗi khi thử đăng nhập lại tài khoản ${ownId}:`, error);
        
        // Thử lại sau một khoảng thời gian nếu còn số lần retry
        const attemptInfo = reloginAttempts.get(ownId);
        if (attemptInfo && attemptInfo.count < MAX_RETRY_ATTEMPTS) {
            const retryDelay = Math.min(RELOGIN_COOLDOWN * attemptInfo.count, 10 * 60 * 1000); // Max 10 phút
            console.log(`[Relogin] Sẽ thử lại sau ${Math.floor(retryDelay / 1000)} giây...`);
            setTimeout(() => {
                handleRelogin(api);
            }, retryDelay);
        }
    }
}
