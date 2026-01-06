# Sử dụng Node.js 20 (phiên bản ổn định) làm nền tảng
FROM node:20-slim

# Cài đặt curl cho health check
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy file package để cài đặt thư viện trước (tối ưu cache)
COPY package*.json ./

# Cài đặt các dependencies
RUN npm ci --only=production

# Copy toàn bộ source code hiện tại vào container
COPY . .

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Đánh dấu thư mục data là volume để persist data
VOLUME ["/app/data"]

# Mở cổng 3000
EXPOSE 3000

# Sử dụng entrypoint để khởi tạo thư mục trước khi chạy app
ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "start"]
