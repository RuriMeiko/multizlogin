# Hướng dẫn Docker Volumes và Troubleshooting

## Cấu hình Docker Volumes

### Dữ liệu được lưu trữ

Hệ thống này lưu trữ các dữ liệu quan trọng sau trong Docker volumes để đảm bảo không mất dữ liệu khi reset container:

1. **Cookies tài khoản Zalo** (`./data/cookies/`)
   - Các file `cred_<ownId>.json` chứa session cookies
   - Được sử dụng để tự động đăng nhập lại

2. **Cấu hình proxy** (`./data/proxies.json`)
   - Danh sách các proxy được sử dụng
   - Số lượng tài khoản sử dụng mỗi proxy

### Docker Compose Configuration

```yaml
volumes:
  - ./data:/app/data              # Cookies và proxies
```

**Lưu ý:** Webhook URLs được cấu hình qua environment variables trong file `.env`, không cần file config riêng.

## Giải quyết vấn đề không nhận webhook

### Nguyên nhân phổ biến

1. **Connection timeout sau thời gian dài**
   - WebSocket connection tới Zalo có thể bị đóng sau thời gian không hoạt động
   - Network issues hoặc proxy không ổn định

2. **Listener stopped**
   - API listener có thể bị dừng do lỗi không xử lý được
   - Memory issues trong container

### Giải pháp đã triển khai

#### 1. Auto-reconnection
- Tự động reconnect khi connection bị đóng
- Sử dụng exponential backoff để tránh spam reconnect
- Maximum 5 lần retry, sau đó reset counter sau 30 phút

#### 2. Health Check Mechanism
- Kiểm tra trạng thái connection mỗi 2 phút
- Tự động phát hiện và reconnect khi listener không hoạt động
- Docker health check endpoint: `http://localhost:3000/health`

#### 3. Retry Logic với Cooldown
```javascript
RELOGIN_COOLDOWN = 3 * 60 * 1000     // 3 phút giữa các lần retry
MAX_RETRY_ATTEMPTS = 5                // Tối đa 5 lần retry
HEALTH_CHECK_INTERVAL = 2 * 60 * 1000 // Kiểm tra mỗi 2 phút
```

## Monitoring và Debugging

### Kiểm tra health status

```bash
curl http://localhost:3000/health
```

Response mẫu:
```json
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

### Xem logs

```bash
# Xem logs real-time
docker-compose logs -f zalo-server

# Xem logs của một account cụ thể
docker-compose logs -f | grep "account_id_here"

# Xem logs reconnection
docker-compose logs -f | grep "Relogin"

# Xem logs health check
docker-compose logs -f | grep "Health Check"
```

### Các log patterns quan trọng

- `[Relogin] Đang đăng nhập lại...` - Bắt đầu reconnection
- `[Reconnect] Đã kết nối lại thành công` - Reconnection thành công
- `[Health Check] Connection OK` - Health check pass
- `[Health Check] Connection không hoạt động` - Phát hiện vấn đề
- `[Connection] Closed - API listener đã ngắt kết nối` - Connection bị đóng

## Reset Container mà không mất dữ liệu

### Restart an toàn

```bash
# Restart container (giữ volumes)
docker-compose restart

# Hoặc stop và start lại
docker-compose stop
docker-compose start
```

### Rebuild container (giữ volumes)

```bash
# Build lại image và restart
docker-compose down
docker-compose build
docker-compose up -d
```

**Lưu ý:** Lệnh `docker-compose down` không xóa volumes theo mặc định. Data vẫn được giữ trong thư mục `./data` và `./zalo_data`.

### Xóa hoàn toàn (bao gồm volumes)

```bash
# CHỈ dùng khi muốn reset hoàn toàn
docker-compose down -v
rm -rf ./data/cookies/*
```

## Troubleshooting

### Vấn đề 1: Không nhận webhook sau vài giờ

**Triệu chứng:**
- Webhook hoạt động ban đầu
- Sau vài giờ không còn nhận được tin nhắn mới

**Giải pháp:**
1. Kiểm tra health check:
   ```bash
   curl http://localhost:3000/health
   ```

2. Xem logs reconnection:
   ```bash
   docker-compose logs -f | grep "Relogin\|Health Check"
   ```

3. Nếu retry count đạt max, chờ 30 phút để auto-reset hoặc restart container:
   ```bash
   docker-compose restart
   ```

### Vấn đề 2: Container restart mà mất session

**Nguyên nhân:**
- Volumes không được mount đúng
- File cookies không được lưu

**Giải pháp:**
1. Kiểm tra volumes trong docker-compose.yaml:
   ```yaml
   volumes:
     - ./data:/app/data
     - ./zalo_data:/app/zalo_data
   ```

2. Verify cookies tồn tại:
   ```bash
   ls -la ./data/cookies/
   ```

3. Kiểm tra permissions:
   ```bash
   chmod -R 755 ./data
   ```

### Vấn đề 3: Quá nhiều reconnection attempts

**Triệu chứng:**
- Logs hiện nhiều "[Relogin]" messages
- System không ổn định

**Giải pháp:**
1. Kiểm tra proxy stability:
   - Test proxy connection
   - Thử đổi proxy khác

2. Kiểm tra network:
   - Container có internet access không
   - Firewall rules

3. Tăng RELOGIN_COOLDOWN nếu cần trong `src/eventListeners.js`

## Best Practices

1. **Monitoring:**
   - Setup alerting cho health check endpoint
   - Log aggregation để track reconnection patterns

2. **Backup:**
   - Định kỳ backup `./data` directory
   - Version control cho `proxies.json` và `.env` file

3. **Maintenance:**
   - Restart container định kỳ (1 tuần 1 lần) để clear memory
   - Update dependencies thường xuyên
   - Monitor disk space cho logs

4. **Security:**
   - Không commit `.env` file
   - Giữ cookies files an toàn
   - Rotate SESSION_SECRET định kỳ

## Environment Variables

Đảm bảo các biến môi trường sau được set trong `.env`:

```env
PORT=3000
SESSION_SECRET=your-secret-key-change-this

# Webhooks
MESSAGE_WEBHOOK_URL=https://your-n8n.com/webhook/message
GROUP_EVENT_WEBHOOK_URL=https://your-n8n.com/webhook/group-events
REACTION_WEBHOOK_URL=https://your-n8n.com/webhook/reactions
WEBHOOK_LOGIN_SUCCESS=https://your-n8n.com/webhook/login-success
```

## Support

Nếu vấn đề vẫn tiếp diễn sau khi thử các bước trên:

1. Thu thập logs chi tiết:
   ```bash
   docker-compose logs --tail=1000 > logs.txt
   ```

2. Kiểm tra health status:
   ```bash
   curl http://localhost:3000/health > health.json
   ```

3. List cookies files:
   ```bash
   ls -la ./data/cookies/ > cookies_list.txt
   ```

4. Report issue với các thông tin trên
