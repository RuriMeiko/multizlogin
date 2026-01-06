// server.js - HTTP and WebSocket server
import http from 'http';
import { WebSocketServer } from 'ws';
import app from './app.js';
import env from './config/env.js';
import { setBroadcastFunction } from './services/eventService.js';

const PORT = env.PORT;

// Tạo HTTP server
const server = http.createServer(app);

// Tạo WebSocket server
const wss = new WebSocketServer({ server });

// Lưu trữ kết nối WebSocket
export const webSocketClients = new Set();

// Xử lý kết nối WebSocket
wss.on('connection', (ws) => {
    console.log('Có một kết nối WebSocket mới');
    webSocketClients.add(ws);
    
    ws.on('close', () => {
        console.log('Kết nối WebSocket đã đóng');
        webSocketClients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error('Lỗi WebSocket:', error);
        webSocketClients.delete(ws);
    });
});

// Hàm gửi thông báo đến tất cả client WebSocket
export function broadcastMessage(message) {
    const deadClients = [];
    
    webSocketClients.forEach((client) => {
        try {
            if (client.readyState === 1) { // 1 = OPEN
                client.send(message);
            } else {
                deadClients.push(client);
            }
        } catch (error) {
            console.error('Lỗi khi gửi message qua WebSocket:', error);
            deadClients.push(client);
        }
    });
    
    deadClients.forEach(client => webSocketClients.delete(client));
}

// Set broadcast function for event service
setBroadcastFunction(broadcastMessage);

// Start server
server.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
