# API Key Loss Issue - Root Cause & Fix

## 🔴 Problem
API keys bị mất sau khi redeploy lên Dokploy.

## 🔍 Root Causes

### 1. Missing `apiKey` field in users.json (CRITICAL)
**Location:** `src/services/authService.js` line 73-75

**Before (BUG):**
```javascript
const users = [{
  username: 'admin',
  salt,
  hash,
  role: 'admin'
  // ❌ THIẾU: apiKey field
}];
```

**After (FIXED):**
```javascript
const users = [{
  username: 'admin',
  salt,
  hash,
  role: 'admin',
  apiKey: null  // ✅ Added
}];
```

**Impact:** Khi file users.json bị lỗi JSON và được recreate, API key sẽ bị mất vì thiếu field.

---

### 2. Immediate initialization (CRITICAL)
**Location:** `src/services/authService.js` line 88

**Before (BUG):**
```javascript
// Khởi tạo file người dùng
initUserFile();  // ❌ Gọi ngay khi module load
```

**After (FIXED):**
```javascript
// Lazy initialization
const ensureInit = () => {
  if (!isInitialized) {
    initUserFile();
    isInitialized = true;
  }
};

// ✅ Chỉ init khi thực sự cần
const getUsers = () => {
  ensureInit();  // Init on demand
  // ...
};
```

**Impact:** Init code chạy trước khi Docker volume mount xong → Overwrite file users.json cũ.

---

## ✅ Fixes Applied

### 1. Code Fixes
- ✅ Added `apiKey: null` when recreating users.json
- ✅ Lazy initialization - only init when needed
- ✅ Auto backup before recreating corrupted file
- ✅ Better error logging

### 2. Verification Tools
- ✅ `scripts/verify-users.sh` - Bash script to verify structure
- ✅ `scripts/migrate-users.js` - Node.js script to fix missing fields
- ✅ Auto-fix missing `apiKey` fields

### 3. Deployment Guides
- ✅ Updated DOKPLOY_DEPLOY_GUIDE.md with API key troubleshooting
- ✅ Prevention steps documented
- ✅ Recovery procedures added

---

## 🚀 How to Prevent

### Before Every Deploy:

```bash
# 1. Verify users.json
./scripts/verify-users.sh

# 2. Run migration if needed
node scripts/migrate-users.js

# 3. Backup
docker cp <container>:/app/data/cookies/users.json ./backup-users.json

# 4. Deploy
docker-compose up -d

# 5. Verify after deploy
docker exec <container> cat /app/data/cookies/users.json | grep apiKey
```

---

## 🔧 How to Fix (If Already Lost)

### Option 1: Restore from backup
```bash
# List backups (auto-created by new code)
docker exec <container> ls -la /app/data/cookies/*.backup*

# Restore
docker cp <container>:/app/data/cookies/users.json.backup-XXXXX ./users.json
docker cp ./users.json <container>:/app/data/cookies/users.json
docker restart <container>
```

### Option 2: Run migration script
```bash
docker cp scripts/migrate-users.js <container>:/app/
docker exec <container> node /app/migrate-users.js
```

### Option 3: Manual fix
```bash
# Download
docker cp <container>:/app/data/cookies/users.json ./users.json

# Edit - Add "apiKey": null to each user
# {
#   "username": "admin",
#   ...
#   "apiKey": null  <- Add this
# }

# Upload
docker cp ./users.json <container>:/app/data/cookies/users.json
docker restart <container>
```

---

## 📋 Checklist

### Before Deploy:
- [ ] Run `./scripts/verify-users.sh`
- [ ] Backup users.json
- [ ] Verify volume mount configuration
- [ ] Check .dockerignore excludes data/

### After Deploy:
- [ ] Verify health: `curl https://your-app.com/health`
- [ ] Check users.json exists and valid
- [ ] Test login with existing credentials
- [ ] Verify API key still works
- [ ] Check logs for init errors

---

## 📊 Testing

```bash
# Test before deploy
./scripts/verify-users.sh

# Should output:
✓ File tồn tại: ./data/cookies/users.json
✓ JSON hợp lệ
✓ Tất cả users đều có apiKey field

User: admin, Role: admin, API Key: SET
```

---

## 🎯 Summary

**2 Critical Bugs Fixed:**
1. ✅ Missing `apiKey` field when recreating users.json
2. ✅ Immediate initialization causing file overwrite

**Prevention:**
- Verify before deploy
- Use migration scripts
- Always backup

**Recovery:**
- Restore from auto-backup
- Run migration script
- Manual fix as last resort

---

## 📖 References

- [DOKPLOY_DEPLOY_GUIDE.md](DOKPLOY_DEPLOY_GUIDE.md) - Full deployment guide
- [scripts/verify-users.sh](scripts/verify-users.sh) - Verification script
- [scripts/migrate-users.js](scripts/migrate-users.js) - Migration script
- [src/services/authService.js](src/services/authService.js) - Fixed code
