#!/bin/bash

# Script để verify và sửa users.json trước khi deploy
# Đảm bảo API keys không bị mất

set -e

USERS_FILE="${USERS_FILE:-./data/cookies/users.json}"

echo "=================================="
echo "Users.json Verification & Fix"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if file exists
if [ ! -f "$USERS_FILE" ]; then
    print_error "File không tồn tại: $USERS_FILE"
    echo ""
    echo "Tạo file mới với template..."
    
    mkdir -p "$(dirname "$USERS_FILE")"
    
    cat > "$USERS_FILE" << 'EOF'
[
  {
    "username": "admin",
    "salt": "CHANGE_THIS",
    "hash": "CHANGE_THIS",
    "role": "admin",
    "apiKey": null
  }
]
EOF
    
    print_warning "Đã tạo file template. Vui lòng cập nhật salt và hash!"
    exit 1
fi

print_success "File tồn tại: $USERS_FILE"

# Check if valid JSON
echo "Kiểm tra JSON validity..."
if ! jq empty "$USERS_FILE" 2>/dev/null; then
    print_error "File không phải JSON hợp lệ!"
    
    # Backup
    BACKUP_FILE="${USERS_FILE}.backup-$(date +%Y%m%d_%H%M%S)"
    cp "$USERS_FILE" "$BACKUP_FILE"
    print_warning "Đã backup file lỗi vào: $BACKUP_FILE"
    
    exit 1
fi

print_success "JSON hợp lệ"

# Check structure
echo "Kiểm tra cấu trúc users..."

USERS_COUNT=$(jq 'length' "$USERS_FILE")
echo "Số lượng users: $USERS_COUNT"

# Check each user
for i in $(seq 0 $((USERS_COUNT - 1))); do
    USERNAME=$(jq -r ".[$i].username" "$USERS_FILE")
    HAS_API_KEY=$(jq ".[$i] | has(\"apiKey\")" "$USERS_FILE")
    API_KEY=$(jq -r ".[$i].apiKey" "$USERS_FILE")
    
    echo ""
    echo "User $((i + 1)): $USERNAME"
    
    # Check required fields
    for field in username salt hash role; do
        if ! jq -e ".[$i].$field" "$USERS_FILE" > /dev/null 2>&1; then
            print_error "  Missing field: $field"
        else
            print_success "  Has field: $field"
        fi
    done
    
    # Check apiKey field
    if [ "$HAS_API_KEY" = "false" ]; then
        print_error "  Missing apiKey field!"
        echo "  Fixing..."
        
        # Add apiKey field
        jq ".[$i].apiKey = null" "$USERS_FILE" > "${USERS_FILE}.tmp"
        mv "${USERS_FILE}.tmp" "$USERS_FILE"
        
        print_success "  Added apiKey: null"
    else
        if [ "$API_KEY" = "null" ]; then
            print_warning "  apiKey: null (chưa generate)"
        else
            print_success "  apiKey: ${API_KEY:0:8}... (đã có)"
        fi
    fi
done

echo ""
echo "=================================="
echo "Final Check"
echo "=================================="

# Verify all users have apiKey field
MISSING_API_KEY=$(jq '[.[] | select(has("apiKey") | not)] | length' "$USERS_FILE")

if [ "$MISSING_API_KEY" -gt 0 ]; then
    print_error "$MISSING_API_KEY users thiếu apiKey field"
    exit 1
else
    print_success "Tất cả users đều có apiKey field"
fi

# Verify JSON is still valid after fixes
if ! jq empty "$USERS_FILE" 2>/dev/null; then
    print_error "File bị lỗi sau khi fix!"
    exit 1
fi

echo ""
print_success "Verification hoàn tất! File users.json OK"
echo ""

# Show summary
echo "=================================="
echo "Summary"
echo "=================================="
jq -r '.[] | "User: \(.username), Role: \(.role), API Key: \(if .apiKey then "SET" else "NOT SET" end)"' "$USERS_FILE"
echo ""
