#!/bin/bash

# API Key 管理功能测试脚本

BASE_URL="http://localhost:8080"

echo "1. Registering new client..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"client_name": "test-client"}')

echo "Response: $RESPONSE"

API_KEY=$(echo $RESPONSE | grep -o '"api_key":"[^"]*' | cut -d'"' -f4)

if [ -z "$API_KEY" ]; then
  echo "Failed to get API Key"
  exit 1
fi

echo "Got API Key: $API_KEY"

echo "2. Testing access with new API Key..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/logs/search" \
  -H "X-API-Key: $API_KEY")

if [ "$HTTP_CODE" == "200" ]; then
  echo "Success! Access granted with new key."
else
  echo "Failed! HTTP Code: $HTTP_CODE"
fi

echo "3. Testing access with invalid API Key..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/logs/search" \
  -H "X-API-Key: invalid-key")

if [ "$HTTP_CODE" == "401" ]; then
  echo "Success! Access denied with invalid key."
else
  echo "Failed! Expected 401, got $HTTP_CODE"
fi
