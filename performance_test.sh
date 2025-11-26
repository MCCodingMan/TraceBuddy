#!/bin/bash

# Install hey if not present
if ! command -v hey &> /dev/null; then
    echo "hey is not installed. Installing..."
    go install github.com/rakyll/hey@latest
fi

echo "Starting Performance Test..."

# Test Health Endpoint
echo "Testing /health endpoint..."
hey -n 1000 -c 50 http://localhost:8080/health

# Test Log Search (Simulated)
# Note: This assumes some data exists.
echo "Testing /api/logs/search endpoint..."
hey -n 100 -c 10 -m POST -d '{"size": 10}' -H "Content-Type: application/json" http://localhost:8080/api/logs/search

echo "Performance Test Completed."
