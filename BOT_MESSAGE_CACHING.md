# Tính năng Bot Message Caching

## Tổng quan

Hệ thống đã được tích hợp Redis để cache các tin nhắn được gửi từ bot và tự động đánh dấu chúng khi webhook nhận được từ Zalo.

## Cách hoạt động

1. **Khi gửi tin nhắn qua API:**
   - Mỗi tin nhắn gửi đi sẽ được cache trong Redis với `msgId` làm key
   - Mặc định tất cả tin nhắn đều có `bot = true`
   - Có thể override bằng cách truyền `bot: false` trong request body
   - Cache có TTL mặc định là 300 giây (5 phút)

2. **Khi nhận webhook từ Zalo:**
   - Hệ thống sẽ kiểm tra `msgId` trong cache Redis
   - Nếu tìm thấy (tức là tin nhắn do bot gửi), webhook sẽ thêm field `bot: true`
   - Webhook này sau đó được gửi tới n8n với thông tin đầy đủ

## Cấu hình Redis

Thêm biến môi trường trong file `.env`:

```env
REDIS_URL=redis://localhost:6379
```

Hoặc nếu sử dụng Redis với auth:

```env
REDIS_URL=redis://:password@localhost:6379
```

## API Usage

### 1. Gửi tin nhắn text (mặc định bot=true)

```bash
POST /api/zalo/sendMessage
Content-Type: application/json

{
  "message": "Hello from bot",
  "threadId": "123456789",
  "ownId": "987654321",
  "type": 0
}
```

### 2. Gửi tin nhắn với bot=false (không cache)

```bash
POST /api/zalo/sendMessage
Content-Type: application/json

{
  "message": "This is not from bot",
  "threadId": "123456789",
  "ownId": "987654321",
  "type": 0,
  "bot": false
}
```

### 3. Gửi hình ảnh (mặc định bot=true)

```bash
POST /api/zalo/sendImageToUser
Content-Type: application/json

{
  "imagePath": "https://example.com/image.png",
  "threadId": "123456789",
  "ownId": "987654321"
}
```

### 4. Gửi hình ảnh với bot=false

```bash
POST /api/zalo/sendImageToUser
Content-Type: application/json

{
  "imagePath": "https://example.com/image.png",
  "threadId": "123456789",
  "ownId": "987654321",
  "bot": false
}
```

## Webhook Response Format

Khi webhook được gửi tới n8n, nó sẽ có format:

```json
{
  "data": {
    "msgId": "123456789",
    "content": "Hello from bot",
    // ... các field khác từ Zalo
  },
  "_accountId": "987654321",
  "_messageType": "self",
  "_isGroup": false,
  "_chatType": "personal",
  "bot": true  // <-- Field mới được thêm vào
}
```

- `bot: true` - Tin nhắn được gửi từ API của hệ thống (bot message)
- `bot: false` hoặc không có field - Tin nhắn từ người dùng hoặc từ nguồn khác

## Các API được hỗ trợ

Tất cả các API gửi tin nhắn đều hỗ trợ tính năng này:

1. `POST /api/zalo/sendMessage` - Gửi tin nhắn text
2. `POST /api/zalo/sendImageToUser` - Gửi 1 ảnh cho user
3. `POST /api/zalo/sendImagesToUser` - Gửi nhiều ảnh cho user
4. `POST /api/zalo/sendImageToGroup` - Gửi 1 ảnh cho group
5. `POST /api/zalo/sendImagesToGroup` - Gửi nhiều ảnh cho group
6. `POST /api/zalo/sendImageToUserByAccount` - Gửi ảnh với account selection
7. `POST /api/zalo/sendImagesToUserByAccount` - Gửi nhiều ảnh với account selection
8. `POST /api/zalo/sendImageToGroupByAccount` - Gửi ảnh group với account selection
9. `POST /api/zalo/sendImagesToGroupByAccount` - Gửi nhiều ảnh group với account selection

## Cache Details

- **Key format:** `bot_message:{msgId}`
- **TTL:** 300 seconds (5 phút) - có thể thay đổi trong code
- **Data stored:**
  ```json
  {
    "ownId": "987654321",
    "threadId": "123456789",
    "message": "content hoặc type",
    "bot": true,
    "sentAt": 1234567890,
    "cachedAt": 1234567890
  }
  ```

## Lưu ý

1. Redis phải được cài đặt và chạy trước khi start server
2. Nếu Redis không khả dụng, API vẫn hoạt động bình thường nhưng không có caching
3. Cache sẽ tự động expire sau 5 phút để tránh tốn memory
4. Mỗi tin nhắn chỉ được cache một lần và sẽ bị xóa sau khi expire

## Troubleshooting

### Redis không connect được

```
[Redis] Connection error: ...
```

**Giải pháp:**
- Kiểm tra Redis đã chạy: `redis-cli ping` (phải trả về `PONG`)
- Kiểm tra `REDIS_URL` trong file `.env`
- Kiểm tra firewall/port 6379

### Webhook không có field bot

**Nguyên nhân có thể:**
- Tin nhắn đã expire khỏi cache (> 5 phút)
- Redis không hoạt động khi gửi tin nhắn
- `msgId` không khớp giữa lúc gửi và lúc nhận webhook

## Monitoring

Xem log để theo dõi hoạt động:

```
[Redis] Connected successfully
[Redis] Cached bot message: 123456789 (TTL: 300s)
[Webhook] Tin nhắn 123456789 được đánh dấu là bot message
[Webhook] Đang gửi dữ liệu đến webhook... (Personal, bot: true)
```
