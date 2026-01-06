# MultiZlogin

Hệ thống quản lý đa tài khoản Zalo, hỗ trợ đăng nhập và quản lý nhiều tài khoản Zalo cùng lúc, tích hợp proxy và webhook với tính năng auto-reconnection và persistent storage.

## Tính năng

- ✅ Đăng nhập nhiều tài khoản Zalo thông qua mã QR
- ✅ Hỗ trợ đăng nhập qua proxy với load balancing
- ✅ Quản lý danh sách proxy tự động
- ✅ Cấu hình webhook riêng cho từng loại sự kiện
- ✅ Giám sát trạng thái kết nối của các tài khoản
- ✅ **Auto-reconnection** khi mất kết nối
- ✅ **Health check mechanism** để phát hiện connection issues
- ✅ **Persistent storage** với Docker volumes (không mất data khi restart)
- ✅ API RESTful để tích hợp với các hệ thống khác (N8N-friendly)
- ✅ Nhận tin nhắn và sự kiện từ Zalo thông qua webhook real-time
- ✅ API Key authentication cho tích hợp bên ngoài

## Cải tiến mới (v2.0)

### 🔄 Auto-Reconnection
- Tự động phát hiện và reconnect khi connection bị đóng
- Exponential backoff để tránh spam reconnect
- Retry logic thông minh với cooldown period
- **Race condition protection** với relogin lock mechanism

### 🏥 Health Check
- Kiểm tra connection health mỗi 2 phút
- Docker health check endpoint: `/health`
- Tự động trigger reconnection khi phát hiện vấn đề

### 💾 Docker Volumes
- Lưu trữ cookies và session persistent
- Giữ lại cấu hình proxy
- Không mất data khi restart/rebuild container

### 🛡️ Production-Ready Stability
- **Không có memory leaks** - Proper cleanup cho timers, event listeners, temp files
- **Error handling đầy đủ** - Tất cả promises và async operations được handle
- **Resource management** - WebSocket connections và file operations được cleanup đúng cách

📖 **Chi tiết sử dụng:** Xem [USAGE.md](USAGE.md)

## Cài đặt

### Yêu cầu hệ thống

- Node.js v20 trở lên
- Docker & Docker Compose (khuyến nghị)
- npm hoặc yarn

### Các bước cài đặt

1. Clone repository:
   ```bash
   git clone https://github.com/yourusername/multizlogin.git
   cd multizlogin
   ```

2. Tạo file `.env` từ file mẫu:
   ```bash
   cp .env.example .env
   ```

3. Cấu hình các biến môi trường trong file `.env`:
   ```env
   PORT=3000
   SESSION_SECRET=your_secret_key_change_this
   MESSAGE_WEBHOOK_URL=https://your-n8n.com/webhook/message
   GROUP_EVENT_WEBHOOK_URL=https://your-n8n.com/webhook/group-events
   REACTION_WEBHOOK_URL=https://your-n8n.com/webhook/reactions
   WEBHOOK_LOGIN_SUCCESS=https://your-n8n.com/webhook/login-success
   ```

4. Khởi động với Docker (Khuyến nghị):
   ```bash
   docker-compose up -d
   ```
   
   Hoặc chạy trực tiếp với Node.js:
   ```bash
   npm install
   npm start
   ```

5. Kiểm tra health status:
   ```bash
   curl http://localhost:3000/health
   ```

## Docker Volumes và Persistent Storage

Hệ thống sử dụng Docker volumes để lưu trữ data persistent:

```yaml
volumes:
  - ./data:/app/data              # Cookies và proxies
```

### Dữ liệu được lưu trữ:
- **Cookies**: `./data/cookies/cred_<ownId>.json` - Session cookies cho auto-login
- **User Accounts & API Keys**: `./data/cookies/users.json` - Thông tin đăng nhập và API keys
- **Proxies**: `./data/proxies.json` - Danh sách proxy và usage tracking
- **Webhook URLs**: Cấu hình qua environment variables trong `.env`

### ⚠️ QUAN TRỌNG: Deploy trên Dokploy/Cloud

Khi deploy trên các platform như Dokploy, Heroku, Railway, v.v., **BẮT BUỘC phải cấu hình volumes** để tránh mất dữ liệu khi redeploy.

**Giải pháp:** Sử dụng file [dokploy-compose.yaml](dokploy-compose.yaml) với **named volumes**.

📖 **Chi tiết:** Xem [USAGE.md](USAGE.md) để biết hướng dẫn đầy đủ.

### Reset container an toàn (giữ data):
```bash
docker-compose restart              # Restart nhanh
# hoặc
docker-compose down && docker-compose up -d  # Restart đầy đủ
```

3. Khởi động với Docker:
   ```
   docker-compose up -d
   ```

### Xuất bản Docker Image

Build và xuất bản image:
```bash
docker-compose build
docker tag multizlogin_zalo-server:latest yourusername/zalo-server:latest
docker push yourusername/zalo-server:latest
```

## Sử dụng

1. Mở trình duyệt và truy cập: `http://localhost:3000`
2. Đăng nhập tài khoản admin (mặc định: `admin/admin`)
3. Đăng nhập tài khoản Zalo thông qua nút "Đăng nhập Zalo"
4. Quản lý tài khoản và thiết lập webhook trong trang "Quản lý tài khoản"
5. Quản lý proxy trong trang "Quản lý Proxy"

## API

### Xác thực API

API hỗ trợ 2 phương thức xác thực:

1. **Session-based** (cho UI): Đăng nhập qua `/admin-login`
2. **API Key** (cho tích hợp): Header `X-API-Key: your_api_key`

Để lấy API Key: Đăng nhập vào UI > Settings > Generate API Key

### Các API chính

- `GET /api/accounts` - Danh sách tài khoản Zalo đã đăng nhập
- `GET /api/accounts/:ownId` - Chi tiết tài khoản
- `DELETE /api/accounts/:ownId` - Xóa tài khoản
- `POST /api/accounts/sendMessage` - Gửi tin nhắn (N8N-friendly)
- `POST /api/accounts/sendImage` - Gửi hình ảnh
- `POST /api/accounts/findUser` - Tìm người dùng
- `POST /api/accounts/getUserInfo` - Lấy thông tin người dùng
- `POST /api/accounts/createGroup` - Tạo nhóm
- `POST /api/accounts/action` - Action handler chung

📖 **API Documentation:** Truy cập `/api-docs` để xem Swagger UI

## Tích hợp với n8n

MultiZlogin được thiết kế để tích hợp dễ dàng với n8n:

1. Tạo Webhook Node trong n8n
2. Cấu hình webhook URL trong `.env`:
   - `MESSAGE_WEBHOOK_URL` - Nhận tin nhắn đến
   - `GROUP_EVENT_WEBHOOK_URL` - Sự kiện nhóm
   - `REACTION_WEBHOOK_URL` - Reaction tin nhắn
3. Sử dụng HTTP Request Node để gọi API với header `X-API-Key`

## Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng mở issue hoặc pull request để cải thiện dự án.

## Giấy phép

[MIT](LICENSE)

## Tuyên bố trách nhiệm

Dự án này được phát triển với mục đích nghiên cứu và học tập. Người dùng chịu hoàn toàn trách nhiệm khi sử dụng dự án này phải tuân thủ các điều khoản dịch vụ của Zalo và các quy định pháp luật hiện hành. Chúng tôi không chịu trách nhiệm cho bất kỳ hành vi vi phạm nào.

## Lời cảm ơn

Chân thành cảm ơn đội ngũ ZCA đã phát triển thư viện zca-js, giúp chúng tôi có thể xây dựng dự án này.