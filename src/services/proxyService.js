// proxyService.js - Proxy management service
import fs from 'fs';
import path from 'path';
import env from '../config/env.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import nodefetch from 'node-fetch';

class ProxyService {
    constructor() {
        this.RAW_PROXIES = [];
        this.PROXIES = [];
        this.MAX_ACCOUNTS_PER_PROXY = env.MAX_ACCOUNTS_PER_PROXY;
    }

    init() {
        const proxiesFilePath = env.PROXIES_FILE;
        const dataDir = path.dirname(proxiesFilePath);

        // Đảm bảo thư mục data tồn tại
        if (!fs.existsSync(dataDir)) {
            try {
                fs.mkdirSync(dataDir, { recursive: true });
                console.log(`Created data directory: ${dataDir}`);
            } catch (err) {
                console.error(`Error creating data directory: ${err.message}`);
            }
        }

        try {
            if (!fs.existsSync(proxiesFilePath)) {
                console.log('proxies.json not found, creating new empty file...');
                fs.writeFileSync(proxiesFilePath, '[]', 'utf8');
                this.RAW_PROXIES = [];
            } else {
                const data = fs.readFileSync(proxiesFilePath, 'utf8');
                this.RAW_PROXIES = JSON.parse(data);
            }
        } catch (err) {
            console.error('Error initializing proxies.json:', err.message);
            this.RAW_PROXIES = [];
        }
        this.PROXIES = this.RAW_PROXIES.map(p => ({ url: p, usedCount: 0, accounts: [] }));
    }

    getAvailableProxyIndex() {
        // Lazy init
        if (this.PROXIES.length === 0 && this.RAW_PROXIES.length === 0) {
            this.init();
        }

        for (let i = 0; i < this.PROXIES.length; i++) {
            if (this.PROXIES[i].usedCount < this.MAX_ACCOUNTS_PER_PROXY) {
                return i;
            }
        }
        return -1;
    }

    addProxy(proxyUrl) {
        const proxiesFilePath = env.PROXIES_FILE;
        const newProxy = { url: proxyUrl, usedCount: 0, accounts: [] };
        this.PROXIES.push(newProxy);
        this.RAW_PROXIES.push(proxyUrl);
        fs.writeFileSync(proxiesFilePath, JSON.stringify(this.RAW_PROXIES, null, 2));
        return newProxy;
    }

    removeProxy(proxyUrl) {
        const proxiesFilePath = env.PROXIES_FILE;
        const index = this.PROXIES.findIndex(p => p.url === proxyUrl);
        if (index === -1) {
            throw new Error('Không tìm thấy proxy');
        }
        this.PROXIES.splice(index, 1);
        const rawIndex = this.RAW_PROXIES.indexOf(proxyUrl);
        if (rawIndex !== -1) {
            this.RAW_PROXIES.splice(rawIndex, 1);
        }
        fs.writeFileSync(proxiesFilePath, JSON.stringify(this.RAW_PROXIES, null, 2));
        return true;
    }

    getPROXIES() {
        // Lazy init
        if (this.PROXIES.length === 0 && this.RAW_PROXIES.length === 0) {
            this.init();
        }
        return this.PROXIES;
    }

    async checkProxyAlive(proxyUrl) {
        try {
            const agent = new HttpsProxyAgent(proxyUrl);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await nodefetch('https://zalo.me', {
                agent,
                signal: controller.signal
            });

            clearTimeout(timeout);
            return response.ok;
        } catch (error) {
            console.error(`[ProxyCheck] Proxy ${proxyUrl} failed:`, error.message);
            return false;
        }
    }
}

const proxyService = new ProxyService();

// Export instance
export { proxyService };

// Export các hàm tiện ích để compatibility với code cũ
export const getPROXIES = () => proxyService.getPROXIES();
export const getAvailableProxyIndex = () => proxyService.getAvailableProxyIndex();
export const addProxy = (proxyUrl) => proxyService.addProxy(proxyUrl);
export const removeProxy = (proxyUrl) => proxyService.removeProxy(proxyUrl);
export const checkProxyAlive = (proxyUrl) => proxyService.checkProxyAlive(proxyUrl);
