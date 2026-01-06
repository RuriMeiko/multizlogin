# MultiZlogin - Hướng Dẫn Sử Dụng

## 📁 Cấu Trúc Thư Mục Mới

```
src/
├── app.js                  # Main Express application
├── server.js               # HTTP & WebSocket server
├── config/
│   ├── env.js              # Environment configuration
│   ├── constants.js        # Application constants
│   └── swagger.js          # Swagger configuration
├── controllers/
│   ├── index.js            # Export all controllers
│   ├── accountController.js # Account management
│   ├── messageController.js # Message handling
│   ├── groupController.js   # Group operations
│   └── actionController.js  # Generic action handler
├── middlewares/
│   ├── index.js            # Export all middlewares
│   └── authMiddleware.js   # Authentication middlewares
├── routes/
│   ├── index.js            # Route aggregator
│   ├── auth.routes.js      # Auth API routes
│   ├── account.routes.js   # Account API routes
│   ├── zalo.routes.js      # Zalo API routes (legacy + N8N)
│   └── ui.js               # UI routes
├── services/
│   ├── authService.js      # User authentication
│   ├── zaloService.js      # Zalo SDK operations
│   ├── eventService.js     # Event listeners
│   ├── proxyService.js     # Proxy management
│   └── webhookService.js   # Webhook utilities
├── utils/
│   └── helpers.js          # Helper functions
└── views/                  # EJS templates
```

## 🔧 Cấu Hình Environment

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Các biến môi trường quan trọng:

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `PORT` | Port server | 3000 |
| `SESSION_SECRET` | Secret cho session | **Bắt buộc thay đổi** |
| `ADMIN_DEFAULT_PASSWORD` | Password admin ban đầu | admin |
| `MESSAGE_WEBHOOK_URL` | Webhook nhận tin nhắn | - |
| `GROUP_EVENT_WEBHOOK_URL` | Webhook sự kiện nhóm | - |
| `REACTION_WEBHOOK_URL` | Webhook reaction | - |
| `WEBHOOK_LOGIN_SUCCESS` | Webhook đăng nhập thành công | - |
| `DATA_PATH` | Đường dẫn lưu data | ./data |
| `MAX_ACCOUNTS_PER_PROXY` | Số tài khoản tối đa mỗi proxy | 3 |

## 🐳 Deploy với Docker

### Local Development

```bash
# Build và run
docker-compose up -d --build

# Xem logs
docker-compose logs -f
```

### Dokploy Deployment

1. Tạo service mới trong Dokploy
2. Chọn source từ Git repository
3. Sử dụng `dokploy-compose.yaml`
4. Cấu hình Environment Variables:
   - `SESSION_SECRET`: Một chuỗi ngẫu nhiên dài
   - Các webhook URLs nếu cần
5. Deploy!

**⚠️ QUAN TRỌNG về Data Persistence:**

File `dokploy-compose.yaml` sử dụng **named volume** `multizlogin-data` để đảm bảo:
- Dữ liệu tài khoản Zalo (cookies) được giữ lại
- Users và API keys không bị mất
- Proxies configuration được bảo toàn

Khi redeploy, dữ liệu trong volume sẽ KHÔNG bị xóa.

## 🔐 API Authentication

### Sử dụng API Key

```bash
curl -X POST http://localhost:3000/api/sendmessage \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{"message": "Hello", "threadId": "123", "ownId": "456"}'
```

### Tạo API Key

1. Đăng nhập vào UI với tài khoản admin
2. Vào Settings > API Key
3. Click "Generate New Key"

## 📡 API Endpoints

### Authentication
- `POST /api/login` - Đăng nhập
- `POST /api/logout` - Đăng xuất
- `GET /api/check-auth` - Kiểm tra trạng thái đăng nhập
- `POST /api/change-password` - Đổi mật khẩu
- `GET /api/user/api-key` - Lấy API key
- `POST /api/user/generate-key` - Tạo API key mới

### Account Management
- `GET /api/accounts` - Danh sách tài khoản Zalo
- `GET /api/accounts/:ownId` - Chi tiết tài khoản
- `DELETE /api/accounts/:ownId` - Xóa tài khoản

### N8N-Friendly APIs (dùng accountSelection)
- `POST /api/accounts/sendMessage`
- `POST /api/accounts/sendImage`
- `POST /api/accounts/findUser`
- `POST /api/accounts/getUserInfo`
- `POST /api/accounts/sendFriendRequest`
- `POST /api/accounts/createGroup`
- `POST /api/accounts/getGroupInfo`
- `POST /api/accounts/addUserToGroup`
- `POST /api/accounts/removeUserFromGroup`
- `POST /api/accounts/action` - Generic action handler

### Legacy APIs (dùng ownId)
- `POST /api/sendmessage`
- `POST /api/findUser`
- `POST /api/getUserInfo`
- `POST /api/sendFriendRequest`
- `POST /api/createGroup`
- `POST /api/getGroupInfo`
- `POST /api/sendImageToUser`
- `POST /api/sendImageToGroup`

## 🔄 Migration từ phiên bản cũ

Nếu bạn đang sử dụng phiên bản cũ, dữ liệu sẽ tự động được giữ lại trong thư mục `data/`:
- `data/cookies/` - Cookies đăng nhập Zalo
- `data/cookies/users.json` - Thông tin users và API keys
- `data/proxies.json` - Danh sách proxy

## 🛠️ Troubleshooting

### Mất dữ liệu khi deploy

1. Kiểm tra xem có đang dùng named volume không:
   ```yaml
   volumes:
     - multizlogin-data:/app/data  # Đúng
     # KHÔNG dùng: - ./data:/app/data
   ```

2. Kiểm tra volume:
   ```bash
   docker volume ls | grep multizlogin
   ```

### Không đăng nhập được

1. Kiểm tra file `data/cookies/users.json` có tồn tại không
2. Xem logs: `docker-compose logs -f`
3. Reset password admin:
   - Xóa file `data/cookies/users.json`
   - Restart container

### API Key không hoạt động

1. Đảm bảo header đúng: `X-API-Key: your-key`
2. Kiểm tra xem key đã được generate chưa
3. Xem file `data/cookies/users.json` có chứa `apiKey` không
