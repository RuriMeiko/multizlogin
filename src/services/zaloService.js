// services/zaloService.js - Core Zalo functionality
import { Zalo, ThreadType } from 'zca-js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import nodefetch from 'node-fetch';
import fs from 'fs';
import env from '../config/env.js';
import { getPROXIES, getAvailableProxyIndex } from './proxyService.js';
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

// Hàm đăng nhập tài khoản Zalo
export async function loginZaloAccount(customProxy, cred, trackingId) {
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
            const proxiesJson = fs.readFileSync(env.PROXIES_FILE, 'utf8');
            proxies = JSON.parse(proxiesJson);
            console.log(`Đã đọc ${proxies.length} proxy từ file proxies.json`);
        } catch (error) {
            console.error("Không thể đọc hoặc phân tích cú pháp proxies.json:", error);
            console.log('Đang tạo file proxies.json trống...');
            if (!fs.existsSync(env.DATA_PATH)) {
                fs.mkdirSync(env.DATA_PATH, { recursive: true });
            }
            fs.writeFileSync(env.PROXIES_FILE, '[]', 'utf8');
            proxies = [];
        }

        // Kiểm tra nếu người dùng nhập proxy
        if (customProxy && customProxy.trim() !== "") {
            try {
                new URL(customProxy);
                useCustomProxy = true;
                console.log('Proxy nhập vào hợp lệ:', customProxy);

                if (!proxies.includes(customProxy)) {
                    proxies.push(customProxy);
                    fs.writeFileSync(env.PROXIES_FILE, JSON.stringify(proxies, null, 4), 'utf8');
                    console.log(`Đã thêm proxy mới vào proxies.json: ${customProxy}`);
                }
            } catch (err) {
                console.log(`Proxy nhập vào không hợp lệ: ${customProxy}. Sẽ sử dụng proxy mặc định.`);
            }
        }

        if (useCustomProxy) {
            console.log('Sử dụng proxy tùy chỉnh:', customProxy);
            agent = new HttpsProxyAgent(customProxy);
        } else {
            if (proxies.length > 0) {
                const proxyIndex = getAvailableProxyIndex();
                if (proxyIndex === -1) {
                    console.log('Tất cả proxy đều đã đủ tài khoản. Không thể đăng nhập thêm!');
                } else {
                    proxyUsed = getPROXIES()[proxyIndex];
                    console.log('Sử dụng proxy tự động:', proxyUsed.url);
                    agent = new HttpsProxyAgent(proxyUsed.url);
                }
            } else {
                console.log('Không có proxy nào có sẵn, sẽ đăng nhập không qua proxy');
                agent = null;
            }
        }
        
        let zalo;
        if (useCustomProxy || agent) {
            console.log('Khởi tạo Zalo SDK với proxy agent');
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
                            resolve(qrCodeImage);
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
                        resolve(qrCodeImage);
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
                    phoneNumber 
                };
                console.log('Đã cập nhật tài khoản hiện có trong danh sách zaloAccounts');
            } else {
                zaloAccounts.push({ 
                    api, ownId, 
                    proxy: useCustomProxy ? customProxy : (proxyUsed && proxyUsed.url), 
                    phoneNumber 
                });
                console.log('Đã thêm tài khoản mới vào danh sách zaloAccounts');
            }

            console.log('Đang lưu cookie...');
            const context = await api.getContext();
            const { imei, cookie, userAgent } = context;
            const data = { imei, cookie, userAgent };
            
            const cookiesDir = env.COOKIES_DIR;
            if (!fs.existsSync(cookiesDir)) {
                fs.mkdirSync(cookiesDir, { recursive: true });
                console.log('Đã tạo thư mục cookies');
            }
            
            fs.access(`${cookiesDir}/cred_${ownId}.json`, fs.constants.F_OK, (err) => {
                if (err) {
                    fs.writeFile(`${cookiesDir}/cred_${ownId}.json`, JSON.stringify(data, null, 4), (err) => {
                        if (err) {
                            console.error('Lỗi khi ghi file cookie:', err);
                        } else {
                            console.log(`Đã lưu cookie vào file cred_${ownId}.json`);
                        }
                    });
                } else {
                    console.log(`File cred_${ownId}.json đã tồn tại, không ghi đè`);
                }
            });

            console.log(`Đã hoàn tất quá trình đăng nhập vào tài khoản ${ownId} qua proxy ${useCustomProxy ? customProxy : (proxyUsed?.url || 'không có proxy')}`);
        } catch (error) {
            console.error('Lỗi trong quá trình đăng nhập Zalo:', error);
            reject(error);
        }
    });
}

// Khởi tạo đăng nhập từ cookies đã lưu
export async function initLoginFromCookies() {
    const cookiesDir = env.COOKIES_DIR;
    if (!fs.existsSync(cookiesDir)) {
        console.log(`Thư mục cookies không tồn tại: ${cookiesDir}`);
        fs.mkdirSync(cookiesDir, { recursive: true });
        return;
    }
    
    try {
        const cookieFiles = fs.readdirSync(cookiesDir);
        if (zaloAccounts.length < cookieFiles.length) {
            console.log('Số lượng tài khoản Zalo nhỏ hơn số lượng cookie files. Đang đăng nhập lại từ cookie...');

            for (const file of cookieFiles) {
                if (file.startsWith('cred_') && file.endsWith('.json')) {
                    const ownId = file.substring(5, file.length - 5);
                    try {
                        const cookiePath = `${cookiesDir}/${file}`;
                        if (fs.existsSync(cookiePath)) {
                            const cookie = JSON.parse(fs.readFileSync(cookiePath, "utf-8"));
                            try {
                                await loginZaloAccount(null, cookie);
                                console.log(`Đã đăng nhập lại tài khoản ${ownId} từ cookie.`);
                            } catch (loginError) {
                                console.error(`Lỗi khi đăng nhập lại tài khoản ${ownId} từ cookie:`, loginError);
                            }
                        }
                    } catch (error) {
                        console.error(`Lỗi khi đọc/xử lý cookie cho tài khoản ${ownId}:`, error);
                    }
                }
            }
        }
    } catch (dirError) {
        console.error(`Lỗi khi đọc thư mục cookies:`, dirError);
    }
}
