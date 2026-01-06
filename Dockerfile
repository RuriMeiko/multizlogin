# Sử dụng Node.js 20 (phiên bản ổn định) làm nền tảng
FROM node:20-slim

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy file package để cài đặt thư viện trước (tối ưu cache)
COPY package*.json ./

# Cài đặt các dependencies
# Dùng npm install để đảm bảo cài đủ cả devDependencies nếu cần build
RUN npm install

# Copy toàn bộ source code hiện tại vào container
COPY . .

# Tạo các thư mục dữ liệu cần thiết
RUN mkdir -p data/cookies data/zalo_data

# Đánh dấu thư mục data là volume để persist data
VOLUME ["/app/data"]

# Mở cổng 3000
EXPOSE 3000

# Khởi động server bằng npm start
CMD ["npm", "start"]
