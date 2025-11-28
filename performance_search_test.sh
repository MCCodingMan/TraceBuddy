#!/bin/bash

# 性能测试脚本 - 搜索接口

URL="http://localhost:8080/api/logs/search"
API_KEY="secret-api-key"

echo "Starting performance test for Search API..."

# 1. 简单分页查询
echo "1. Simple Pagination Query"
hey -n 1000 -c 50 -m POST -H "Content-Type: application/json" -H "X-API-Key: $API_KEY" -d '{"page": 1, "size": 20}' $URL

# 2. 关键字模糊搜索
echo "2. Keyword Fuzzy Search"
hey -n 1000 -c 50 -m POST -H "Content-Type: application/json" -H "X-API-Key: $API_KEY" -d '{"keyword": "error", "page": 1, "size": 20}' $URL

# 3. 组合条件查询
echo "3. Combined Query (Level + Time)"
hey -n 1000 -c 50 -m POST -H "Content-Type: application/json" -H "X-API-Key: $API_KEY" -d '{"level": "error", "start_time": "2023-10-27T00:00:00Z", "end_time": "2023-10-27T23:59:59Z"}' $URL

echo "Performance test completed."
