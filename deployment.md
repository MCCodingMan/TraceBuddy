# TraceBuddy Deployment Guide

## Prerequisites
- Docker & Docker Compose
- Go 1.18+ (for building from source)

## Quick Start (Docker)
1. Clone the repository.
2. Run `docker-compose up -d` to start Elasticsearch, Redis, and Kibana.
3. Build and run the application:
   ```bash
   go build -o tracebuddy cmd/server/main.go
   ./tracebuddy
   ```

## Configuration
Environment variables can be set in `.env` or passed directly:
- `SERVER_PORT`: Port to listen on (default: 8080)
- `ELASTIC_URL`: Elasticsearch URL (default: http://localhost:9200)
- `REDIS_ADDR`: Redis Address (default: localhost:6379)

## Production Deployment
For production, it is recommended to:
1. Use a managed Elasticsearch service or a dedicated cluster.
2. Enable Redis persistence.
3. Run the application behind a load balancer (Nginx/HAProxy).
4. Use a process manager like systemd or Supervisord.

## Monitoring
- **Metrics**: The application exposes basic health metrics at `/health`.
- **Logs**: Application logs are written to stdout/stderr.
- **Tracing**: All requests have `X-Trace-Id` for distributed tracing.
