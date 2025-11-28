#!/bin/bash

# JWT 认证功能测试脚本

BASE_URL="http://localhost:8080"

echo "=== JWT Token-Based Authentication Test ==="
echo ""

# 测试用户凭证 (需要预先在 Elasticsearch 中创建)
USERNAME="admin"
PASSWORD="admin123"

echo "1. Testing login..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}")

echo "Response: $RESPONSE"

TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get JWT token. Please ensure:"
  echo "1. Server is running"
  echo "2. User 'admin' exists in Elasticsearch 'users' index"
  echo "3. Password is 'admin123' (hashed with bcrypt)"
  exit 1
fi

echo "Got JWT Token: ${TOKEN:0:50}..."
echo ""

echo "2. Testing access with valid token..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/logs/search" \
  -H "Authorization: Bearer $TOKEN")

if [ "$HTTP_CODE" == "200" ]; then
  echo "✓ Success! Access granted with valid token."
else
  echo "✗ Failed! HTTP Code: $HTTP_CODE"
fi
echo ""

echo "3. Testing access without token..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/logs/search")

if [ "$HTTP_CODE" == "401" ]; then
  echo "✓ Success! Access denied without token."
else
  echo "✗ Failed! Expected 401, got $HTTP_CODE"
fi
echo ""

echo "4. Testing access with invalid token..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/logs/search" \
  -H "Authorization: Bearer invalid-token")

if [ "$HTTP_CODE" == "401" ]; then
  echo "✓ Success! Access denied with invalid token."
else
  echo "✗ Failed! Expected 401, got $HTTP_CODE"
fi
echo ""

echo "=== Test Complete ==="
