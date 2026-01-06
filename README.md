# MultiZlogin - Zalo Multi-Account Management API

API để quản lý nhiều tài khoản Zalo, gửi tin nhắn, quản lý nhóm và tự động hóa với N8N.

## 🚀 Features

- ✅ Đăng nhập nhiều tài khoản Zalo qua QR Code
- ✅ Lưu credentials an toàn trong PostgreSQL
- ✅ API đầy đủ với Swagger documentation
- ✅ Hỗ trợ proxy cho mỗi tài khoản
- ✅ Webhook real-time cho tin nhắn và events
- ✅ N8N-friendly API với accountSelection
- ✅ Docker deployment ready

## 📋 Requirements

- Node.js 20+
- PostgreSQL 16+ (tùy chọn, có thể dùng file-based fallback)
- Docker & Docker Compose (cho production)

## 🔧 Installation

### Local Development

1. Clone repository:
```bash
git clone https://github.com/ChickenAI/multizlogin.git
cd multizlogin
```

2. Install dependencies:
```bash
npm install
```

3. Copy và cấu hình `.env`:
```bash
cp .env.example .env
nano .env
```

**Quan trọng**: Thay đổi `API_KEY` trong `.env`:
```env
API_KEY=your-super-secret-key-here-123456
```

4. Khởi động PostgreSQL (nếu có Docker):
```bash
docker-compose up -d postgres
```

5. Chạy server:
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

### Docker Deployment

1. Cấu hình `.env` file với API_KEY
2. Khởi động tất cả services:
```bash
docker-compose up -d
```

3. Kiểm tra logs:
```bash
docker-compose logs -f zalo-server
```

## 🔐 Authentication

Tất cả API yêu cầu API Key trong header:

```bash
X-API-Key: your-api-key-from-env
```

### Đăng nhập Swagger UI

1. Truy cập: `http://localhost:3000/login`
2. Nhập API Key từ `.env` file
3. Tự động redirect đến Swagger documentation

## 📚 API Documentation

Sau khi đăng nhập, truy cập Swagger UI tại: `http://localhost:3000/api-docs`

### Quick Start API Flow

#### 1. Đăng nhập tài khoản Zalo

```bash
curl -X POST http://localhost:3000/api/zalo/login \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "proxy": "http://user:pass@proxy.com:8080"
  }'
```

Response sẽ chứa QR code base64. Quét bằng app Zalo để đăng nhập.

#### 2. Lấy danh sách tài khoản

```bash
curl http://localhost:3000/api/zalo/accounts \
  -H "X-API-Key: your-api-key"
```

Response:
```json
{
  "success": true,
  "accounts": [
    {
      "ownId": "1234567890",
      "phoneNumber": "0901234567",
      "proxy": "http://proxy.com:8080",
      "isOnline": true
    }
  ]
}
```

#### 3. Gửi tin nhắn (N8N-friendly)

```bash
curl -X POST http://localhost:3000/api/accounts/sendMessage \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "accountSelection": "first",
    "threadId": "0987654321",
    "message": "Hello from API!",
    "type": "user"
  }'
```

### Account Selection Options

Các API N8N-friendly hỗ trợ `accountSelection`:

- `first` - Tài khoản đầu tiên
- `last` - Tài khoản cuối cùng
- `random` - Tài khoản ngẫu nhiên
- `specific` - Tài khoản cụ thể (cần `accountId`)

Example:
```json
{
  "accountSelection": "specific",
  "accountId": "1234567890",
  "threadId": "0987654321",
  "message": "Hello!"
}
```

## 🗄️ Database Schema

### Table: zalo_credentials

Lưu thông tin đăng nhập Zalo:

```sql
CREATE TABLE zalo_credentials (
    id SERIAL PRIMARY KEY,
    own_id VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    display_name VARCHAR(255),
    credentials JSONB NOT NULL,
    proxy VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);
```

### Table: proxies

Quản lý proxy servers:

```sql
CREATE TABLE proxies (
    id SERIAL PRIMARY KEY,
    url VARCHAR(500) UNIQUE NOT NULL,
    max_accounts INTEGER DEFAULT 3,
    current_accounts INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 Webhooks

Configure webhooks in `.env` để nhận events real-time:

```env
MESSAGE_WEBHOOK_URL=https://n8n.example.com/webhook/message
GROUP_EVENT_WEBHOOK_URL=https://n8n.example.com/webhook/group-events
REACTION_WEBHOOK_URL=https://n8n.example.com/webhook/reactions
WEBHOOK_LOGIN_SUCCESS=https://n8n.example.com/webhook/login-success
```

### Webhook Payload Examples

**Message Webhook:**
```json
{
  "event": "message",
  "ownId": "1234567890",
  "data": {
    "threadId": "0987654321",
    "message": "Hello",
    "senderId": "0987654321",
    "timestamp": 1704567890000
  }
}
```

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `API_KEY` | **Yes** | - | API authentication key |
| `SESSION_SECRET` | No | Auto | Session encryption key |
| `DB_HOST` | No | `postgres` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_NAME` | No | `multizlogin` | Database name |
| `DB_USER` | No | `zalouser` | Database user |
| `DB_PASSWORD` | No | `zalopass123` | Database password |
| `MESSAGE_WEBHOOK_URL` | No | - | Webhook for messages |
| `ADMIN_DEFAULT_PASSWORD` | No | `admin` | Default admin password |

## 🐳 Docker Volumes

Data persistence được đảm bảo qua Docker volumes:

- `postgres_data` - PostgreSQL database
- `zalo_data` - Backup credentials (file-based)

## 🔍 Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-06T07:12:34.567Z",
  "uptime": 123.456,
  "accounts": {
    "total": 5,
    "online": 5
  }
}
```

## 📝 API Endpoints Summary

### Zalo Login
- `POST /api/zalo/login` - Đăng nhập qua QR
- `GET /api/zalo/accounts` - Danh sách tài khoản
- `DELETE /api/zalo/accounts/:ownId` - Đăng xuất

### Zalo Actions (ownId-based)
- `POST /api/findUser` - Tìm user
- `POST /api/getUserInfo` - Thông tin user
- `POST /api/sendmessage` - Gửi tin nhắn
- `POST /api/createGroup` - Tạo nhóm
- `POST /api/getGroupInfo` - Thông tin nhóm
- `POST /api/addUserToGroup` - Thêm vào nhóm
- `POST /api/removeUserFromGroup` - Xóa khỏi nhóm
- `POST /api/sendImageToUser` - Gửi ảnh cho user
- `POST /api/sendImageToGroup` - Gửi ảnh cho nhóm

### Account API (N8N-friendly)
- `GET /api/accounts` - Danh sách accounts
- `POST /api/accounts/findUser` - Tìm user với selection
- `POST /api/accounts/sendMessage` - Gửi tin nhắn với selection
- `POST /api/accounts/sendImage` - Gửi ảnh với selection
- `POST /api/accounts/createGroup` - Tạo nhóm với selection
- `POST /api/accounts/action` - Thực hiện action tổng quát

## 🛠️ Development

### Project Structure

```
src/
├── app.js              # Express app setup
├── server.js           # Server entry point
├── config/
│   ├── env.js         # Environment variables
│   ├── constants.js   # App constants
│   └── swagger.js     # Swagger configuration
├── controllers/       # Request handlers
├── services/
│   ├── zaloService.js # Zalo SDK integration
│   ├── dbService.js   # PostgreSQL operations
│   ├── authService.js # User authentication
│   └── eventService.js # Webhook events
├── routes/            # API routes
└── middlewares/       # Express middlewares
```

### Adding New Features

1. Create controller in `src/controllers/`
2. Add route in `src/routes/`
3. Add Swagger documentation
4. Test with Swagger UI

## 🔐 Security

- ✅ API Key authentication
- ✅ Session-based Swagger access
- ✅ HTTPS proxy support
- ✅ Credentials encrypted in database
- ✅ No hardcoded secrets

**Important**: 
- Đổi `API_KEY` trong production
- Sử dụng strong `SESSION_SECRET`
- Đổi default `DB_PASSWORD`

## 📄 License

MIT License - See LICENSE file

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📧 Support

- GitHub Issues: [Report bugs](https://github.com/ChickenAI/multizlogin/issues)
- Documentation: Swagger UI at `/api-docs`

---

**Made with ❤️ for automation enthusiasts**
