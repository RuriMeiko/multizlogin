#!/bin/bash

# Quick Setup Script for Dokploy Deployment
# This script helps you prepare for deploying to Dokploy

set -e

echo "========================================"
echo "MultiZlogin - Dokploy Deployment Setup"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo "ℹ $1"
}

# Check if .dockerignore exists and has data/ excluded
echo "Kiểm tra .dockerignore..."
if [ -f ".dockerignore" ]; then
    if grep -q "^data/$" .dockerignore; then
        print_success ".dockerignore đã cấu hình đúng (data/ excluded)"
    else
        print_warning ".dockerignore tồn tại nhưng chưa exclude data/"
        echo "data/" >> .dockerignore
        print_success "Đã thêm data/ vào .dockerignore"
    fi
else
    print_error ".dockerignore không tồn tại"
    exit 1
fi

# Check Dockerfile for VOLUME instruction
echo "Kiểm tra Dockerfile..."
if grep -q "VOLUME" Dockerfile; then
    print_success "Dockerfile đã có VOLUME instruction"
else
    print_warning "Dockerfile chưa có VOLUME instruction"
fi

# Check if dokploy-compose.yaml exists
echo "Kiểm tra dokploy-compose.yaml..."
if [ -f "dokploy-compose.yaml" ]; then
    print_success "dokploy-compose.yaml đã tồn tại"
else
    print_error "dokploy-compose.yaml không tồn tại"
    exit 1
fi

echo ""
echo "========================================"
echo "Cấu hình Environment Variables"
echo "========================================"
echo ""

# Check .env.example
if [ -f ".env.example" ]; then
    print_info "Các biến môi trường cần thiết (từ .env.example):"
    echo ""
    cat .env.example | grep -v "^#" | grep -v "^$"
    echo ""
else
    print_warning ".env.example không tồn tại"
fi

echo ""
echo "========================================"
echo "Hướng dẫn Deploy lên Dokploy"
echo "========================================"
echo ""

print_info "Bước 1: Build Docker Image"
echo "  docker build -t your-registry/multizlogin:latest ."
echo ""

print_info "Bước 2: Push lên Registry"
echo "  docker push your-registry/multizlogin:latest"
echo ""

print_info "Bước 3: Tạo Volume trên Dokploy"
echo "  - Vào Dokploy Dashboard → Volumes"
echo "  - Click 'Add Volume'"
echo "  - Name: multizlogin-data"
echo "  - Mount Path: /app/data"
echo ""

print_info "Bước 4: Cấu hình Environment Variables trên Dokploy"
echo "  Các biến bắt buộc:"
echo "  - MESSAGE_WEBHOOK_URL"
echo "  - SESSION_SECRET"
echo ""

print_info "Bước 5: Deploy"
echo "  - Upload dokploy-compose.yaml"
echo "  - Hoặc sử dụng Git integration"
echo "  - Click Deploy"
echo ""

print_info "Bước 6: Verify"
echo "  curl https://your-app.dokploy.com/health"
echo ""

echo "========================================"
echo "Checklist"
echo "========================================"
echo ""
echo "□ .dockerignore có exclude data/"
echo "□ Dockerfile có VOLUME instruction"
echo "□ dokploy-compose.yaml đã được tạo"
echo "□ Docker image đã được build"
echo "□ Image đã được push lên registry"
echo "□ Volume đã được tạo trên Dokploy"
echo "□ Environment variables đã được config"
echo "□ Deploy thành công"
echo "□ Health check OK"
echo "□ Test redeploy để verify data persist"
echo ""

echo "========================================"
echo "Chi tiết hướng dẫn"
echo "========================================"
echo ""
print_info "Xem file DOKPLOY_DEPLOY_GUIDE.md để biết chi tiết"
echo ""

# Optional: Create a backup of current data
read -p "Bạn có muốn backup dữ liệu hiện tại không? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "data" ]; then
        cp -r data "$BACKUP_DIR/"
        print_success "Đã backup data/ vào $BACKUP_DIR/"
    fi
    
    if [ -f ".env" ]; then
        cp .env "$BACKUP_DIR/"
        print_success "Đã backup .env vào $BACKUP_DIR/"
    fi
    
    print_success "Backup hoàn tất: $BACKUP_DIR/"
fi

echo ""
print_success "Setup hoàn tất! Sẵn sàng deploy lên Dokploy."
echo ""
