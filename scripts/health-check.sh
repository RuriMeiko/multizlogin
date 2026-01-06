#!/bin/bash

# System Health Check Script
# Kiểm tra health của multizlogin system

set -e

HEALTH_URL="${HEALTH_URL:-http://localhost:3000/health}"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"  # seconds
LOG_FILE="${LOG_FILE:-./health_check.log}"

echo "==================================="
echo "MultiZlogin Health Check"
echo "==================================="
echo "Health URL: $HEALTH_URL"
echo "Check Interval: ${CHECK_INTERVAL}s"
echo "Log File: $LOG_FILE"
echo ""

# Function to check health
check_health() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Make HTTP request to health endpoint
    response=$(curl -s -w "\n%{http_code}" "$HEALTH_URL" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        # Parse JSON response
        status=$(echo "$body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        total=$(echo "$body" | grep -o '"total":[0-9]*' | cut -d':' -f2)
        online=$(echo "$body" | grep -o '"online":[0-9]*' | cut -d':' -f2)
        uptime=$(echo "$body" | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
        
        # Convert uptime to readable format
        uptime_hours=$(echo "scale=2; $uptime / 3600" | bc)
        
        echo "[$timestamp] ✓ HEALTHY - Accounts: $online/$total online, Uptime: ${uptime_hours}h"
        echo "[$timestamp] OK - Status: $status, Online: $online/$total, Uptime: ${uptime_hours}h" >> "$LOG_FILE"
        return 0
    else
        echo "[$timestamp] ✗ UNHEALTHY - HTTP $http_code"
        echo "[$timestamp] ERROR - HTTP $http_code - $body" >> "$LOG_FILE"
        return 1
    fi
}

# Function to check Docker container status
check_docker() {
    if command -v docker &> /dev/null; then
        container_status=$(docker ps --filter "name=zalo-server" --format "{{.Status}}" 2>/dev/null || echo "Not running")
        echo "Docker Container: $container_status"
    fi
}

# Main monitoring loop
if [ "$1" = "monitor" ]; then
    echo "Starting continuous monitoring (Ctrl+C to stop)..."
    echo ""
    
    while true; do
        check_health
        check_docker
        echo ""
        sleep "$CHECK_INTERVAL"
    done
elif [ "$1" = "once" ]; then
    check_health
    check_docker
    exit $?
else
    echo "Usage:"
    echo "  $0 once      - Run health check once"
    echo "  $0 monitor   - Run continuous monitoring"
    echo ""
    echo "Environment variables:"
    echo "  HEALTH_URL      - Health endpoint URL (default: http://localhost:3000/health)"
    echo "  CHECK_INTERVAL  - Check interval in seconds (default: 60)"
    echo "  LOG_FILE        - Log file path (default: ./health_check.log)"
    exit 1
fi
