# TraceBuddy 日志系统

TraceBuddy 是一个基于 Go 语言开发的全面日志记录系统，支持 HTTP 请求/响应拦截、性能监控、分布式追踪以及日志的持久化存储和查询。

## 功能特性

- **全量日志记录**：自动捕获 HTTP 请求和响应的详细信息（Header、Body、Status 等）。
- **分布式追踪**：生成并传播 `X-Trace-Id`，支持跨服务链路追踪。
- **异步写入**：使用 Goroutine 和 Channel 实现异步日志写入，不阻塞主业务。
- **高性能存储**：集成 Elasticsearch 进行日志存储和检索。
- **敏感数据脱敏**：自动隐藏密码、Token 等敏感信息。
- **API 查询**：提供 RESTful API 用于日志查询和分析。

## 依赖说明

本项目依赖以下核心组件：

1.  **Elasticsearch (v8.x)**: 用于日志的主要存储和全文检索。
2.  **Redis (v7.x)**: (可选) 用于缓存热点日志数据。
3.  **Docker & Docker Compose**: 用于快速部署依赖环境。

## 快速开始

### 1. 环境准备

确保本地已安装 Docker 和 Docker Compose。

### 2. 启动依赖服务

在项目根目录下运行以下命令，启动 Elasticsearch 和 Redis：

```bash
docker-compose up -d
```

该命令会启动：
- Elasticsearch (端口 9200)
- Kibana (端口 5601)
- Redis (端口 6379)

### 3. 运行项目

#### 方式一：直接运行源码

确保已安装 Go 1.18+ 环境。

```bash
# 下载依赖
go mod tidy

# 运行服务
go run cmd/server/main.go
```

#### 方式二：编译运行

```bash
# 编译二进制文件
go build -o tracebuddy cmd/server/main.go

# 运行二进制文件
./tracebuddy
```

### 4. 验证服务

服务启动后，默认监听 8080 端口。

- **健康检查**:
  ```bash
  curl http://localhost:8080/health
  ```

- **搜索日志**:
  ```bash
  curl -X POST http://localhost:8080/api/logs/search \
    -H "Content-Type: application/json" \
    -d '{"size": 10}'
  ```

## 配置说明

可以通过环境变量配置服务：

| 变量名 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `SERVER_PORT` | `8080` | 服务监听端口 |
| `ELASTIC_URL` | `http://localhost:9200` | Elasticsearch 地址 |
| `REDIS_ADDR` | `localhost:6379` | Redis 地址 |
| `ENVIRONMENT` | `development` | 运行环境 (development/production) |

## 目录结构

```
TraceBuddy/
├── cmd/
│   └── server/          # 程序入口
├── config/              # 配置加载
├── internal/
│   ├── core/
│   │   ├── domain/      # 领域实体
│   │   └── ports/       # 接口定义
│   ├── adapters/
│   │   ├── http/        # HTTP 处理器和中间件
│   │   ├── storage/     # ES 和 Redis 实现
│   │   └── logger/      # 异步日志记录器
│   └── utils/           # 工具函数
├── go.mod
└── docker-compose.yml   # 基础设施编排
```
