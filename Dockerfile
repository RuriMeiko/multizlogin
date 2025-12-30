FROM cangphamdocker/zalo-server:latest

# Set work directory
WORKDIR /app

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy application code
COPY . /app/

# Tạo các thư mục dữ liệu cần thiết
RUN mkdir -p /app/data/cookies

# Mở cổng 3000
EXPOSE 3000

# Khởi động server
CMD ["node", "src/server.js"]