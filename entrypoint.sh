#!/bin/sh
# ===========================================
# Entrypoint Script for Multizlogin
# ===========================================
# Script này chạy trước khi app start để đảm bảo
# các thư mục và file cần thiết đã tồn tại

set -e

DATA_DIR="/app/data"
COOKIES_DIR="$DATA_DIR/cookies"
PROXIES_FILE="$DATA_DIR/proxies.json"

echo "🚀 Khởi tạo môi trường..."

# Wait for Redis if REDIS_URL is set
if [ -n "$REDIS_URL" ]; then
    echo "⏳ Đang chờ Redis ready..."
    # Extract host and port from redis://host:port
    REDIS_HOST=$(echo $REDIS_URL | sed -e 's|redis://||' -e 's|:.*||')
    REDIS_PORT=$(echo $REDIS_URL | sed -e 's|.*:||')
    
    # Wait up to 30 seconds for Redis
    timeout=30
    counter=0
    until nc -z $REDIS_HOST $REDIS_PORT 2>/dev/null; do
        counter=$((counter + 1))
        if [ $counter -gt $timeout ]; then
            echo "⚠️  Redis không ready sau $timeout giây, tiếp tục khởi động..."
            break
        fi
        echo "⏳ Chờ Redis... ($counter/$timeout)"
        sleep 1
    done
    
    if [ $counter -le $timeout ]; then
        echo "✅ Redis đã sẵn sàng!"
    fi
fi

# Tạo thư mục data nếu chưa có
if [ ! -d "$DATA_DIR" ]; then
    echo "📁 Tạo thư mục: $DATA_DIR"
    mkdir -p "$DATA_DIR"
fi

# Tạo thư mục cookies nếu chưa có
if [ ! -d "$COOKIES_DIR" ]; then
    echo "📁 Tạo thư mục: $COOKIES_DIR"
    mkdir -p "$COOKIES_DIR"
fi

# Tạo file proxies.json nếu chưa có
if [ ! -f "$PROXIES_FILE" ]; then
    echo "📄 Tạo file: $PROXIES_FILE"
    echo "[]" > "$PROXIES_FILE"
fi

# Hiển thị thông tin data hiện có
echo "📊 Trạng thái data:"
echo "   - Thư mục data: $(ls -la $DATA_DIR 2>/dev/null | wc -l) items"
echo "   - Thư mục cookies: $(ls -la $COOKIES_DIR 2>/dev/null | wc -l) items"

# Liệt kê các account đã lưu (nếu có)
CRED_COUNT=$(ls -1 $COOKIES_DIR/cred_*.json 2>/dev/null | wc -l || echo "0")
echo "   - Số tài khoản đã lưu: $CRED_COUNT"

echo "✅ Khởi tạo hoàn tất! Đang chạy ứng dụng..."
echo ""

# Chạy command được truyền vào (npm start)
exec "$@"
