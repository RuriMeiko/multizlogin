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
- ✅ API RESTful để tích hợp với các hệ thống khác
- ✅ Nhận tin nhắn và sự kiện từ Zalo thông qua webhook real-time

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
- Script monitoring: `./scripts/health-check.sh`

### 💾 Docker Volumes
- Lưu trữ cookies và session persistent
- Giữ lại cấu hình proxy
- Không mất data khi restart/rebuild container

### 🛡️ Production-Ready Stability
- **Không có memory leaks** - Proper cleanup cho timers, event listeners, temp files
- **Error handling đầy đủ** - Tất cả promises và async operations được handle
- **Resource management** - WebSocket connections và file operations được cleanup đúng cách
- **Có thể chạy ổn định vô thời hạn** - Đã fix 9 vấn đề nghiêm trọng

📖 **Chi tiết:** Xem [SYSTEM_CHECK_REPORT.md](SYSTEM_CHECK_REPORT.md) để biết tất cả các vấn đề đã được sửa.

## Cài đặt

### Yêu cầu hệ thống

- Node.js v16 trở lên
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

**Vấn đề:** Mỗi lần redeploy, container mới được tạo và data trong container cũ bị mất.

**Giải pháp:** 

1. **Quick Setup:**
   ```bash
   ./scripts/dokploy-setup.sh
   ```

2. **Sử dụng file cấu hình cho Dokploy:**
   - File: [dokploy-compose.yaml](dokploy-compose.yaml)
   - Sử dụng **named volumes** thay vì bind mounts
   - Tạo volume `multizlogin-data` mount vào `/app/data`

📖 **Chi tiết:** Xem [DOKPLOY_DEPLOY_GUIDE.md](DOKPLOY_DEPLOY_GUIDE.md) để biết hướng dẫn đầy đủ.

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

4. Cập nhật và triển khai image mới:
   ```
   ./scripts/update-zalo-server.sh
   ```

### Xuất bản Docker Image

Nếu bạn muốn build và xuất bản Docker image của riêng mình:

1. Trước khi build, làm sạch thông tin nhạy cảm:
   ```
   ./scripts/clean-for-publish.sh
   ```
   Script này sẽ tạo bản sao lưu thông tin nhạy cảm và làm sạch dự án để xuất bản an toàn.

2. Build và xuất bản image:
   ```
   docker-compose -f docker-compose.new.yaml build
   docker tag multizlogin_zalo-server:latest yourusername/zalo-server:latest
   docker push yourusername/zalo-server:latest
   ```

3. Sau khi xuất bản xong, khôi phục lại thông tin nhạy cảm:
   ```
   ./scripts/restore-after-publish.sh
   ```

> **Lưu ý**: Scripts mới đã được di chuyển vào thư mục `scripts/`. Nếu bạn sử dụng các script từ thư mục gốc, hãy cập nhật để sử dụng phiên bản mới từ thư mục `scripts/`.

### Xử lý lỗi Docker Build

Nếu bạn gặp lỗi liên quan đến thiếu module như "Cannot find module 'ejs'" khi chạy Docker, hãy sử dụng script sau để sửa:

```bash
./scripts/fix-docker-build.sh
```

Script này sẽ:
- Cập nhật Dockerfile để cài đặt đúng các dependencies
- Cập nhật .dockerignore để loại trừ các file không cần thiết
- Cung cấp tùy chọn để build lại Docker image ngay lập tức

Sau khi chạy script này, bạn có thể khởi động lại container:

```bash
docker-compose -f docker-compose.new.yaml up -d
```

## Sử dụng

1. Mở trình duyệt và truy cập: `http://localhost:3000`
2. Đăng nhập tài khoản Zalo thông qua nút "Đăng nhập Zalo"
3. Quản lý tài khoản và thiết lập webhook trong trang "Quản lý tài khoản"
4. Quản lý proxy trong trang "Quản lý Proxy"

## API

### Xác thực API

Tất cả các API đều yêu cầu API key để xác thực. API key được cấu hình trong file `.env`.

```
X-API-Key: your_api_key
```

### Các API chính

- `GET /api/accounts`: Lấy danh sách tài khoản
- `GET /api/webhook-configs`: Lấy tất cả cấu hình webhook
- `GET /api/webhook-config/:ownId`: Lấy cấu hình webhook cho một tài khoản
- `POST /api/webhook-config/:ownId`: Cập nhật cấu hình webhook cho một tài khoản
- `DELETE /api/webhook-config/:ownId`: Xóa cấu hình webhook cho một tài khoản
- `GET /api/status`: Kiểm tra trạng thái kết nối của hệ thống

## Tích hợp với n8n

MultiZlogin được thiết kế để tích hợp dễ dàng với n8n để tự động hóa quy trình làm việc.

1. Tạo Webhook Node trong n8n
2. Cấu hình webhook URL trong MultiZlogin để trỏ đến URL của Webhook Node
3. Các sự kiện từ Zalo sẽ được gửi đến n8n để xử lý

## Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng mở issue hoặc pull request để cải thiện dự án.

## Giấy phép

[MIT](LICENSE)

## Tuyên bố trách nhiệm

Dự án này được phát triển với mục đích nghiên cứu và học tập. Người dùng chịu hoàn toàn trách nhiệm khi sử dụng dự án này phải tuân thủ các điều khoản dịch vụ của Zalo và các quy định pháp luật hiện hành. Chúng tôi không chịu trách nhiệm cho bất kỳ hành vi vi phạm nào.

## Lời cảm ơn

Chân thành cảm ơn đội ngũ ZCA đã phát triển thư viện zca-js, giúp chúng tôi có thể xây dựng dự án này.