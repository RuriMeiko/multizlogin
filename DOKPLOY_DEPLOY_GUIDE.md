# Hướng dẫn Deploy lên Dokploy

## Vấn đề: Mất dữ liệu khi redeploy

Khi deploy trên Dokploy, mỗi lần redeploy tạo container mới và xóa container cũ. Nếu không config volumes đúng, dữ liệu sẽ bị mất:
- ❌ User accounts và API keys (`data/cookies/users.json`)
- ❌ Zalo session cookies (`data/cookies/cred_*.json`)  
- ❌ Proxy configuration (`data/proxies.json`)

### ⚠️ Vấn đề đặc biệt: Mất API Keys

**Nguyên nhân:**
1. File `users.json` bị recreate khi có lỗi JSON → Thiếu field `apiKey`
2. Init code chạy trước khi volume mount xong → Overwrite file cũ

**Đã được fix:**
- ✅ Lazy initialization - chỉ init khi cần
- ✅ Backup tự động trước khi recreate
- ✅ Đảm bảo field `apiKey` luôn tồn tại
- ✅ Script verify và migrate data

## Giải pháp: Persistent Volumes + Data Migration

### 1. Tạo Persistent Volume trên Dokploy

Trong Dokploy dashboard:

1. Vào project của bạn → **Volumes**
2. Click **Add Volume**
3. Tạo volume mới:
   ```
   Name: multizlogin-data
   Mount Path: /app/data
   ```

### 2. Cấu hình Docker Compose cho Dokploy

Sử dụng file `dokploy-compose.yaml` (đã được tạo sẵn):

```yaml
version: "3.8"
services:
  zalo-server:
    image: ${DOCKER_IMAGE:-your-registry/multizlogin:latest}
    ports:
      - "${PORT:-3000}:3000"
    volumes:
      # Sử dụng named volume thay vì bind mount
      - multizlogin-data:/app/data
    environment:
      - PORT=${PORT:-3000}
      - MESSAGE_WEBHOOK_URL=${MESSAGE_WEBHOOK_URL}
      - GROUP_EVENT_WEBHOOK_URL=${GROUP_EVENT_WEBHOOK_URL}
      - REACTION_WEBHOOK_URL=${REACTION_WEBHOOK_URL}
      - SESSION_SECRET=${SESSION_SECRET}
      - WEBHOOK_LOGIN_SUCCESS=${WEBHOOK_LOGIN_SUCCESS}
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

# Định nghĩa named volume
volumes:
  multizlogin-data:
    driver: local
```

### 3. **[QUAN TRỌNG] Verify và Migrate Data**

Trước khi deploy, chạy script để verify data:

```bash
# Check users.json structure
./scripts/verify-users.sh

# Hoặc dùng Node.js script
node scripts/migrate-users.js
```

Script sẽ:
- ✅ Check JSON validity
- ✅ Verify tất cả required fields
- ✅ Auto-fix thiếu `apiKey` field
- ✅ Backup trước khi sửa

### 4. Build và Push Docker Image

```bash
# Login vào registry của bạn
docker login your-registry.com

# Build image
docker build -t your-registry/multizlogin:latest .

# Push lên registry
docker push your-registry/multizlogin:latest
```

### 5. Cấu hình Environment Variables trên Dokploy

Trong Dokploy dashboard → **Environment Variables**, thêm:

```env
# Required
MESSAGE_WEBHOOK_URL=https://your-n8n.com/webhook/message
SESSION_SECRET=your-super-secret-key-change-this

# Optional
PORT=3000
GROUP_EVENT_WEBHOOK_URL=https://your-n8n.com/webhook/group-events
REACTION_WEBHOOK_URL=https://your-n8n.com/webhook/reactions
WEBHOOK_LOGIN_SUCCESS=https://your-n8n.com/webhook/login-success
```

### 6. Deploy

Click **Deploy** trên Dokploy dashboard.

## Cách kiểm tra dữ liệu đã được persist

### Trước khi redeploy:
```bash
# SSH vào server hoặc exec vào container
docker exec -it <container-name> sh

# Kiểm tra dữ liệu
ls -la /app/data/cookies/
cat /app/data/cookies/users.json
```

### Sau khi redeploy:
```bash
# Exec vào container mới
docker exec -it <new-container-name> sh

# Kiểm tra dữ liệu vẫn còn
ls -la /app/data/cookies/
cat /app/data/cookies/users.json
```

Nếu file `users.json` và các file cookies vẫn còn → ✅ Volume hoạt động đúng!

## Troubleshooting

### 1. 🔴 API Keys bị mất sau redeploy

**Nguyên nhân:**
- File `users.json` thiếu field `apiKey`
- File bị recreate do JSON error

**Kiểm tra:**
```bash
# Vào container
docker exec -it <container> sh

# Check users.json structure
cat /app/data/cookies/users.json | grep apiKey

# Nếu không có output → Thiếu field apiKey
```

**Giải pháp:**

**Option 1: Restore từ backup**
```bash
# List backups
docker exec -it <container> ls -la /app/data/cookies/*.backup*

# Restore backup gần nhất
docker exec -it <container> cp /app/data/cookies/users.json.backup-XXXXX /app/data/cookies/users.json
```

**Option 2: Fix thủ công**
```bash
# Download file
docker cp <container>:/app/data/cookies/users.json ./users.json

# Edit thêm field apiKey vào mỗi user
# Ví dụ:
# {
#   "username": "admin",
#   "salt": "...",
#   "hash": "...",
#   "role": "admin",
#   "apiKey": "your-api-key-here"  <- Thêm dòng này
# }

# Upload lại
docker cp ./users.json <container>:/app/data/cookies/users.json

# Restart container
docker restart <container>
```

**Option 3: Run migration script**
```bash
# Copy script vào container
docker cp scripts/migrate-users.js <container>:/app/

# Run migration
docker exec -it <container> node /app/migrate-users.js

# Check result
docker exec -it <container> cat /app/data/cookies/users.json
```

**Prevention:**
- ✅ Luôn backup trước khi deploy
- ✅ Verify file với `./scripts/verify-users.sh`
- ✅ Đảm bảo volume được mount đúng

### 2. Vẫn mất dữ liệu sau khi redeploy

**Nguyên nhân:** Volume chưa được mount đúng.

**Giải pháp:**
1. Kiểm tra Dokploy volumes dashboard
2. Verify mount path: `/app/data`
3. Restart application sau khi config volume

### 2. Lỗi "Permission denied" khi ghi file

**Nguyên nhân:** Volume ownership không đúng.

**Giải pháp:**
```bash
# Trong container
chown -R node:node /app/data
chmod -R 755 /app/data
```

### 3. Users.json bị reset về mặc định

**Nguyên nhân:** File bị overwrite bởi init code.

**Giải pháp:** File đã được check exist trước khi create, nên không bị reset. Nếu vẫn xảy ra:
```bash
# Backup users.json trước khi redeploy
docker cp <container>:/app/data/cookies/users.json ./backup-users.json

# Restore sau khi deploy
docker cp ./backup-users.json <new-container>:/app/data/cookies/users.json
```

## Alternative: Sử dụng Database

Nếu Dokploy không hỗ trợ volumes tốt, có thể migrate sang database:

### Option 1: SQLite (recommended for small scale)
```bash
# Cài đặt
npm install better-sqlite3

# Store users và sessions trong SQLite
# File DB sẽ nằm trong volume: /app/data/multizlogin.db
```

### Option 2: PostgreSQL/MySQL (recommended for production)
```bash
# Connect tới external database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

## Best Practices cho Dokploy

1. **Always use named volumes** cho persistent data
2. **Backup volumes** định kỳ
3. **Use environment variables** thay vì .env files
4. **Monitor health endpoint:** `/health`
5. **Check logs** sau mỗi lần deploy:
   ```bash
   dokploy logs <app-name> --tail 100
   ```

## Quick Deploy Checklist

- [ ] Created named volume: `multizlogin-data`
- [ ] Volume mounted to: `/app/data`
- [ ] Environment variables configured
- [ ] Docker image built and pushed
- [ ] Deploy successful
- [ ] Health check passing: `curl https://your-app.com/health`
- [ ] Test login with admin/admin
- [ ] Verify Zalo accounts persist after redeploy
- [ ] Check cookies files exist: `/app/data/cookies/`

## Monitoring

```bash
# Check health
curl https://your-app.dokploy.com/health

# Should return:
{
  "status": "ok",
  "timestamp": "2026-01-06T10:30:00.000Z",
  "uptime": 3600,
  "accounts": {
    "total": 3,
    "online": 3
  }
}
```

## Support

Nếu vẫn gặp vấn đề:
1. Check Dokploy logs
2. Verify volume configuration
3. Test với docker-compose locally trước
4. Contact Dokploy support nếu là platform issue
