# 🚀 Hướng dẫn Deploy lên Dokploy

## 📋 Tổng quan

Dokploy build từ **Dockerfile** (không dùng docker-compose), nên cần setup Redis như một service riêng.

## 🏗️ Bước 1: Tạo Redis Service

1. **Trong Dokploy Dashboard:**
   - Vào Project của bạn
   - Click **"Add Service"** hoặc **"New Service"**
   - Chọn **"Redis"** từ template có sẵn
   - Hoặc tạo từ Docker image: `redis:7-alpine`

2. **Cấu hình Redis:**
   ```yaml
   Name: multizlogin-redis
   Image: redis:7-alpine
   Command: redis-server --appendonly yes
   Port: 6379 (internal)
   Memory: 256MB
   CPU: 0.25
   ```

3. **Lưu lại service name**, ví dụ: `multizlogin-redis`

## 🚀 Bước 2: Deploy Zalo App

1. **Trong Dokploy Dashboard:**
   - Click **"Add Application"**
   - Connect Git repository: `https://github.com/ChickenAI/multizlogin`
   - Branch: `main`

2. **Build Settings:**
   - **Build Type**: Chọn **Dockerfile**
   - Dockerfile Path: `./Dockerfile` (mặc định)
   - Build Context: `.` (root)

3. **Environment Variables** (Quan trọng!):

   ```env
   # Server
   PORT=3000
   NODE_ENV=production
   DATA_PATH=/app/data
   
   # Redis - QUAN TRỌNG!
   # Format: redis://<redis-service-name>:6379
   REDIS_URL=redis://multizlogin-redis:6379
   
   # Session Secret (Tạo random string)
   SESSION_SECRET=your-super-secret-key-here-change-this
   
   # Admin Password
   ADMIN_DEFAULT_PASSWORD=admin
   
   # API Key (Tạo random string hoặc để Dokploy generate)
   API_KEY=your-api-key-here
   
   # Webhooks (optional)
   MESSAGE_WEBHOOK_URL=https://your-n8n-instance.com/webhook/message
   GROUP_EVENT_WEBHOOK_URL=https://your-n8n-instance.com/webhook/group
   REACTION_WEBHOOK_URL=https://your-n8n-instance.com/webhook/reaction
   WEBHOOK_LOGIN_SUCCESS=https://your-n8n-instance.com/webhook/login-success
   
   # Proxy
   MAX_ACCOUNTS_PER_PROXY=3
   ```

4. **Port Mapping:**
   - Container Port: `3000`
   - Public Port: `3000` (hoặc để Dokploy auto-assign)

5. **Volume/Storage** (QUAN TRỌNG - để data không mất khi redeploy):
   - Mount Path: `/app/data`
   - Type: **Persistent Volume**
   - Name: `multizlogin-data`

6. **Health Check:**
   ```
   Path: /health
   Port: 3000
   Interval: 30s
   Timeout: 10s
   ```

## 🔗 Bước 3: Kết nối Redis với App

Trong Dokploy, services trong cùng 1 project có thể giao tiếp với nhau qua **service name**.

**REDIS_URL format:**
```
redis://<redis-service-name>:6379
```

Ví dụ:
- Nếu Redis service tên là `multizlogin-redis` → `redis://multizlogin-redis:6379`
- Nếu Redis service tên là `redis` → `redis://redis:6379`

## ✅ Bước 4: Deploy

1. Click **"Deploy"** hoặc **"Build & Deploy"**
2. Đợi build xong (có thể mất 2-5 phút)
3. Check logs để confirm Redis connected:
   ```
   [Redis] Attempting to connect to: redis://multizlogin-redis:6379
   [Redis] Connected successfully
   [Redis] Ready to use
   ```

## 🎯 Alternative: Dùng External Redis

Nếu không muốn tạo Redis service trong Dokploy, có thể dùng Redis external:

### Option 1: Redis Cloud (Free tier)
1. Đăng ký tại: https://redis.com/try-free/
2. Tạo database
3. Copy connection string
4. Set vào env: `REDIS_URL=redis://:password@your-redis-host:12345`

### Option 2: Railway/Render Redis
1. Tạo Redis addon trên Railway hoặc Render
2. Copy Redis URL
3. Set vào env: `REDIS_URL=redis://...`

### Option 3: Upstash (Serverless Redis)
1. Đăng ký: https://upstash.com/
2. Tạo Redis database
3. Copy REST URL hoặc Redis URL
4. Set vào env

## 🔍 Troubleshooting

### Redis không connect được
**Error:**
```
[Redis] Connection error: connect ECONNREFUSED
```

**Giải pháp:**
1. Check Redis service đang chạy trong Dokploy
2. Check `REDIS_URL` có đúng service name không
3. Check Redis và App cùng network/project
4. App vẫn chạy bình thường, chỉ không có bot caching

### Data bị mất sau khi redeploy
**Giải pháp:**
- Đảm bảo đã mount volume `/app/data` với persistent storage
- Check trong Dokploy Volumes section

### Build failed
**Giải pháp:**
- Check Dockerfile syntax
- Ensure có đủ RAM (minimum 2GB cho build)
- Check build logs trong Dokploy

## 📊 Kiến trúc sau khi deploy:

```
┌─────────────────────────────────────────┐
│          Dokploy Project                │
│                                         │
│  ┌─────────────────┐  ┌──────────────┐ │
│  │  Zalo App       │  │    Redis     │ │
│  │  Port: 3000     │──│ Port: 6379   │ │
│  │  /app/data      │  │ (internal)   │ │
│  │  (persistent)   │  └──────────────┘ │
│  └─────────────────┘                   │
│          │                              │
└──────────┼──────────────────────────────┘
           │
           │ (Public URL)
           ▼
    https://your-app.dokploy.com
```

## ✨ Tính năng sẽ hoạt động:

- ✅ Multi-account Zalo login
- ✅ QR Code login via webhook
- ✅ Send/receive messages
- ✅ **Bot message caching** (với Redis)
- ✅ Webhooks to n8n
- ✅ Data persistence qua các lần deploy

## 🎉 Done!

Access app tại: `https://your-app-url.dokploy.com`

Swagger docs: `https://your-app-url.dokploy.com/api-docs`
