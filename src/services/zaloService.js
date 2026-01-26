// services/zaloService.js - Core Zalo functionality
import { Zalo, ThreadType } from 'zca-js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import nodefetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import env from '../config/env.js';
import { getPROXIES, getAvailableProxyIndex, checkProxyAlive } from './proxyService.js';
import { setupEventListeners } from './eventService.js';

// Danh sách tài khoản Zalo đã đăng nhập
export const zaloAccounts = [];

// Hàm gửi webhook khi đăng nhập thành công
async function sendLoginSuccessWebhook(profile, trackingId, customProxy, proxyUsed, useCustomProxy) {
    if (!env.WEBHOOK_LOGIN_SUCCESS) {
        console.warn('[Webhook] WEBHOOK_LOGIN_SUCCESS environment variable is not set. Skipping login webhook.');
        return;
    }

    try {
        if (!profile) {
            console.error('[Webhook] Không có thông tin profile để gửi webhook');
            return;
        }

        const webhookPayload = {
            event: 'login_success',
            id: trackingId || null,
            data: {
                ownId: profile.userId,
                displayName: profile.displayName,
                phoneNumber: profile.phoneNumber,
                proxy: useCustomProxy ? customProxy : (proxyUsed && proxyUsed.url)
            },
            timestamp: Date.now()
        };

        console.log(`[Webhook] Đang gửi thông báo đăng nhập thành công cho ${profile.displayName} (${profile.userId}) tới ${env.WEBHOOK_LOGIN_SUCCESS}...`);
        const response = await nodefetch(env.WEBHOOK_LOGIN_SUCCESS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload)
        });

        if (response.ok) {
            console.log(`[Webhook] Gửi thành công! Status: ${response.status}`);
        } else {
            console.error(`[Webhook] Gửi thất bại! Status: ${response.status}`);
        }
    } catch (error) {
        console.error('[Webhook] Lỗi khi gửi webhook đăng nhập:', error.message);
    }
}

// Hàm gửi webhook khi proxy lỗi
async function sendErrorWebhook(proxyUrl, trackingId, errorDetail) {
    if (!env.ERROR_WEBHOOK_URL) {
        console.warn('[Webhook] ERROR_WEBHOOK_URL environment variable is not set. Skipping error webhook.');
        return;
    }

    try {
        const webhookPayload = {
            event: 'proxy_error',
            id: trackingId || null,
            data: {
                proxy: proxyUrl,
                error: errorDetail
            },
            timestamp: Date.now()
        };

        console.log(`[Webhook] Đang gửi thông báo lỗi proxy tới ${env.ERROR_WEBHOOK_URL}...`);
        const response = await nodefetch(env.ERROR_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload)
        });

        if (response.ok) {
            console.log(`[Webhook] Gửi thông báo lỗi thành công!`);
        } else {
            console.error(`[Webhook] Gửi thông báo lỗi thất bại! Status: ${response.status}`);
        }
    } catch (error) {
        console.error('[Webhook] Lỗi khi gửi webhook báo lỗi:', error.message);
    }
}

// Hàm đăng nhập tài khoản Zalo
export async function loginZaloAccount(customProxy, cred, trackingId, qrCallback) {
    let loginResolve;
    return new Promise(async (resolve, reject) => {
        console.log('Bắt đầu quá trình đăng nhập Zalo...');
        console.log('Custom proxy:', customProxy || 'không có');
        console.log('Đang nhập với cookie:', cred ? 'có' : 'không');

        loginResolve = resolve;
        let agent;
        let proxyUsed = null;
        let useCustomProxy = false;
        let proxies = [];

        try {
            // Đảm bảo thư mục data tồn tại trước khi đọc file
            if (!fs.existsSync(env.DATA_PATH)) {
                fs.mkdirSync(env.DATA_PATH, { recursive: true });
                console.log(`Đã tạo thư mục: ${env.DATA_PATH}`);
            }

            if (!fs.existsSync(env.PROXIES_FILE)) {
                fs.writeFileSync(env.PROXIES_FILE, '[]', 'utf8');
                console.log(`Đã tạo file proxies.json trống`);
            }

            const proxiesJson = fs.readFileSync(env.PROXIES_FILE, 'utf8');
            proxies = JSON.parse(proxiesJson);
            // Filter out invalid example proxies that might have been saved
            proxies = proxies.filter(p => !p.includes('proxy.example.com'));
            console.log(`Đã đọc ${proxies.length} proxy từ file proxies.json (đã lọc invalid)`);
        } catch (error) {
            console.error("Không thể đọc hoặc phân tích cú pháp proxies.json:", error);
            proxies = [];
        }

        // Kiểm tra nếu người dùng truyền proxy
        if (customProxy && customProxy.trim() !== "") {
            try {
                new URL(customProxy);
                useCustomProxy = true;
                console.log('Sử dụng proxy từ request:', customProxy);

                // Lưu vào proxies.json nếu chưa có và hợp lệ
                if (!proxies.includes(customProxy) && !customProxy.includes('proxy.example.com')) {
                    proxies.push(customProxy);
                    fs.writeFileSync(env.PROXIES_FILE, JSON.stringify(proxies, null, 4), 'utf8');
                    console.log(`Đã thêm proxy mới vào proxies.json: ${customProxy}`);
                }

                agent = new HttpsProxyAgent(customProxy);
            } catch (err) {
                console.log(`Proxy không hợp lệ: ${customProxy}. Sẽ thử tự động chọn proxy từ file.`);
                useCustomProxy = false;
            }
        }

        // Nếu không truyền proxy hoặc proxy không hợp lệ → tự động chọn từ proxies.json
        if (!useCustomProxy) {
            if (proxies.length > 0) {
                const proxyIndex = getAvailableProxyIndex();
                if (proxyIndex === -1) {
                    console.log('Tất cả proxy đều đã đủ tài khoản. Đăng nhập không qua proxy.');
                    agent = null;
                } else {
                    proxyUsed = getPROXIES()[proxyIndex];
                    console.log('Tự động chọn proxy:', proxyUsed.url);
                    agent = new HttpsProxyAgent(proxyUsed.url);
                }
            } else {
                console.log('Không có proxy nào trong file, đăng nhập trực tiếp');
                agent = null;
            }
        }

        // --- PROXY VALIDATION CHECK ---
        const activeProxyUrl = useCustomProxy ? customProxy : (proxyUsed ? proxyUsed.url : null);

        if (activeProxyUrl) {
            console.log(`[ProxyCheck] Đang kiểm tra kết nối proxy: ${activeProxyUrl}...`);
            const isAlive = await checkProxyAlive(activeProxyUrl);

            if (!isAlive) {
                const errorMsg = `Proxy không hoạt động hoặc không kết nối được tới Zalo: ${activeProxyUrl}`;
                console.error(`[ProxyCheck] ❌ ${errorMsg}`);

                // Gửi webhook báo lỗi
                await sendErrorWebhook(activeProxyUrl, trackingId, 'Connection failed or timeout');

                return reject(new Error(errorMsg));
            }
            console.log(`[ProxyCheck] ✅ Proxy hoạt động tốt.`);
        }
        // ------------------------------

        let zalo;
        if (agent) {
            console.log('Khởi tạo Zalo SDK với proxy');
            zalo = new Zalo({
                agent: agent,
                polyfill: nodefetch,
                selfListen: true,
            });
        } else {
            console.log('Khởi tạo Zalo SDK không có proxy');
            zalo = new Zalo({
                selfListen: true,
            });
        }

        let api;
        try {
            if (cred) {
                console.log('Đang thử đăng nhập bằng cookie...');
                try {
                    api = await zalo.login(cred);
                    console.log('Đăng nhập bằng cookie thành công');
                } catch (error) {
                    console.error("Lỗi khi đăng nhập bằng cookie:", error);
                    console.log('Chuyển sang đăng nhập bằng mã QR...');
                    api = await zalo.loginQR(null, (qrData) => {
                        console.log('Đã nhận dữ liệu QR:', qrData ? 'có dữ liệu' : 'không có dữ liệu');
                        if (qrData?.data?.image) {
                            const qrCodeImage = `data:image/png;base64,${qrData.data.image}`;
                            console.log('Đã tạo mã QR, độ dài:', qrCodeImage.length);
                            // Gọi callback để gửi QR về UI, KHÔNG resolve Promise
                            if (qrCallback) {
                                qrCallback(qrCodeImage);
                            }
                        }
                    });
                }
            } else {
                console.log('Đang tạo mã QR để đăng nhập...');
                api = await zalo.loginQR(null, (qrData) => {
                    console.log('Đã nhận dữ liệu QR:', qrData ? 'có dữ liệu' : 'không có dữ liệu');
                    if (qrData?.data?.image) {
                        const qrCodeImage = `data:image/png;base64,${qrData.data.image}`;
                        console.log('Đã tạo mã QR, độ dài:', qrCodeImage.length);
                        // Gọi callback để gửi QR về UI, KHÔNG resolve Promise
                        if (qrCallback) {
                            qrCallback(qrCodeImage);
                        }
                    }
                });
            }

            console.log('Thiết lập event listeners');
            setupEventListeners(api, loginResolve);

            api.listener.start({ retryOnClose: true });
            api.listener.isStarted = true;

            if (!useCustomProxy && proxyUsed) {
                proxyUsed.usedCount++;
                proxyUsed.accounts.push(api);
                console.log(`Đã cập nhật proxy ${proxyUsed.url} với usedCount = ${proxyUsed.usedCount}`);
            }

            console.log('Đang lấy thông tin tài khoản...');
            const accountInfo = await api.fetchAccountInfo();
            if (!accountInfo?.profile) {
                console.error('Không tìm thấy thông tin profile trong phản hồi');
                throw new Error("Không tìm thấy thông tin profile");
            }

            const { profile } = accountInfo;
            const phoneNumber = profile.phoneNumber;
            const ownId = profile.userId;
            const displayName = profile.displayName;
            console.log(`Thông tin tài khoản: ID=${ownId}, Tên=${displayName}, SĐT=${phoneNumber}`);

            await sendLoginSuccessWebhook(profile, trackingId, customProxy, proxyUsed, useCustomProxy);

            const existingAccountIndex = zaloAccounts.findIndex(acc => acc.ownId === ownId);
            if (existingAccountIndex !== -1) {
                zaloAccounts[existingAccountIndex] = {
                    api, ownId,
                    proxy: useCustomProxy ? customProxy : (proxyUsed && proxyUsed.url),
                    phoneNumber,
                    displayName
                };
                console.log('Đã cập nhật tài khoản hiện có trong danh sách zaloAccounts');
            } else {
                zaloAccounts.push({
                    api, ownId,
                    proxy: useCustomProxy ? customProxy : (proxyUsed && proxyUsed.url),
                    phoneNumber,
                    displayName
                });
                console.log('Đã thêm tài khoản mới vào danh sách zaloAccounts');
            }

            console.log('Đang lưu credentials...');
            const context = await api.getContext();
            const { imei, cookie, userAgent } = context;
            const credData = { imei, cookie, userAgent };

            // Save to file
            const cookiesDir = env.COOKIES_DIR;
            console.log(`[SaveCredentials] Đường dẫn cookies dir: ${cookiesDir}`);
            console.log(`[SaveCredentials] Absolute path: ${path.resolve(cookiesDir)}`);

            if (!fs.existsSync(cookiesDir)) {
                console.log(`[SaveCredentials] Tạo thư mục: ${cookiesDir}`);
                fs.mkdirSync(cookiesDir, { recursive: true });
            }

            const credFilePath = path.join(cookiesDir, `cred_${ownId}.json`);
            console.log(`[SaveCredentials] Đang lưu vào: ${credFilePath}`);

            try {
                fs.writeFileSync(credFilePath, JSON.stringify(credData, null, 4));
                console.log(`✓ Đã lưu credentials thành công`);

                // Verify file exists
                if (fs.existsSync(credFilePath)) {
                    const stats = fs.statSync(credFilePath);
                    console.log(`✓ File đã tồn tại: ${credFilePath} (${stats.size} bytes)`);
                } else {
                    console.error(`✗ File không tồn tại sau khi lưu: ${credFilePath}`);
                }
            } catch (saveError) {
                console.error(`✗ Lỗi khi lưu file:`, saveError);
            }


            console.log(`Đã hoàn tất quá trình đăng nhập vào tài khoản ${ownId} qua proxy ${useCustomProxy ? customProxy : (proxyUsed?.url || 'không có proxy')}`);

            // Resolve Promise với thông tin account
            resolve({ ownId, displayName, phoneNumber });
        } catch (error) {
            console.error('Lỗi trong quá trình đăng nhập Zalo:', error);
            reject(error);
        }
    });
}

// Đăng xuất tài khoản Zalo
export async function logoutZaloAccount(ownId) {
    const accountIndex = zaloAccounts.findIndex(acc => acc.ownId === ownId);

    if (accountIndex === -1) {
        return { success: false, message: 'Không tìm thấy tài khoản' };
    }

    try {
        const account = zaloAccounts[accountIndex];

        // Stop listener if active
        if (account.api && account.api.listener) {
            try {
                account.api.listener.stop();
            } catch (e) {
                console.log('Lỗi khi dừng listener:', e.message);
            }
        }

        // Remove from array
        zaloAccounts.splice(accountIndex, 1);

        // Delete from database
        try {
            await deleteZaloCredentials(ownId);
            console.log(`✓ Đã xóa credentials khỏi database cho ${ownId}`);
        } catch (dbError) {
            console.error('Lỗi xóa khỏi database:', dbError);
        }

        // Delete cookie file (backup)
        const cookieFilePath = path.join(env.COOKIES_DIR, `cred_${ownId}.json`);
        if (fs.existsSync(cookieFilePath)) {
            fs.unlinkSync(cookieFilePath);
            console.log(`Đã xóa cookie file: ${cookieFilePath}`);
        }

        console.log(`Đã đăng xuất tài khoản: ${ownId}`);
        return { success: true, message: 'Đăng xuất thành công' };
    } catch (error) {
        console.error('Lỗi khi đăng xuất:', error);
        return { success: false, message: error.message };
    }
}

// Khởi tạo đăng nhập từ cookie files
export async function initLoginFromCookies() {
    console.log('🔄 Khởi tạo đăng nhập từ cookie files...');

    const cookiesDir = env.COOKIES_DIR;
    if (!fs.existsSync(cookiesDir)) {
        console.log(`Thư mục cookies không tồn tại, đang tạo: ${cookiesDir}`);
        fs.mkdirSync(cookiesDir, { recursive: true });
        console.log('✓ Đã tạo thư mục cookies');
        return;
    }

    try {
        const cookieFiles = fs.readdirSync(cookiesDir).filter(f => f.startsWith('cred_') && f.endsWith('.json'));
        console.log(`Tìm thấy ${cookieFiles.length} cookie files`);

        if (cookieFiles.length === 0) {
            console.log('ℹ Chưa có credentials nào được lưu. Đăng nhập qua API: POST /api/zalo/login');
            return;
        }

        for (const file of cookieFiles) {
            const ownId = file.substring(5, file.length - 5);

            // Skip if already logged in
            if (zaloAccounts.some(acc => acc.ownId === ownId)) {
                console.log(`⏭ Tài khoản ${ownId} đã đăng nhập, bỏ qua`);
                continue;
            }

            try {
                const cookiePath = `${cookiesDir}/${file}`;
                if (fs.existsSync(cookiePath)) {
                    const cookie = JSON.parse(fs.readFileSync(cookiePath, "utf-8"));
                    try {
                        await loginFromCookieOnly(cookie, ownId);
                        console.log(`✓ Đã đăng nhập lại tài khoản ${ownId} từ file`);
                    } catch (loginError) {
                        console.error(`✗ Không thể đăng nhập tài khoản ${ownId}: ${loginError.message}`);
                        console.log(`  → Cookie có thể đã hết hạn. Cần đăng nhập lại qua API.`);
                    }
                }
            } catch (error) {
                console.error(`Lỗi khi đọc/xử lý cookie cho tài khoản ${ownId}:`, error.message);
            }
        }
    } catch (dirError) {
        console.error(`Lỗi khi đọc thư mục cookies:`, dirError);
    }
}

// Đăng nhập chỉ bằng cookie (không fallback sang QR)
async function loginFromCookieOnly(cred, expectedOwnId) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`[LoginFromCookie] Bắt đầu đăng nhập cho ${expectedOwnId}`);
            console.log(`[LoginFromCookie] Cookie có imei: ${cred.imei ? 'Có' : 'Không'}`);
            console.log(`[LoginFromCookie] Cookie có userAgent: ${cred.userAgent ? 'Có' : 'Không'}`);

            const zalo = new Zalo({ selfListen: true });

            try {
                const api = await zalo.login(cred);
                console.log(`[LoginFromCookie] ✓ Zalo.login() thành công cho ${expectedOwnId}`);

                // Setup event listeners
                let loginResolve = () => { };
                setupEventListeners(api, loginResolve);

                api.listener.start({ retryOnClose: true });
                api.listener.isStarted = true;
                console.log(`[LoginFromCookie] ✓ Listener started cho ${expectedOwnId}`);

                // Lấy thông tin tài khoản để verify
                console.log(`[LoginFromCookie] Đang fetch account info...`);
                const accountInfo = await api.fetchAccountInfo();

                if (!accountInfo?.profile) {
                    throw new Error("Không lấy được thông tin profile sau khi đăng nhập");
                }

                const { profile } = accountInfo;
                const ownId = profile.userId;
                const phoneNumber = profile.phoneNumber;
                const displayName = profile.displayName;

                console.log(`[LoginFromCookie] ✓ Account info: ${displayName} (${ownId}) - ${phoneNumber}`);

                // Thêm vào danh sách accounts
                const existingIndex = zaloAccounts.findIndex(acc => acc.ownId === ownId);
                if (existingIndex !== -1) {
                    zaloAccounts[existingIndex] = { api, ownId, proxy: null, phoneNumber, displayName };
                    console.log(`[LoginFromCookie] Cập nhật tài khoản hiện có trong zaloAccounts`);
                } else {
                    zaloAccounts.push({ api, ownId, proxy: null, phoneNumber, displayName });
                    console.log(`[LoginFromCookie] Thêm tài khoản mới vào zaloAccounts`);
                }

                resolve({ ownId, displayName, phoneNumber });
            } catch (loginError) {
                console.error(`[LoginFromCookie] ✗ Lỗi trong zalo.login():`, loginError);
                console.error(`[LoginFromCookie] Error type: ${loginError.constructor.name}`);
                console.error(`[LoginFromCookie] Error message: ${loginError.message}`);
                if (loginError.stack) {
                    console.error(`[LoginFromCookie] Stack trace:`, loginError.stack.split('\n').slice(0, 3).join('\n'));
                }
                throw new Error(`Đăng nhập thất bại: ${loginError.message || 'Cookie không hợp lệ hoặc đã hết hạn'}`);
            }
        } catch (error) {
            console.error(`[LoginFromCookie] ✗ Lỗi tổng thể:`, error.message);
            reject(error);
        }
    });
}
